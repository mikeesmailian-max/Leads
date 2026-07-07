const COMPANY_SUFFIXES =
  /\b(inc|incorporated|llc|l\.l\.c|corp|corporation|co|company|ltd|limited|lp|llp|holdings|group|logistics|foods?|dist(?:ribution)?)\b\.?/gi;

export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,'"]/g, "")
    .replace(COMPANY_SUFFIXES, "")
    .replace(/[^a-z0-9\s&-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractDomain(input: string | null | undefined): string | null {
  if (!input) return null;
  const emailMatch = input.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) return emailMatch[1].toLowerCase();
  try {
    const url = input.startsWith("http") ? input : `https://${input}`;
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/** Dice coefficient bigram similarity — cheap, dependency-free fuzzy match. 0..1 */
export function stringSimilarity(a: string, b: string): number {
  const s1 = a.toLowerCase();
  const s2 = b.toLowerCase();
  if (s1 === s2) return 1;
  if (s1.length < 2 || s2.length < 2) return s1 === s2 ? 1 : 0;

  const bigrams = (s: string) => {
    const map = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.slice(i, i + 2);
      map.set(bg, (map.get(bg) ?? 0) + 1);
    }
    return map;
  };

  const b1 = bigrams(s1);
  const b2 = bigrams(s2);
  let intersection = 0;
  for (const [bg, count] of b1) {
    if (b2.has(bg)) intersection += Math.min(count, b2.get(bg)!);
  }
  const total = (s1.length - 1) + (s2.length - 1);
  return total === 0 ? 0 : (2 * intersection) / total;
}

export function laneLabel(originCity: string | null, originState: string | null, destCity: string | null, destState: string | null): string {
  const o = [originCity, originState].filter(Boolean).join(", ") || "Unknown Origin";
  const d = [destCity, destState].filter(Boolean).join(", ") || "Unknown Destination";
  return `${o} → ${d}`;
}
