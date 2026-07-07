import { prisma } from "@/lib/db";
import { fetchOrgJobPostings } from "./apolloOrgs";
import { DOMAIN_RELEVANCE_KEYWORDS } from "@/lib/enrichment/decisionMaker";

export interface HiringSignalResult {
  ok: boolean;
  error?: string;
  detected: boolean;
  detail: string | null;
}

/**
 * Hiring-signal detection (recommendation #2). A company hiring for
 * logistics/supply-chain roles is usually growing shipment volume — a
 * buying-intent signal that's easy to automate off Apollo's job-postings
 * data, without needing a human to notice the job posting themselves.
 */
export async function checkHiringSignal(accountId: string): Promise<HiringSignalResult> {
  if (!process.env.APOLLO_API_KEY) {
    return { ok: false, error: "APOLLO_API_KEY not configured", detected: false, detail: null };
  }

  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) return { ok: false, error: "Account not found", detected: false, detail: null };
  if (!account.apolloOrgId) {
    return { ok: false, error: "Account has no Apollo organization id yet — run ICP sourcing or enrichment first", detected: false, detail: null };
  }

  const postings = await fetchOrgJobPostings(account.apolloOrgId);
  const relevant = postings.filter((p) => DOMAIN_RELEVANCE_KEYWORDS.test(p.title));

  const detected = relevant.length > 0;
  const detail = detected ? `Hiring: ${relevant.slice(0, 3).map((p) => p.title).join(", ")}` : null;

  await prisma.account.update({
    where: { id: accountId },
    data: {
      hiringSignalDetected: detected,
      hiringSignalDetail: detail,
      hiringSignalCheckedAt: new Date(),
    },
  });

  return { ok: true, detected, detail };
}

/** Bulk sweep for the daily digest / cron job — checks every account that has an Apollo org id. */
export async function checkHiringSignalsForAllAccounts(): Promise<{ checked: number; newlyDetected: number }> {
  const accounts = await prisma.account.findMany({
    where: { apolloOrgId: { not: null }, deletedAt: null },
    select: { id: true },
    take: 100, // cap per run to respect Apollo rate limits
  });

  let checked = 0;
  let newlyDetected = 0;
  for (const { id } of accounts) {
    const before = await prisma.account.findUnique({ where: { id }, select: { hiringSignalDetected: true } });
    const result = await checkHiringSignal(id);
    if (!result.ok) continue;
    checked++;
    if (result.detected && !before?.hiringSignalDetected) newlyDetected++;
  }

  return { checked, newlyDetected };
}
