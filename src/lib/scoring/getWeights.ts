import { prisma } from "@/lib/db";

export const DEFAULT_SCORING_WEIGHTS = {
  domainMatch: 20,
  titleRelevance: 25,
  documentPresence: 15,
  nameConsistency: 10,
  facilityRelevance: 10,
  emailPatternConfidence: 15,
  webSourceConfidence: 5,
};

export type ScoringWeights = typeof DEFAULT_SCORING_WEIGHTS;

export async function getScoringWeights(): Promise<ScoringWeights> {
  const setting = await prisma.setting.findUnique({ where: { key: "scoring.weights" } });
  if (!setting) return DEFAULT_SCORING_WEIGHTS;
  return { ...DEFAULT_SCORING_WEIGHTS, ...(setting.value as Partial<ScoringWeights>) };
}
