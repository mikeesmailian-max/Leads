import { prisma } from "@/lib/db";
import { searchOrganizations, type ApolloOrgResult } from "./apolloOrgs";
import { findAccountMatches } from "@/lib/dedupe/accountDedupe";

export interface LaneOverlapCandidate extends ApolloOrgResult {
  alreadyExists: boolean;
}

/**
 * Lane-overlap prospecting (recommendation #3). Uses a lane's own
 * origin/destination geography — which you're already good at, since you
 * have real historical loads there — to search for other companies located
 * near either end of the lane. Easiest sell in the list: "we already run
 * this exact corridor."
 */
export async function findLaneOverlapProspects(laneId: string): Promise<{ ok: boolean; error?: string; candidates: LaneOverlapCandidate[] }> {
  if (!process.env.APOLLO_API_KEY) {
    return { ok: false, error: "APOLLO_API_KEY not configured", candidates: [] };
  }

  const lane = await prisma.lane.findUnique({ where: { id: laneId } });
  if (!lane) return { ok: false, error: "Lane not found", candidates: [] };

  const locations = [
    lane.originCity && lane.originState ? `${lane.originCity}, ${lane.originState}` : lane.originState,
    lane.destCity && lane.destState ? `${lane.destCity}, ${lane.destState}` : lane.destState,
  ].filter((v): v is string => Boolean(v));

  if (locations.length === 0) {
    return { ok: false, error: "Lane has no city/state data to search on", candidates: [] };
  }

  const orgs = await searchOrganizations({ locations, perPage: 15 });

  const candidates: LaneOverlapCandidate[] = [];
  for (const org of orgs) {
    const matches = await findAccountMatches(org.name, org.domain);
    candidates.push({ ...org, alreadyExists: matches.length > 0 });
  }

  return { ok: true, candidates };
}

/** Adds a lane-overlap candidate as a new prospect Account, linked to the lane. */
export async function addLaneOverlapProspect(laneId: string, candidate: ApolloOrgResult, actorId: string | null) {
  const { normalizeCompanyName } = await import("@/lib/dedupe/accountDedupe");
  const { logActivity } = await import("@/lib/activity/log");

  const account = await prisma.account.create({
    data: {
      name: candidate.name,
      normalizedName: normalizeCompanyName(candidate.name),
      website: candidate.website,
      domain: candidate.domain,
      industry: candidate.industry,
      region: [candidate.city, candidate.state].filter(Boolean).join(", ") || null,
      type: "PROSPECT",
      source: "lane_overlap",
      pipelineStage: "RESEARCHING",
      apolloOrgId: candidate.apolloOrgId,
    },
  });

  await prisma.laneAccount.create({ data: { laneId, accountId: account.id } }).catch(() => null);

  await logActivity({
    type: "ACCOUNT_SOURCED",
    summary: "Sourced from lane-overlap prospecting",
    accountId: account.id,
    laneId,
    actorId,
  });

  return account;
}
