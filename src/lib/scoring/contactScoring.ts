import { SUGGESTED_LOGISTICS_TITLES } from "@/lib/parser/patterns";

export interface ContactScoringInput {
  fullName?: string | null;
  title?: string | null;
  email?: string | null;
  accountDomain?: string | null;
  source?: string | null; // "document" | "manual" | "inferred" | "web"
  facilityId?: string | null;
  foundInDocument?: boolean;
}

export interface ContactScoreBreakdown {
  domainMatch: number;
  titleRelevance: number;
  documentPresence: number;
  nameConsistency: number;
  facilityRelevance: number;
  emailPatternConfidence: number;
  webSourceConfidence: number;
}

export interface ContactScoreResult {
  score: number; // 0..100
  confidence: number; // 0..1 (score / 100), stored on Contact.confidenceScore
  breakdown: ContactScoreBreakdown;
}

const WEIGHTS = {
  domainMatch: 20,
  titleRelevance: 25,
  documentPresence: 15,
  nameConsistency: 10,
  facilityRelevance: 10,
  emailPatternConfidence: 15,
  webSourceConfidence: 5,
};

function titleRelevanceScore(title?: string | null): number {
  if (!title) return 0;
  const normalized = title.toLowerCase();
  const exact = SUGGESTED_LOGISTICS_TITLES.some((t) => normalized === t.toLowerCase());
  if (exact) return 1;
  const partial = SUGGESTED_LOGISTICS_TITLES.some((t) =>
    normalized.includes(t.toLowerCase().split(" ")[0]) || t.toLowerCase().includes(normalized),
  );
  if (partial) return 0.7;
  const looseKeywords = /(logistic|shipping|transport|traffic|warehouse|supply chain|distribution|operations|procurement|plant|fleet|dispatch)/i;
  return looseKeywords.test(normalized) ? 0.5 : 0.1;
}

function emailPatternScore(email?: string | null, domain?: string | null): number {
  if (!email) return 0;
  const [local, emailDomain] = email.split("@");
  if (!local || !emailDomain) return 0.1;
  const domainMatches = domain ? emailDomain.toLowerCase() === domain.toLowerCase() : false;
  const looksPersonal = /^[a-z]+[._-]?[a-z]*\d{0,2}$/i.test(local) && local.length > 2;
  const looksGeneric = /^(info|sales|contact|support|admin|office|hello|dispatch)$/i.test(local);
  if (looksGeneric) return domainMatches ? 0.35 : 0.15;
  if (looksPersonal) return domainMatches ? 1 : 0.6;
  return domainMatches ? 0.7 : 0.4;
}

function nameConsistencyScore(fullName?: string | null): number {
  if (!fullName) return 0;
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return 0.3;
  const looksLikeRealName = parts.every((p) => /^[A-Z][a-zA-Z'.-]*$/.test(p));
  return looksLikeRealName ? 1 : 0.5;
}

/**
 * Confidence scoring engine for prospective contacts. Combines signals that
 * are cheaply computable without any paid enrichment API. Every weight is
 * tunable from Settings → Confidence Scoring so Mike can bias the model
 * toward whichever signal has proven most reliable in practice.
 */
export function scoreContact(input: ContactScoringInput, weights = WEIGHTS): ContactScoreResult {
  const domainMatch =
    input.email && input.accountDomain && input.email.split("@")[1]?.toLowerCase() === input.accountDomain.toLowerCase()
      ? 1
      : 0;
  const titleRelevance = titleRelevanceScore(input.title);
  const documentPresence = input.foundInDocument ? 1 : input.source === "document" ? 1 : 0;
  const nameConsistency = nameConsistencyScore(input.fullName);
  const facilityRelevance = input.facilityId ? 1 : 0.3;
  const emailPatternConfidence = emailPatternScore(input.email, input.accountDomain);
  const webSourceConfidence = input.source === "web" ? 0.6 : input.source === "manual" ? 0.8 : 0.5;

  const breakdown: ContactScoreBreakdown = {
    domainMatch,
    titleRelevance,
    documentPresence,
    nameConsistency,
    facilityRelevance,
    emailPatternConfidence,
    webSourceConfidence,
  };

  const score =
    breakdown.domainMatch * weights.domainMatch +
    breakdown.titleRelevance * weights.titleRelevance +
    breakdown.documentPresence * weights.documentPresence +
    breakdown.nameConsistency * weights.nameConsistency +
    breakdown.facilityRelevance * weights.facilityRelevance +
    breakdown.emailPatternConfidence * weights.emailPatternConfidence +
    breakdown.webSourceConfidence * weights.webSourceConfidence;

  const rounded = Math.round(score);
  return { score: rounded, confidence: Math.round(rounded) / 100, breakdown };
}

export function suggestedTitlesFor(_industry?: string | null): string[] {
  return SUGGESTED_LOGISTICS_TITLES;
}
