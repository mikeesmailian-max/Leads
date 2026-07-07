import fs from "node:fs/promises";

export interface OcrResult {
  text: string;
  confidence: number; // 0..1, coarse — real OCR vendors return per-word confidence
  engine: "pdf-text" | "textract" | "none";
}

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".heic", ".webp", ".tiff"];

function isImage(filePath: string, mimeType: string | null): boolean {
  if (mimeType?.startsWith("image/")) return true;
  const lower = filePath.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Pluggable OCR/text-extraction entry point.
 *
 * Default behavior (OCR_PROVIDER unset):
 *  - PDFs: extract embedded text layer via `pdf-parse`. Works well for
 *    "born-digital" rate confirmations (the vast majority of broker/TMS
 *    generated PDFs). Confidence is set to 1.0 when a text layer exists.
 *  - Images (scanned docs / photos of paperwork): no text layer to read, so
 *    we return an empty result and the document is flagged `NEEDS_REVIEW`
 *    for manual entry.
 *
 * With OCR_PROVIDER="aws-textract" (see src/lib/ocr/providers/textract.ts):
 *  - Images always route through Textract.
 *  - PDFs try the fast local text-layer extraction first (free, instant);
 *    only PDFs with no usable text layer fall through to Textract. This
 *    keeps the common case (digital rate cons) free and fast while still
 *    covering scanned/photographed paperwork.
 *
 * To add a different vendor (Google Document AI, Azure Form Recognizer,
 * an LLM vision API), add a sibling file under providers/ that returns the
 * same `OcrResult` shape and branch on OCR_PROVIDER below — nothing
 * downstream (parser, review UI) needs to change.
 */
export async function extractText(filePath: string, mimeType: string | null): Promise<OcrResult> {
  const provider = process.env.OCR_PROVIDER; // "aws-textract" | undefined

  if (mimeType === "application/pdf" || filePath.toLowerCase().endsWith(".pdf")) {
    try {
      const buffer = await fs.readFile(filePath);
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(buffer);
      const text = (data.text ?? "").trim();
      if (text.length > 20) {
        return { text, confidence: 1, engine: "pdf-text" };
      }
      // No usable text layer — this is likely a scanned/flattened PDF.
      if (provider === "aws-textract") {
        const { extractWithTextract } = await import("./providers/textract");
        return await extractWithTextract(filePath);
      }
      return { text, confidence: 0.2, engine: "pdf-text" };
    } catch (err) {
      console.error("PDF text extraction failed:", err);
      return { text: "", confidence: 0, engine: "none" };
    }
  }

  if (isImage(filePath, mimeType)) {
    if (provider === "aws-textract") {
      const { extractWithTextract } = await import("./providers/textract");
      return await extractWithTextract(filePath);
    }
    // No OCR vendor configured — flagged for manual review downstream.
    return { text: "", confidence: 0, engine: "none" };
  }

  return { text: "", confidence: 0, engine: "none" };
}
