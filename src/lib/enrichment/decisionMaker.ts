/**
 * Seniority-based decision-maker detection for shipping/logistics roles.
 * Independent from src/lib/parser/patterns.ts's SUGGESTED_LOGISTICS_TITLES
 * (which is a fixed relevance-ordered list used for contact-confidence
 * scoring) — this scores *any* title string on two axes so it works with
 * whatever exact title text an enrichment provider returns, not just an
 * exact match against a fixed list.
 */

const SENIORITY_TIERS: { pattern: RegExp; weight: number }[] = [
  { pattern: /\b(chief|c-level|cxo|president)\b/i, weight: 100 },
  { pattern: /\bvp\b|\bvice president\b/i, weight: 90 },
  { pattern: /\bhead of\b|\bdirector\b/i, weight: 75 },
  { pattern: /\bsenior manager\b|\bsr\.? manager\b/i, weight: 60 },
  { pattern: /\bmanager\b/i, weight: 50 },
  { pattern: /\bsupervisor\b|\blead\b/i, weight: 35 },
  { pattern: /\bcoordinator\b|\bspecialist\b|\banalyst\b/i, weight: 20 },
];

const DOMAIN_RELEVANCE_KEYWORDS =
  /(logistic|shipping|supply chain|transport|traffic|distribution|fleet|warehouse|procurement|import|export|freight|dispatch)/i;

export interface DecisionMakerScore {
  seniorityWeight: number; // 0-100
  domainRelevant: boolean;
  isLikelyDecisionMaker: boolean; // domain-relevant AND manager-level or above
}

export function scoreDecisionMakerLikelihood(title?: string | null): DecisionMakerScore {
  if (!title) return { seniorityWeight: 0, domainRelevant: false, isLikelyDecisionMaker: false };

  const seniorityWeight = SENIORITY_TIERS.find((t) => t.pattern.test(title))?.weight ?? 10;
  const domainRelevant = DOMAIN_RELEVANCE_KEYWORDS.test(title);

  return {
    seniorityWeight,
    domainRelevant,
    isLikelyDecisionMaker: domainRelevant && seniorityWeight >= 50,
  };
}

/** Given a list of {title} objects, returns the index of the single best decision-maker candidate, or -1 if none qualify. */
export function pickPrimaryDecisionMaker<T extends { title?: string | null }>(candidates: T[]): number {
  let bestIndex = -1;
  let bestWeight = -1;
  candidates.forEach((c, i) => {
    const { isLikelyDecisionMaker, seniorityWeight } = scoreDecisionMakerLikelihood(c.title);
    if (isLikelyDecisionMaker && seniorityWeight > bestWeight) {
      bestWeight = seniorityWeight;
      bestIndex = i;
    }
  });
  return bestIndex;
}
