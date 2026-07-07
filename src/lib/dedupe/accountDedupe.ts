import { prisma } from "@/lib/db";
import { normalizeCompanyName, extractDomain, stringSimilarity } from "./normalize";
import type { Account } from "@prisma/client";

export interface AccountMatchCandidate {
  account: Account;
  score: number; // 0..1
  reason: "exact_name" | "domain" | "fuzzy_name";
}

const FUZZY_THRESHOLD = 0.82;

/**
 * Finds candidate existing accounts for a given raw company name / domain.
 * Used both for auto-matching during document approval and for the manual
 * "possible duplicates" panel on the Accounts merge UI.
 */
export async function findAccountMatches(
  rawName: string,
  domain?: string | null,
): Promise<AccountMatchCandidate[]> {
  const normalized = normalizeCompanyName(rawName);
  if (!normalized && !domain) return [];

  const candidates: AccountMatchCandidate[] = [];
  const seen = new Set<string>();

  // 1. Exact normalized-name match
  if (normalized) {
    const exact = await prisma.account.findMany({
      where: { normalizedName: normalized, deletedAt: null },
    });
    for (const account of exact) {
      candidates.push({ account, score: 1, reason: "exact_name" });
      seen.add(account.id);
    }
  }

  // 2. Domain match
  if (domain) {
    const byDomain = await prisma.account.findMany({
      where: { domain, deletedAt: null },
    });
    for (const account of byDomain) {
      if (seen.has(account.id)) continue;
      candidates.push({ account, score: 0.95, reason: "domain" });
      seen.add(account.id);
    }
  }

  // 3. Fuzzy name match against the broader active account pool.
  // (Fine for an MVP-scale broker book; move to trigram/pg_trgm index if this
  // ever needs to scale past a few thousand accounts.)
  if (normalized) {
    const pool = await prisma.account.findMany({
      where: { deletedAt: null },
      select: { id: true, normalizedName: true },
      take: 2000,
    });
    const fuzzyMatches = pool
      .filter((a) => !seen.has(a.id))
      .map((a) => ({ id: a.id, score: stringSimilarity(a.normalizedName, normalized) }))
      .filter((m) => m.score >= FUZZY_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (fuzzyMatches.length > 0) {
      const accounts = await prisma.account.findMany({
        where: { id: { in: fuzzyMatches.map((m) => m.id) } },
      });
      for (const account of accounts) {
        const score = fuzzyMatches.find((m) => m.id === account.id)!.score;
        candidates.push({ account, score, reason: "fuzzy_name" });
        seen.add(account.id);
      }
    }
  }

  return candidates.sort((a, b) => b.score - a.score);
}

export { normalizeCompanyName, extractDomain, stringSimilarity };
