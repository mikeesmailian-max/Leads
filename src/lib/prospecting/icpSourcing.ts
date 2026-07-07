import { prisma } from "@/lib/db";
import { searchOrganizations } from "./apolloOrgs";
import { findAccountMatches, normalizeCompanyName } from "@/lib/dedupe/accountDedupe";
import { logActivity } from "@/lib/activity/log";

export interface IcpProfile {
  industries: string[];
  locations: string[];
  minEmployees?: number;
  maxEmployees?: number;
}

export const DEFAULT_ICP_PROFILE: IcpProfile = {
  industries: ["Food & Beverage", "Manufacturing", "Consumer Goods"],
  locations: ["California", "Arizona", "Nevada"],
  minEmployees: 20,
  maxEmployees: 2000,
};

export async function getIcpProfile(): Promise<IcpProfile> {
  const setting = await prisma.setting.findUnique({ where: { key: "prospecting.icp" } });
  if (!setting) return DEFAULT_ICP_PROFILE;
  return { ...DEFAULT_ICP_PROFILE, ...(setting.value as Partial<IcpProfile>) };
}

export interface IcpSourcingResult {
  ok: boolean;
  error?: string;
  found: number;
  created: number;
  skippedExisting: number;
}

/**
 * ICP-based outbound account sourcing (recommendation #1). Unlike Apollo
 * enrichment (which only adds contacts to accounts you already have),
 * this searches for brand-new companies matching your ideal customer
 * profile and creates them directly in the pipeline at RESEARCHING —
 * turning the tool into a lead generator, not just a lead processor.
 *
 * Explicit/scheduled action, not automatic per-page-load, so it doesn't
 * silently create hundreds of accounts or burn Apollo credits unexpectedly.
 */
export async function runIcpSourcing(actorId: string | null = null): Promise<IcpSourcingResult> {
  if (!process.env.APOLLO_API_KEY) {
    return { ok: false, error: "APOLLO_API_KEY not configured", found: 0, created: 0, skippedExisting: 0 };
  }

  const icp = await getIcpProfile();
  const orgs = await searchOrganizations({
    industries: icp.industries,
    locations: icp.locations,
    minEmployees: icp.minEmployees,
    maxEmployees: icp.maxEmployees,
    perPage: 25,
  });

  let created = 0;
  let skippedExisting = 0;

  for (const org of orgs) {
    if (!org.name) continue;
    const matches = await findAccountMatches(org.name, org.domain);
    if (matches.length > 0) {
      skippedExisting++;
      // Backfill the Apollo org id onto the existing account if it's missing,
      // so hiring-signal checks can use it later without a second search.
      const existing = matches[0].account;
      if (!existing.apolloOrgId) {
        await prisma.account.update({ where: { id: existing.id }, data: { apolloOrgId: org.apolloOrgId } });
      }
      continue;
    }

    const account = await prisma.account.create({
      data: {
        name: org.name,
        normalizedName: normalizeCompanyName(org.name),
        website: org.website,
        domain: org.domain,
        industry: org.industry,
        region: [org.city, org.state].filter(Boolean).join(", ") || null,
        type: "PROSPECT",
        source: "icp_sourcing",
        pipelineStage: "RESEARCHING",
        apolloOrgId: org.apolloOrgId,
      },
    });
    created++;

    await logActivity({
      type: "ACCOUNT_SOURCED",
      summary: `Sourced from ICP search (industry/region match)`,
      accountId: account.id,
      actorId,
    });
  }

  return { ok: true, found: orgs.length, created, skippedExisting };
}
