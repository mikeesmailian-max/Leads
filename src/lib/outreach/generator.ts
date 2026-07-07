import { prisma } from "@/lib/db";
import { gatherFacts, getSenderProfile } from "./facts";
import { buildDraft, type Style, type Length } from "./templates";
import { logActivity } from "@/lib/activity/log";

export interface GenerateDraftsInput {
  accountId: string;
  contactId?: string | null;
  laneId?: string | null;
  style: Style;
  createdById?: string | null;
  versions?: Length[]; // which length variants to generate as A/B/(C)
}

const VERSION_LABELS = ["A", "B", "C"];

export async function generateDrafts(input: GenerateDraftsInput) {
  const facts = await gatherFacts(input.accountId, input.contactId, input.laneId);
  const profile = await getSenderProfile();
  const versions = input.versions ?? (["SHORT", "LONG"] as Length[]);

  const drafts = [];
  for (let i = 0; i < versions.length; i++) {
    const length = versions[i];
    const { subject, body } = buildDraft(input.style, length, facts, profile);
    const draft = await prisma.outreachDraft.create({
      data: {
        accountId: input.accountId,
        contactId: input.contactId ?? null,
        laneId: input.laneId ?? null,
        style: input.style,
        length,
        versionLabel: VERSION_LABELS[i] ?? `V${i + 1}`,
        subject,
        body,
        status: "DRAFT",
        factsUsed: facts as any,
        createdById: input.createdById ?? null,
      },
    });
    drafts.push(draft);
  }

  await logActivity({
    type: "DRAFT_GENERATED",
    summary: `Generated ${drafts.length} outreach draft${drafts.length > 1 ? "s" : ""} (${input.style})`,
    accountId: input.accountId,
    contactId: input.contactId ?? null,
    actorId: input.createdById ?? null,
  });

  return drafts;
}
