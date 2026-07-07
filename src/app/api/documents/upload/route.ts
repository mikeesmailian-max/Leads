import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import fs from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { processDocument } from "@/lib/parser";

const ALLOWED_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/heic"]);
const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

function guessDocumentType(filename: string): "RATE_CONFIRMATION" | "BOL" | "INVOICE" | "OTHER" {
  const lower = filename.toLowerCase();
  if (lower.includes("bol") || lower.includes("bill of lading")) return "BOL";
  if (lower.includes("invoice")) return "INVOICE";
  return "RATE_CONFIRMATION";
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File too large (25MB max)" }, { status: 400 });
  }
  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED_TYPES.has(mimeType) && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  const uploadsDir = path.resolve(process.env.UPLOADS_DIR || "./uploads");
  await fs.mkdir(uploadsDir, { recursive: true });

  const ext = path.extname(file.name) || "";
  const storedFilename = `${nanoid()}${ext}`;
  const storedPath = path.join(uploadsDir, storedFilename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(storedPath, buffer);

  const document = await prisma.document.create({
    data: {
      originalFilename: file.name,
      storedPath,
      mimeType,
      fileSizeBytes: file.size,
      documentType: guessDocumentType(file.name),
      status: "UPLOADED",
      uploadedById: session.user.id,
      needsReview: true,
    },
  });

  // Fire and forget — UI polls/refreshes for status. Errors are captured on
  // the Document record itself (status=ERROR) rather than failing the request.
  processDocument(document.id).catch((err) => console.error("processDocument error:", err));

  return NextResponse.json({ id: document.id, status: document.status });
}
