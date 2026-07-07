"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { processDocument } from "@/lib/parser";
import { approveParsedDocument } from "@/lib/intelligence/approveDocument";
import { revalidatePath } from "next/cache";

export interface ParsedFieldsUpdate {
  brokerName?: string | null;
  shipperName?: string | null;
  consigneeName?: string | null;
  pickupAddress?: string | null;
  pickupCity?: string | null;
  pickupState?: string | null;
  pickupZip?: string | null;
  pickupDate?: string | null;
  pickupTime?: string | null;
  deliveryAddress?: string | null;
  deliveryCity?: string | null;
  deliveryState?: string | null;
  deliveryZip?: string | null;
  deliveryDate?: string | null;
  deliveryTime?: string | null;
  commodity?: string | null;
  equipmentType?: "DRY_VAN" | "REEFER" | "FLATBED" | "OTHER" | null;
  linehaulAmount?: number | null;
  referenceNumber?: string | null;
  loadNumber?: string | null;
  mcNumber?: string | null;
  dotNumber?: string | null;
}

export async function updateParsedFields(documentId: string, data: ParsedFieldsUpdate) {
  await requireUser();
  await prisma.documentParse.update({
    where: { documentId },
    data: {
      ...data,
      pickupDate: data.pickupDate ? new Date(data.pickupDate) : data.pickupDate === null ? null : undefined,
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : data.deliveryDate === null ? null : undefined,
    },
  });
  revalidatePath(`/uploads/${documentId}`);
}

export async function approveDocumentAction(documentId: string) {
  const user = await requireUser();
  const result = await approveParsedDocument(documentId, user.id);
  revalidatePath(`/uploads/${documentId}`);
  revalidatePath("/uploads");
  revalidatePath("/accounts");
  revalidatePath("/contacts");
  revalidatePath("/lanes");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  return result;
}

export async function reparseDocumentAction(documentId: string) {
  await requireUser();
  await processDocument(documentId);
  revalidatePath(`/uploads/${documentId}`);
}

export async function deleteDocumentAction(documentId: string) {
  await requireUser();
  await prisma.document.update({ where: { id: documentId }, data: { deletedAt: new Date() } });
  revalidatePath("/uploads");
}
