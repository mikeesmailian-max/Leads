const APOLLO_BASE = "https://api.apollo.io/api/v1";

export interface ApolloOrgResult {
  apolloOrgId: string;
  name: string;
  website: string | null;
  domain: string | null;
  industry: string | null;
  city: string | null;
  state: string | null;
  employeeCount: number | null;
}

export interface OrgSearchFilters {
  industries?: string[];
  locations?: string[]; // e.g. "Fresno, CA" or "Phoenix, AZ" or just a state
  minEmployees?: number;
  maxEmployees?: number;
  keywords?: string; // free-text keyword (e.g. a city name for lane-overlap search)
  perPage?: number;
}

/**
 * Real Apollo.io Organization Search (`mixed_companies/search`). Requires
 * APOLLO_API_KEY. Used by ICP-based account sourcing (#1) and lane-overlap
 * prospecting (#3) — both are "find companies that look like X" problems,
 * just with different filter inputs.
 */
export async function searchOrganizations(filters: OrgSearchFilters): Promise<ApolloOrgResult[]> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) return [];

  const body: Record<string, unknown> = {
    page: 1,
    per_page: filters.perPage ?? 15,
  };
  if (filters.industries?.length) body.q_organization_keyword_tags = filters.industries;
  if (filters.locations?.length) body.organization_locations = filters.locations;
  if (filters.minEmployees != null || filters.maxEmployees != null) {
    body.organization_num_employees_ranges = [
      `${filters.minEmployees ?? 1},${filters.maxEmployees ?? 100000}`,
    ];
  }
  if (filters.keywords) body.q_organization_name = filters.keywords;

  const res = await fetch(`${APOLLO_BASE}/mixed_companies/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error("Apollo organization search failed:", res.status, await res.text().catch(() => ""));
    return [];
  }

  const data = await res.json();
  const orgs = (data?.organizations ?? data?.accounts ?? []) as any[];

  return orgs.map((org) => ({
    apolloOrgId: String(org.id),
    name: org.name ?? "Unknown",
    website: org.website_url ?? null,
    domain: org.primary_domain ?? (org.website_url ? new URL(org.website_url).hostname.replace(/^www\./, "") : null),
    industry: org.industry ?? null,
    city: org.city ?? null,
    state: org.state ?? null,
    employeeCount: org.estimated_num_employees ?? null,
  }));
}

export interface ApolloJobPosting {
  title: string;
  postedAt: string | null;
  url: string | null;
}

/**
 * Real Apollo.io job postings lookup for a specific organization
 * (`organizations/{id}/job_postings`). Used by hiring-signal detection (#2).
 * Requires APOLLO_API_KEY and an Apollo organization id on the account
 * (set by ICP sourcing or enrichment).
 */
export async function fetchOrgJobPostings(apolloOrgId: string): Promise<ApolloJobPosting[]> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) return [];

  const res = await fetch(`${APOLLO_BASE}/organizations/${apolloOrgId}/job_postings`, {
    method: "GET",
    headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
  });

  if (!res.ok) {
    console.error("Apollo job postings lookup failed:", res.status, await res.text().catch(() => ""));
    return [];
  }

  const data = await res.json();
  const postings = (data?.organization_job_postings ?? data?.job_postings ?? []) as any[];

  return postings.map((p) => ({
    title: p.title ?? p.name ?? "",
    postedAt: p.posted_at ?? p.first_seen_at ?? null,
    url: p.url ?? null,
  }));
}
