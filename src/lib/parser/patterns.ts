/**
 * Pattern library for the heuristic (non-OCR-vendor) rate confirmation parser.
 *
 * DESIGN NOTE — Pluggable OCR:
 * This module only deals with *text* that has already been extracted from a
 * document (see `../ocr/extractText.ts`). Swapping in a real OCR/vendor
 * parser (Google Vision, AWS Textract, Azure Form Recognizer) later only
 * requires replacing the text-extraction step — everything downstream
 * (field extraction, scoring, review UI) stays the same.
 */

export const US_STATE_ABBR = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

export const EQUIPMENT_KEYWORDS: { pattern: RegExp; type: "DRY_VAN" | "REEFER" | "FLATBED" | "OTHER" }[] = [
  { pattern: /\b(reefer|refrigerated|temp[\s-]?controlled)\b/i, type: "REEFER" },
  { pattern: /\b(dry\s?van|van\b|53'?\s?van)\b/i, type: "DRY_VAN" },
  { pattern: /\b(flat\s?bed|flatbed|step\s?deck|rgn|lowboy)\b/i, type: "FLATBED" },
];

export const LABEL_PATTERNS: Record<string, RegExp[]> = {
  broker: [/broker(?:\s*name)?\s*[:#-]/i, /^broker\b/im, /billed?\s*by\s*[:#-]/i],
  shipper: [/shipper(?:\s*name)?\s*[:#-]/i, /ship\s?per\s*[:#-]/i, /pick\s?up\s?(?:from|location|company)\s*[:#-]/i, /origin\s*company\s*[:#-]/i],
  consignee: [/consignee\s*[:#-]/i, /deliver\s?to\s*[:#-]/i, /receiver\s*[:#-]/i, /destination\s*company\s*[:#-]/i],
  pickupAddress: [/pick\s?up\s*address\s*[:#-]/i, /origin\s*address\s*[:#-]/i, /shipper\s*address\s*[:#-]/i],
  deliveryAddress: [/deliver\w*\s*address\s*[:#-]/i, /destination\s*address\s*[:#-]/i, /consignee\s*address\s*[:#-]/i],
  pickupDate: [/pick\s?up\s*date\s*[:#-]/i, /pu\s*date\s*[:#-]/i, /ship\s*date\s*[:#-]/i, /origin\s*date\s*[:#-]/i],
  deliveryDate: [/deliver\w*\s*date\s*[:#-]/i, /del\s*date\s*[:#-]/i, /destination\s*date\s*[:#-]/i],
  commodity: [/commodity\s*[:#-]/i, /product\s*[:#-]/i, /description\s*of\s*(?:goods|freight)\s*[:#-]/i],
  equipment: [/equipment(?:\s*type)?\s*[:#-]/i, /trailer\s*type\s*[:#-]/i, /truck\s*type\s*[:#-]/i],
  linehaul: [/(?:total\s*)?rate\s*[:#-]/i, /line\s?haul\s*[:#-]/i, /carrier\s*(?:pay|rate)\s*[:#-]/i, /amount\s*[:#-]/i],
  referenceNumber: [/ref(?:erence)?\s*(?:number|#|no)?\s*[:#-]/i, /confirmation\s*(?:number|#)?\s*[:#-]/i],
  loadNumber: [/load\s*(?:number|#|no)?\s*[:#-]/i, /order\s*(?:number|#)?\s*[:#-]/i, /pro\s*(?:number|#)?\s*[:#-]/i],
  mcNumber: [/mc\s*#?\s*[:#-]?\s*/i],
  dotNumber: [/(?:u\.?s\.?\s*)?dot\s*#?\s*[:#-]?\s*/i],
};

export const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
export const PHONE_REGEX = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
export const MC_NUMBER_REGEX = /MC\s*#?\s*(\d{5,8})/i;
export const DOT_NUMBER_REGEX = /(?:U\.?S\.?\s*)?DOT\s*#?\s*(\d{5,8})/i;
export const MONEY_REGEX = /\$\s?([\d,]+(?:\.\d{2})?)/;
export const ZIP_REGEX = /\b\d{5}(?:-\d{4})?\b/;
export const DATE_REGEX =
  /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b|\b(\d{4})-(\d{2})-(\d{2})\b|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})\b/i;
export const TIME_REGEX = /\b(\d{1,2}:\d{2}\s?(?:AM|PM|am|pm)?)\b/;

// "Springfield, IL 62704" or "Springfield, IL"
export const CITY_STATE_ZIP_REGEX = new RegExp(
  `([A-Za-z][A-Za-z .'-]*?),?\\s*(${US_STATE_ABBR.join("|")})\\b\\s*(\\d{5})?`,
);

/** Suggested freight-relevant logistics job titles, ranked roughly by relevance. */
export const SUGGESTED_LOGISTICS_TITLES = [
  "Transportation Manager",
  "Shipping Manager",
  "Traffic Manager",
  "Logistics Manager",
  "Warehouse Manager",
  "Operations Manager",
  "Procurement Manager",
  "Supply Chain Manager",
  "Plant Manager",
  "Distribution Manager",
  "Fleet Manager",
  "Director of Logistics",
  "VP of Supply Chain",
  "Import/Export Coordinator",
];

export function detectEquipmentType(text: string): "DRY_VAN" | "REEFER" | "FLATBED" | "OTHER" | null {
  for (const { pattern, type } of EQUIPMENT_KEYWORDS) {
    if (pattern.test(text)) return type;
  }
  return null;
}
