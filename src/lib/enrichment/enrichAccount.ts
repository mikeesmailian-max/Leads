import { prisma } from "@/lib/db";
import { searchPeopleAtDomain } from "./apollo";
import { pickPrimaryDecisionMaker } from "./decisionMaker";
import { scoreContact } from "@/lib/scoring/contactScoring";
import { getScoringWeights } from "@/lib/scoring/getWeights";
import { SUGGESTED_LOGISTICS_TITLES } from "@/lib/parser/patterns";
import { logActivity } from "@/lib/activity/log";

const SEARCH_TITLES = [
  ...SUGGESTED_LOGISTICS_TITLES,
  "VP of Logistics",
  "VP of Operations",
  "Head of Supply Chain",
  "Chief Supply Chain Officer",
];

export interface EnrichAccountResult {
  ok: boolean;
  error?: string;
  contactsFound: number;
  contactsCreated: number;
  decisionMakerContactId: string | null;
}

/**
 * Finds additional shipping/logistics contacts at an account via Apollo.io,
 * and specifically flags the most senior logistics/shipping decision-maker
 * found (Contact.isDecisionMaker = true) so it's obvious at a glance who to
 * actually call — rather than just dumping a list of names.
 *
 * Explicit action (triggered from the account page), not automatic on
 * every account creation, so it doesn't silently burn Apollo credits.
 */
export async function enrichAccountContacts(accountId: string, actorId: string | null): Promise<EnrichAccountResult> {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) return { ok: false, error: "Account not found", contactsFound: 0, contactsCreated: 0, decisionMakerContactId: null };
  if (!account.domain) return { ok: false, error: "Account has no known domain to search", contactsFound: 0, contactsCreated: 0, decisionMakerContactId: null };
  if (!process.env.APOLLO_API_KEY) return { ok: false, error: "APOLLO_API_KEY not configured", contactsFound: 0, contactsCreated: 0, decisionMakerContactId: null };

  const people = await searchPeopleAtDomain(account.domain, SEARCH_TITLES);
  if (people.length === 0) {
    await prisma.account.update({ where: { id: accountId }, data: { lastEnrichedAt: new Date() } });
    return { ok: true, contactsFound: 0, contactsCreated: 0, decisionMakerContactId: null };
  }

  const decisionMakerIndex = pickPrimaryDecisionMaker(people);
  const weights = await getScoringWeights();
  let contactsCreated = 0;
  let decisionMakerContactId: string | null = null;

  for (let i = 0; i < people.length; i++) {
    const person = people[i];
    if (!person.fullName) continue;

    const existing = person.email
      ? await prisma.contact.findFirst({ where: { accountId, email: { equals: person.email, mode: "insensitive" }, deletedAt: null } })
      : await prisma.contact.findFirst({ where: { accountId, fullName: { equals: person.fullName, mode: "insensitive" }, deletedAt: null } });

    const isDecisionMaker = i === decisionMakerIndex;
    const { confidence } = scoreContact(
      {
        fullName: person.fullName,
        title: person.title,
        email: person.email,
        accountDomain: account.domain,
        source: "enrichment",
        foundInDocument: false,
      },
      weights,
    );

    if (existing) {
      const updated = await prisma.contact.update({
        where: { id: existing.id },
        data: {
          title: person.title ?? existing.title,
          email: person.email ?? existing.email,
          phone: person.phone ?? existing.phone,
          linkedinUrl: person.linkedinUrl ?? existing.linkedinUrl,
          isDecisionMaker: isDecisionMaker || existing.isDecisionMaker,
          enrichmentSource: "apollo",
          enrichedAt: new Date(),
        },
      });
      if (isDecisionMaker) decisionMakerContactId = updated.id;
      continue;
    }

    const created = await prisma.contact.create({
      data: {
        accountId,
        fullName: person.fullName,
        firstName: person.firstName ?? person.fullName.split(" ")[0],
        lastName: person.lastName ?? (person.fullName.split(" ").slice(1).join(" ") || null),
        title: person.title ?? null,
        email: person.email ?? null,
        phone: person.phone ?? null,
        linkedinUrl: person.linkedinUrl ?? null,
        confidenceScore: confidence,
        status: "NEW",
        verificationStatus: "PENDING",
        source: "enrichment",
        isDecisionMaker,
        enrichmentSource: "apollo",
        enrichedAt: new Date(),
      },
    });
    contactsCreated++;
    if (isDecisionMaker) decisionMakerContactId = created.id;
  }

  await prisma.account.update({ where: { id: accountId }, data: { lastEnrichedAt: new Date() } });

  await logActivity({
    type: "ACCOUNT_ENRICHED",
    summary: `Enrichment found ${people.length} contact(s)${decisionMakerContactId ? ", flagged the shipping/logistics decision-maker" : ""}`,
    accountId,
    actorId,
  });

  return { ok: true, contactsFound: people.length, contactsCreated, decisionMakerContactId };
}
