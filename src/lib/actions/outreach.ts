"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { generateDrafts } from "@/lib/outreach/generator";
import type { Style } from "@/lib/outreach/templates";
import { logActivity } from "@/lib/activity/log";
import { onDraftGenerated, onDraftApproved, onOutreachSent } from "@/lib/tasks/autoTasks";
import { revalidatePath } from "next/cache";

export async function generateDraftsAction(input: { accountId: string; contactId?: string | null; laneId?: string | null; style: Style }) {
  const user = await requireUser();
  const drafts = await generateDrafts({ ...input, createdById: user.id });
  await onDraftGenerated(input.accountId, input.contactId ?? null);
  revalidatePath("/outreach");
  revalidatePath(`/accounts/${input.accountId}`);
  return drafts;
}

export async function updateDraftAction(id: string, data: { subject: string; body: string }) {
  await requireUser();
  await prisma.outreachDraft.update({ where: { id }, data });
  revalidatePath(`/outreach/${id}`);
}

export async function approveDraftAction(id: string) {
  const user = await requireUser();
  const draft = await prisma.outreachDraft.update({ where: { id }, data: { status: "APPROVED" } });
  if (draft.contactId) {
    await prisma.contact.update({ where: { id: draft.contactId }, data: { status: "DRAFTED" } });
  }
  await logActivity({ type: "DRAFT_APPROVED", summary: "Outreach draft approved", accountId: draft.accountId, contactId: draft.contactId, actorId: user.id });
  await onDraftApproved(draft.accountId, draft.contactId, draft.id);
  revalidatePath(`/outreach/${id}`);
  revalidatePath("/outreach");
  revalidatePath("/tasks");
}

export async function markReadyToSendAction(id: string) {
  await requireUser();
  await prisma.outreachDraft.update({ where: { id }, data: { status: "READY_TO_SEND" } });
  revalidatePath(`/outreach/${id}`);
  revalidatePath("/outreach");
}

export async function archiveDraftAction(id: string) {
  await requireUser();
  await prisma.outreachDraft.update({ where: { id }, data: { status: "ARCHIVED", deletedAt: new Date() } });
  revalidatePath("/outreach");
}

/**
 * Marks a draft as sent and records the outreach message + thread.
 * v1 does not integrate a live mailbox — see README "Email integration
 * plug-in point" for wiring this up to Gmail/Outlook/SMTP in Phase 2.
 */
export async function sendDraftAction(id: string) {
  const user = await requireUser();
  const draft = await prisma.outreachDraft.findUniqueOrThrow({ where: { id } });

  const thread = await prisma.emailThread.create({
    data: { accountId: draft.accountId, contactId: draft.contactId, subject: draft.subject },
  });
  await prisma.outreachMessage.create({
    data: {
      draftId: draft.id,
      accountId: draft.accountId,
      contactId: draft.contactId,
      emailThreadId: thread.id,
      direction: "OUTBOUND",
      subject: draft.subject,
      body: draft.body,
      status: "SENT",
      sentAt: new Date(),
    },
  });
  await prisma.outreachDraft.update({ where: { id }, data: { status: "SENT" } });
  if (draft.contactId) {
    await prisma.contact.update({ where: { id: draft.contactId }, data: { status: "EMAILED", lastContactedAt: new Date() } });
  }
  await prisma.account.update({ where: { id: draft.accountId }, data: { pipelineStage: "SENT", lastActivityAt: new Date() } });

  const opportunity = await prisma.opportunity.findFirst({ where: { accountId: draft.accountId, deletedAt: null }, orderBy: { createdAt: "desc" } });
  if (opportunity) {
    await prisma.stageHistory.create({ data: { opportunityId: opportunity.id, fromStage: opportunity.stage, toStage: "SENT", changedById: user.id } });
    await prisma.opportunity.update({ where: { id: opportunity.id }, data: { stage: "SENT" } });
  }

  await logActivity({ type: "EMAIL_SENT", summary: `Outreach sent: ${draft.subject}`, accountId: draft.accountId, contactId: draft.contactId, actorId: user.id });
  await onOutreachSent(draft.accountId, draft.contactId, opportunity?.id);

  revalidatePath(`/outreach/${id}`);
  revalidatePath("/outreach");
  revalidatePath("/pipeline");
  revalidatePath("/tasks");
}
