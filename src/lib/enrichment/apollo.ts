const APOLLO_BASE = "https://api.apollo.io/api/v1";

export interface ApolloPersonResult {
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
}

/**
 * Real Apollo.io People Search + Match integration. Requires APOLLO_API_KEY
 * in .env (see .env.example). Two-step process, matching Apollo's actual
 * API design:
 *
 *  1. `mixed_people/search` — free-ish search by organization domain +
 *     job title keywords, returns candidates but usually without a
 *     revealed email address.
 *  2. `people/match` — spends a credit to "reveal" verified contact info
 *     for one specific person. We only call this for the small number of
 *     candidates worth revealing (logistics/shipping decision-maker
 *     titles), not the whole search result set, to avoid burning credits.
 */
export async function searchPeopleAtDomain(domain: string, titles: string[]): Promise<ApolloPersonResult[]> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) return [];

  const searchRes = await fetch(`${APOLLO_BASE}/mixed_people/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
    body: JSON.stringify({
      q_organization_domains: domain,
      person_titles: titles,
      page: 1,
      per_page: 10,
    }),
  });

  if (!searchRes.ok) {
    console.error("Apollo search failed:", searchRes.status, await searchRes.text().catch(() => ""));
    return [];
  }

  const searchData = await searchRes.json();
  const people = (searchData?.people ?? []) as any[];

  const results: ApolloPersonResult[] = [];
  for (const person of people.slice(0, 5)) {
    let email = person.email && !String(person.email).includes("not_unlocked") ? person.email : null;
    let phone = person.sanitized_phone ?? null;

    // Reveal step — spends an Apollo credit. Only do this if the search
    // result didn't already include a usable email.
    if (!email && person.id) {
      try {
        const matchRes = await fetch(`${APOLLO_BASE}/people/match`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
          body: JSON.stringify({ id: person.id, reveal_personal_emails: false }),
        });
        if (matchRes.ok) {
          const matchData = await matchRes.json();
          email = matchData?.person?.email && !String(matchData.person.email).includes("not_unlocked") ? matchData.person.email : email;
          phone = matchData?.person?.sanitized_phone ?? phone;
        }
      } catch (err) {
        console.error("Apollo match failed for person", person.id, err);
      }
    }

    results.push({
      fullName: person.name ?? [person.first_name, person.last_name].filter(Boolean).join(" "),
      firstName: person.first_name ?? null,
      lastName: person.last_name ?? null,
      title: person.title ?? null,
      email,
      phone,
      linkedinUrl: person.linkedin_url ?? null,
    });
  }

  return results;
}
