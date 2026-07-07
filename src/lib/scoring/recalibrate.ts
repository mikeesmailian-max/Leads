import { prisma } from "@/lib/db";
import { scoreContact, type ContactScoreBreakdown } from "./contactScoring";
import { getScoringWeights, DEFAULT_SCORING_WEIGHTS, type ScoringWeights } from "./getWeights";
import { logActivity } from "@/lib/activity/log";

const MIN_SAMPLE_SIZE = 3;
const BLEND_FACTOR = 0.5; // how much of the suggestion comes from the new signal vs. staying close to current weights

export interface RecalibrationSuggestion {
  ok: boolean;
  error?: string;
  wonSampleSize: number;
  lostSampleSize: number;
  currentWeights: ScoringWeights;
  suggestedWeights: ScoringWeights;
  rationale: string[];
}

async function breakdownForContact(contactId: string, weights: ScoringWeights): Promise<ContactScoreBreakdown | null> {
  const contact = await prisma.contact.findUnique({ where: { id: contactId }, include: { account: true } });
  if (!contact) return null;
  const { breakdown } = scoreContact(
    {
      fullName: contact.fullName,
      title: contact.title,
      email: contact.email,
      accountDomain: contact.account?.domain,
      source: contact.source,
      facilityId: contact.facilityId,
      foundInDocument: contact.source === "document",
    },
    weights,
  );
  return breakdown;
}

function avgBreakdown(breakdowns: ContactScoreBreakdown[]): ContactScoreBreakdown {
  const keys = Object.keys(DEFAULT_SCORING_WEIGHTS) as (keyof ScoringWeights)[];
  const out: any = {};
  for (const key of keys) {
    out[key] = breakdowns.length ? breakdowns.reduce((sum, b) => sum + b[key], 0) / breakdowns.length : 0;
  }
  return out;
}

/**
 * Win/loss scoring feedback loop (recommendation #8). Compares contacts on
 * closed-WON vs closed-LOST opportunities to see which scoring signals
 * actually correlate with winning the deal, and suggests adjusted weights.
 * This is a directional heuristic based on your own closed deals, not a
 * precise ML model — surfaced clearly as a suggestion the user applies
 * explicitly (recalibrateScoringAction), never auto-applied.
 */
export async function computeSuggestedWeights(): Promise<RecalibrationSuggestion> {
  const currentWeights = await getScoringWeights();

  const [wonOpps, lostOpps] = await Promise.all([
    prisma.opportunity.findMany({ where: { stage: "WON", deletedAt: null, contactId: { not: null } }, select: { contactId: true } }),
    prisma.opportunity.findMany({ where: { stage: "LOST", deletedAt: null, contactId: { not: null } }, select: { contactId: true } }),
  ]);

  if (wonOpps.length < MIN_SAMPLE_SIZE || lostOpps.length < MIN_SAMPLE_SIZE) {
    return {
      ok: false,
      error: `Not enough closed deals yet to recalibrate (need at least ${MIN_SAMPLE_SIZE} won and ${MIN_SAMPLE_SIZE} lost — have ${wonOpps.length} won, ${lostOpps.length} lost).`,
      wonSampleSize: wonOpps.length,
      lostSampleSize: lostOpps.length,
      currentWeights,
      suggestedWeights: currentWeights,
      rationale: [],
    };
  }

  const wonBreakdowns = (await Promise.all(wonOpps.map((o) => breakdownForContact(o.contactId!, currentWeights)))).filter(Boolean) as ContactScoreBreakdown[];
  const lostBreakdowns = (await Promise.all(lostOpps.map((o) => breakdownForContact(o.contactId!, currentWeights)))).filter(Boolean) as ContactScoreBreakdown[];

  const wonAvg = avgBreakdown(wonBreakdowns);
  const lostAvg = avgBreakdown(lostBreakdowns);

  const keys = Object.keys(DEFAULT_SCORING_WEIGHTS) as (keyof ScoringWeights)[];
  const lift: Record<string, number> = {};
  for (const key of keys) {
    lift[key] = Math.max(0, wonAvg[key] - lostAvg[key]); // only reward positive signal, never negative-weight a dimension
  }
  const liftTotal = Object.values(lift).reduce((sum, v) => sum + v, 0);

  const suggestedWeights = { ...currentWeights };
  const rationale: string[] = [];

  if (liftTotal > 0) {
    for (const key of keys) {
      const liftShare = lift[key] / liftTotal; // 0..1
      const liftBasedWeight = liftShare * 100;
      const blended = currentWeights[key] * (1 - BLEND_FACTOR) + liftBasedWeight * BLEND_FACTOR;
      suggestedWeights[key] = Math.round(blended);

      const delta = suggestedWeights[key] - currentWeights[key];
      if (Math.abs(delta) >= 3) {
        rationale.push(
          `${key}: won deals averaged ${(wonAvg[key] * 100).toFixed(0)}% on this signal vs ${(lostAvg[key] * 100).toFixed(0)}% for lost deals → ${delta > 0 ? "increase" : "decrease"} weight ${currentWeights[key]} → ${suggestedWeights[key]}`,
        );
      }
    }
  } else {
    rationale.push("No signal showed a positive lift between won and lost deals — current weights look reasonable as-is.");
  }

  return {
    ok: true,
    wonSampleSize: wonOpps.length,
    lostSampleSize: lostOpps.length,
    currentWeights,
    suggestedWeights,
    rationale,
  };
}

export async function applyRecalibration(suggestion: RecalibrationSuggestion, actorId: string | null) {
  await prisma.setting.upsert({
    where: { key: "scoring.weights" },
    create: { key: "scoring.weights", value: suggestion.suggestedWeights as any },
    update: { value: suggestion.suggestedWeights as any },
  });

  await prisma.scoringAdjustmentLog.create({
    data: {
      previousWeights: suggestion.currentWeights as any,
      newWeights: suggestion.suggestedWeights as any,
      wonSampleSize: suggestion.wonSampleSize,
      lostSampleSize: suggestion.lostSampleSize,
      applied: true,
      notes: suggestion.rationale.join("; ") || null,
      createdById: actorId,
    },
  });

  await logActivity({
    type: "SCORING_RECALIBRATED",
    summary: `Scoring weights recalibrated from ${suggestion.wonSampleSize} won / ${suggestion.lostSampleSize} lost deals`,
    actorId,
  });
}
