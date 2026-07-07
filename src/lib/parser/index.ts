import { prisma } from "@/lib/db";
import { extractText } from "@/lib/ocr/extractText";
import { parseRateConfirmationText } from "./rateConfirmationParser";
import { logActivity } from "@/lib/activity/log";
import { onDocumentNeedsReview } from "@/lib/tasks/autoTasks";

/**
 * Runs the full intake pipeline for a newly uploaded document:
 * text extraction → heuristic field parsing → persisted DocumentParse draft.
 * Does NOT create Accounts/Contacts/Lanes yet — that only happens once a
 * human approves the parse (see intelligence/approveDocument.ts). This keeps
 * unreviewed OCR guesses out of the CRM data model.
 */
export async function processDocument(documentId: string) {
  const document = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });

  await prisma.document.update({ where: { id: documentId }, data: { status: "PROCESSING" } });

  try {
    const ocr = await extractText(document.storedPath, document.mimeType);

    if (!ocr.text || ocr.text.trim().length < 10) {
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: "NEEDS_REVIEW",
          needsReview: true,
          ocrText: ocr.text,
          ocrConfidence: ocr.confidence,
          errorMessage: "No extractable text found — likely a scanned image. Enter fields manually below.",
        },
      });
      await prisma.documentParse.upsert({
        where: { documentId },
        create: { documentId, confidenceScore: 0 },
        update: { confidenceScore: 0 },
      });
      await onDocumentNeedsReview(documentId, null);
      return;
    }

    const result = parseRateConfirmationText(ocr.text);
    const f = result.fields;

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: result.needsReview ? "NEEDS_REVIEW" : "PARSED",
        needsReview: result.needsReview,
        ocrText: ocr.text,
        ocrConfidence: ocr.confidence,
      },
    });

    await prisma.documentParse.upsert({
      where: { documentId },
      create: {
        documentId,
        brokerName: f.broker.value,
        shipperName: f.shipper.value,
        consigneeName: f.consignee.value,
        pickupAddress: f.pickupAddress.value,
        pickupCity: f.pickupCity.value,
        pickupState: f.pickupState.value,
        pickupZip: f.pickupZip.value,
        pickupDate: f.pickupDate.value ? new Date(f.pickupDate.value) : null,
        pickupTime: f.pickupTime.value,
        deliveryAddress: f.deliveryAddress.value,
        deliveryCity: f.deliveryCity.value,
        deliveryState: f.deliveryState.value,
        deliveryZip: f.deliveryZip.value,
        deliveryDate: f.deliveryDate.value ? new Date(f.deliveryDate.value) : null,
        deliveryTime: f.deliveryTime.value,
        commodity: f.commodity.value,
        equipmentType: f.equipmentType.value as any,
        linehaulAmount: f.linehaulAmount.value,
        referenceNumber: f.referenceNumber.value,
        loadNumber: f.loadNumber.value,
        mcNumber: f.mcNumber.value,
        dotNumber: f.dotNumber.value,
        extractedContacts: f.contacts as any,
        extractedPhones: f.phones as any,
        extractedEmails: f.emails as any,
        confidenceScore: result.overallConfidence,
        fieldConfidence: Object.fromEntries(Object.entries(f).map(([k, v]: [string, any]) => [k, v?.confidence])) as any,
      },
      update: {
        brokerName: f.broker.value,
        shipperName: f.shipper.value,
        consigneeName: f.consignee.value,
        pickupAddress: f.pickupAddress.value,
        pickupCity: f.pickupCity.value,
        pickupState: f.pickupState.value,
        pickupZip: f.pickupZip.value,
        pickupDate: f.pickupDate.value ? new Date(f.pickupDate.value) : null,
        pickupTime: f.pickupTime.value,
        deliveryAddress: f.deliveryAddress.value,
        deliveryCity: f.deliveryCity.value,
        deliveryState: f.deliveryState.value,
        deliveryZip: f.deliveryZip.value,
        deliveryDate: f.deliveryDate.value ? new Date(f.deliveryDate.value) : null,
        deliveryTime: f.deliveryTime.value,
        commodity: f.commodity.value,
        equipmentType: f.equipmentType.value as any,
        linehaulAmount: f.linehaulAmount.value,
        referenceNumber: f.referenceNumber.value,
        loadNumber: f.loadNumber.value,
        mcNumber: f.mcNumber.value,
        dotNumber: f.dotNumber.value,
        extractedContacts: f.contacts as any,
        extractedPhones: f.phones as any,
        extractedEmails: f.emails as any,
        confidenceScore: result.overallConfidence,
      },
    });

    await logActivity({
      type: "UPLOAD_PARSED",
      summary: `Parsed document (${Math.round(result.overallConfidence * 100)}% confidence)`,
      documentId,
    });

    if (result.needsReview) {
      await onDocumentNeedsReview(documentId, f.shipper.value);
    }
  } catch (err: any) {
    console.error("processDocument failed:", err);
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "ERROR", errorMessage: String(err?.message ?? err), needsReview: true },
    });
  }
}
