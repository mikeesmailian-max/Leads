import {
  LABEL_PATTERNS,
  EMAIL_REGEX,
  PHONE_REGEX,
  MC_NUMBER_REGEX,
  DOT_NUMBER_REGEX,
  MONEY_REGEX,
  ZIP_REGEX,
  DATE_REGEX,
  TIME_REGEX,
  CITY_STATE_ZIP_REGEX,
  detectEquipmentType,
} from "./patterns";
import type { FieldGuess, ParsedDocumentFields, ParsedDocumentResult, ExtractedContact } from "./types";

/** Fields whose presence/quality drive the overall confidence + review threshold. */
const CORE_FIELDS: (keyof ParsedDocumentFields)[] = [
  "shipper",
  "pickupCity",
  "deliveryCity",
  "equipmentType",
  "referenceNumber",
];

export const NEEDS_REVIEW_THRESHOLD = 0.65;

function guess<T>(value: T | null, confidence: number): FieldGuess<T> {
  return { value, confidence: value === null ? 0 : confidence };
}

function findLabelValue(lines: string[], patterns: RegExp[]): { raw: string; lineIdx: number } | null {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match && match.index !== undefined) {
        const after = line.slice(match.index + match[0].length).trim().replace(/^[:#-]+\s*/, "");
        if (after.length > 0) return { raw: after, lineIdx: i };
        // value might be on the next line
        const next = lines[i + 1]?.trim();
        if (next) return { raw: next, lineIdx: i + 1 };
      }
    }
  }
  return null;
}

function parseDateToISO(raw: string): string | null {
  const match = raw.match(DATE_REGEX);
  if (!match) return null;
  try {
    if (match[1] && match[2] && match[3]) {
      // M/D/YYYY or M-D-YYYY
      let year = parseInt(match[3], 10);
      if (year < 100) year += 2000;
      const month = parseInt(match[1], 10);
      const day = parseInt(match[2], 10);
      const d = new Date(Date.UTC(year, month - 1, day));
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
    if (match[4] && match[5] && match[6]) {
      // YYYY-MM-DD
      const d = new Date(Date.UTC(parseInt(match[4], 10), parseInt(match[5], 10) - 1, parseInt(match[6], 10)));
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
    if (match[7] && match[8] && match[9]) {
      // "Jan 5, 2026"
      const d = new Date(`${match[7]} ${match[8]}, ${match[9]}`);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
  } catch {
    return null;
  }
  return null;
}

function extractCityStateZip(raw: string): { city: string | null; state: string | null; zip: string | null } {
  const match = raw.match(CITY_STATE_ZIP_REGEX);
  if (!match) return { city: null, state: null, zip: null };
  return {
    city: match[1]?.trim().replace(/,$/, "") ?? null,
    state: match[2] ?? null,
    zip: match[3] ?? null,
  };
}

function extractContacts(text: string): ExtractedContact[] {
  const contacts: ExtractedContact[] = [];
  const lines = text.split("\n");
  const titleKeywords = /(manager|coordinator|dispatch|director|rep\b|representative|agent|specialist)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const email = line.match(EMAIL_REGEX)?.[0] ?? null;
    const phone = line.match(PHONE_REGEX)?.[0] ?? null;
    if (!email && !phone) continue;

    // Look at nearby lines for a plausible human name / title.
    const context = [lines[i - 1], line, lines[i + 1]].filter(Boolean).join(" ");
    const titleMatch = context.match(titleKeywords);
    const nameMatch = lines[i - 1]?.trim().match(/^[A-Z][a-zA-Z'.-]+\s+[A-Z][a-zA-Z'.-]+$/);

    contacts.push({
      name: nameMatch ? nameMatch[0] : null,
      title: titleMatch ? titleMatch[0] : null,
      phone,
      email,
    });
  }
  return contacts;
}

/**
 * Heuristic, dependency-free field extractor for freight rate confirmations.
 * Works on plain text already pulled out of a PDF/image (see ocr/extractText.ts).
 *
 * This is intentionally rule-based rather than ML-based so it runs with zero
 * external API keys. Swap in a real OCR+ML vendor later by implementing the
 * same `ParsedDocumentResult` contract (see README "OCR integration points").
 */
export function parseRateConfirmationText(rawText: string): ParsedDocumentResult {
  const text = rawText.replace(/\r/g, "");
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

  const brokerHit = findLabelValue(lines, LABEL_PATTERNS.broker);
  const shipperHit = findLabelValue(lines, LABEL_PATTERNS.shipper);
  const consigneeHit = findLabelValue(lines, LABEL_PATTERNS.consignee);
  const pickupAddrHit = findLabelValue(lines, LABEL_PATTERNS.pickupAddress);
  const deliveryAddrHit = findLabelValue(lines, LABEL_PATTERNS.deliveryAddress);
  const pickupDateHit = findLabelValue(lines, LABEL_PATTERNS.pickupDate);
  const deliveryDateHit = findLabelValue(lines, LABEL_PATTERNS.deliveryDate);
  const commodityHit = findLabelValue(lines, LABEL_PATTERNS.commodity);
  const equipmentHit = findLabelValue(lines, LABEL_PATTERNS.equipment);
  const linehaulHit = findLabelValue(lines, LABEL_PATTERNS.linehaul);
  const refHit = findLabelValue(lines, LABEL_PATTERNS.referenceNumber);
  const loadHit = findLabelValue(lines, LABEL_PATTERNS.loadNumber);

  // Pickup / delivery city-state-zip: prefer the dedicated address line, else
  // fall back to the shipper/consignee line itself (common on RC templates
  // where "Shipper: Acme Foods - Fresno, CA 93710" is a single line).
  const pickupCityState = extractCityStateZip(pickupAddrHit?.raw ?? shipperHit?.raw ?? "");
  const deliveryCityState = extractCityStateZip(deliveryAddrHit?.raw ?? consigneeHit?.raw ?? "");

  const pickupDateISO = pickupDateHit ? parseDateToISO(pickupDateHit.raw) : null;
  const deliveryDateISO = deliveryDateHit ? parseDateToISO(deliveryDateHit.raw) : null;
  const pickupTime = pickupDateHit?.raw.match(TIME_REGEX)?.[1] ?? null;
  const deliveryTime = deliveryDateHit?.raw.match(TIME_REGEX)?.[1] ?? null;

  const equipmentFromLabel = equipmentHit ? detectEquipmentType(equipmentHit.raw) : null;
  const equipmentFromDoc = equipmentFromLabel ?? detectEquipmentType(text);

  const moneyMatch = linehaulHit?.raw.match(MONEY_REGEX) ?? text.match(MONEY_REGEX);
  const linehaulValue = moneyMatch ? parseFloat(moneyMatch[1].replace(/,/g, "")) : null;

  const mcMatch = text.match(MC_NUMBER_REGEX);
  const dotMatch = text.match(DOT_NUMBER_REGEX);

  const emails = Array.from(new Set(text.match(EMAIL_REGEX) ?? []));
  const phones = Array.from(new Set(text.match(PHONE_REGEX) ?? []));
  const contacts = extractContacts(text);

  const fields: ParsedDocumentFields = {
    broker: guess(brokerHit?.raw.split(/\s{2,}|,/)[0]?.trim() ?? null, 0.85),
    shipper: guess(shipperHit?.raw.split(/\s{2,}|,\s*[A-Z]{2}\b/)[0]?.trim() ?? null, 0.85),
    consignee: guess(consigneeHit?.raw.split(/\s{2,}|,\s*[A-Z]{2}\b/)[0]?.trim() ?? null, 0.85),

    pickupAddress: guess(pickupAddrHit?.raw ?? null, pickupAddrHit ? 0.8 : 0),
    pickupCity: guess(pickupCityState.city, pickupCityState.city ? 0.75 : 0),
    pickupState: guess(pickupCityState.state, pickupCityState.state ? 0.85 : 0),
    pickupZip: guess(pickupCityState.zip, pickupCityState.zip ? 0.9 : 0),
    pickupDate: guess(pickupDateISO, pickupDateISO ? 0.85 : 0),
    pickupTime: guess(pickupTime, pickupTime ? 0.7 : 0),

    deliveryAddress: guess(deliveryAddrHit?.raw ?? null, deliveryAddrHit ? 0.8 : 0),
    deliveryCity: guess(deliveryCityState.city, deliveryCityState.city ? 0.75 : 0),
    deliveryState: guess(deliveryCityState.state, deliveryCityState.state ? 0.85 : 0),
    deliveryZip: guess(deliveryCityState.zip, deliveryCityState.zip ? 0.9 : 0),
    deliveryDate: guess(deliveryDateISO, deliveryDateISO ? 0.85 : 0),
    deliveryTime: guess(deliveryTime, deliveryTime ? 0.7 : 0),

    commodity: guess(commodityHit?.raw ?? null, commodityHit ? 0.7 : 0),
    equipmentType: guess(equipmentFromDoc, equipmentFromLabel ? 0.85 : equipmentFromDoc ? 0.5 : 0),
    linehaulAmount: guess(linehaulValue, moneyMatch ? (linehaulHit ? 0.85 : 0.5) : 0),
    referenceNumber: guess(refHit?.raw.split(/\s/)[0] ?? null, refHit ? 0.75 : 0),
    loadNumber: guess(loadHit?.raw.split(/\s/)[0] ?? null, loadHit ? 0.75 : 0),
    mcNumber: guess(mcMatch ? mcMatch[1] : null, mcMatch ? 0.9 : 0),
    dotNumber: guess(dotMatch ? dotMatch[1] : null, dotMatch ? 0.9 : 0),

    contacts,
    phones,
    emails,
  };

  const coreScores = CORE_FIELDS.map((f) => {
    const field = fields[f] as FieldGuess<unknown>;
    return field.value !== null ? field.confidence : 0;
  });
  const overallConfidence =
    coreScores.reduce((sum, s) => sum + s, 0) / (coreScores.length || 1);

  return {
    fields,
    overallConfidence: Math.round(overallConfidence * 100) / 100,
    needsReview: overallConfidence < NEEDS_REVIEW_THRESHOLD,
  };
}
