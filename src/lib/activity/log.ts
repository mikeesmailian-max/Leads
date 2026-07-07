import { prisma } from "@/lib/db";
import type { ActivityType } from "@prisma/client";

export interface LogActivityInput {
  type: ActivityType;
  summary: string;
  accountId?: string | null;
  contactId?: string | null;
  laneId?: string | null;
  facilityId?: string | null;
  documentId?: string | null;
  opportunityId?: string | null;
  actorId?: string | null;
  metadata?: Record<string, unknown> | null;
}

/** Writes one row to the cross-object activity timeline. */
export async function logActivity(input: LogActivityInput) {
  return prisma.activity.create({
    data: {
      type: input.type,
      summary: input.summary,
      accountId: input.accountId ?? null,
      contactId: input.contactId ?? null,
      laneId: input.laneId ?? null,
      facilityId: input.facilityId ?? null,
      documentId: input.documentId ?? null,
      opportunityId: input.opportunityId ?? null,
      actorId: input.actorId ?? null,
      metadata: (input.metadata as any) ?? undefined,
    },
  });
}
