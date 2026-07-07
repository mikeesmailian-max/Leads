import fs from "node:fs/promises";

export interface OcrResult {
  text: string;
  confidence: number; // 0..1, coarse — real OCR vendors return per-word confidence
  engine: "pdf-text" | "none";
}

/**
 * Pluggable OCR/text-extraction entry point.
 *
 * v1 behavior (no external OCR vendor configured):
 *  - PDFs: extract embedded text layer via `pdf-parse`. Works well for
 *    "born-digital" rate confirmations (the vast majority of broker/TMS
 *    generated PDFs). Confidence is set to 1.0 when a text layer exists.
 *  - Images (scanned docs / photos of paperwork): no text layer to read, so
 *    we return an empty result and the document is flagged `NEEDS_REVIEW`
 *    for manual entry.
 *
 * PHASE 2 PLUG-IN POINT:
 *   Set OCR_PROVIDER + OCR_API_KEY in .env and replace the `if (mimeType ===
 *   "application/pdf")` branch (and add an image branch) with a call to your
 *   vendor of choice — Google Cloud Vision, AWS Textract, Azure Form
 *   Recognizer, or an LLM vision API. Keep the return shape (`OcrResult`)
 *   the same and nothing downstream (parser, review UI) needs to change.
 */
export async function extractText(filePath: string, mimeType: string | null): Promise<OcrResult> {
  if (mimeType === "application/pdf" || filePath.toLowerCase().endsWith(".pdf")) {
    try {
      const buffer = await fs.readFile(filePath);
      // Lazy import: pdf-parse touches the filesystem on import in some
      // versions when run outside its own package directory.
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(buffer);
      const text = (data.text ?? "").trim();
      return {
        text,
        confidence: text.length > 20 ? 1 : 0.2,
        engine: "pdf-text",
      };
    } catch (err) {
      console.error("PDF text extraction failed:", err);
      return { text: "", confidence: 0, engine: "none" };
    }
  }

  // Image formats (png/jpg/heic/etc.) — no OCR vendor wired up in v1.
  return { text: "", confidence: 0, engine: "none" };
}
