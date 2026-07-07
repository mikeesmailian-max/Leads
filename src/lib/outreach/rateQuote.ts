import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity/log";

export interface LaneRateSuggestion {
  suggestedLinehaul: number;
  sampleSize: number;
  basis: string; // human-readable explanation, no fabricated numbers
}

const MIN_SAMPLE_SIZE = 2;

/**
 * Instant quote-on-interest, data half (recommendation #10). Computes a
 * suggested linehaul rate for a lane from your OWN historical rate-con
 * data (DocumentParse.linehaulAmount) — never invents a number. Returns
 * null if there isn't enough history to trust an average.
 */
export async function computeLaneRateSuggestion(laneId: string): Promise<LaneRateSuggestion | null> {
  const parses = await prisma.documentParse.findMany({
    where: { laneId, linehaulAmount: { not: null } },
    select: { linehaulAmount: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  if (parses.length < MIN_SAMPLE_SIZE) return null;

  const amounts = parses.map((p) => Number(p.linehaulAmount));
  const avg = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;

  return {
    suggestedLinehaul: Math.round(avg),
    sampleSize: amounts.length,
    basis: `avg of ${amounts.length} recent load${amounts.length !== 1 ? "s" : ""} on this lane`,
  };
}

/**
 * Instant quote-on-interest, action half. Called the moment a reply moves
 * an opportunity to Interested/Quoting. Auto-drafts a QUOTE_RESPONSE
 * outreach message using historical lane rate data instead of waiting for
 * someone to manually put a quote together. Quietly no-ops if the
 * opportunity has no lane, or the lane doesn't have enough rate history —
 * this is a speed-up for the common case, not a requirement.
 */
export async function draftQuoteOnInterest(opportunityId: string, actorId: string | null) {
  const opportunity = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
  if (!opportunity || !opportunity.laneId) return null;

  const suggestion = await computeLaneRateSuggestion(opportunity.laneId);
  if (!suggestion) return null;

  // Avoid drafting a duplicate quote if one was already auto-generated for this opportunity's lane recently.
  const recentQuoteDraft = await prisma.outreachDraft.findFirst({
    where: { accountId: opportunity.accountId, laneId: opportunity.laneId, style: "QUOTE_RESPONSE" },
    orderBy: { createdAt: "desc" },
  });
  if (recentQuoteDraft && recentQuoteDraft.createdAt.getTime() > Date.now() - 60 * 60 * 1000) {
    return null; // one was already created in the last hour
  }

  const { generateDrafts } = await import("./generator");
  const drafts = await generateDrafts({
    accountId: opportunity.accountId,
    contactId: opportunity.contactId,
    laneId: opportunity.laneId,
    style: "QUOTE_RESPONSE",
    createdById: actorId,
    versions: ["SHORT"],
  });

  await logActivity({
    type: "DRAFT_GENERATED",
    summary: `Auto-drafted quote response (${suggestion.basis}) — moved to Interested/Quoting`,
    accountId: opportunity.accountId,
    contactId: opportunity.contactId,
    opportunityId: opportunity.id,
    actorId,
  });

  return drafts[0] ?? null;
}
