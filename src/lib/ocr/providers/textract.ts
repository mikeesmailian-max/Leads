import fs from "node:fs/promises";
import type { OcrResult } from "../extractText";

/**
 * Real OCR via AWS Textract. Handles both scanned/photographed images and
 * PDFs without a usable text layer.
 *
 * Requires (in .env): AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.
 * Uses `DetectDocumentText` (fast, cheap, layout-agnostic) rather than
 * `AnalyzeDocument`'s form/table extraction — the existing heuristic label
 * parser (`rateConfirmationParser.ts`) already knows how to pull structured
 * fields out of raw text, so we only need Textract to turn pixels into text.
 */
export async function extractWithTextract(filePath: string): Promise<OcrResult> {
  const region = process.env.AWS_REGION;
  if (!region || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.warn("Textract requested but AWS credentials are not configured — skipping.");
    return { text: "", confidence: 0, engine: "none" };
  }

  const { TextractClient, DetectDocumentTextCommand } = await import("@aws-sdk/client-textract");
  const client = new TextractClient({ region });

  const bytes = await fs.readFile(filePath);
  // Textract's synchronous DetectDocumentText supports single-page PDFs,
  // PNG, and JPEG documents up to 10MB directly in the request payload.
  const command = new DetectDocumentTextCommand({ Document: { Bytes: bytes } });

  try {
    const result = await client.send(command);
    const blocks = result.Blocks ?? [];
    const lines = blocks.filter((b) => b.BlockType === "LINE");
    const text = lines.map((b) => b.Text ?? "").join("\n");
    const confidences = lines.map((b) => (b.Confidence ?? 0) / 100).filter((c) => c > 0);
    const avgConfidence = confidences.length ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;
    return { text, confidence: avgConfidence, engine: "textract" };
  } catch (err) {
    console.error("Textract extraction failed:", err);
    return { text: "", confidence: 0, engine: "none" };
  }
}
