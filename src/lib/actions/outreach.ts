"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { generateDrafts } from "@/lib/outreach/generator";
import type { Style } from "@/lib/outreach/templates";
import { logActivity } from "@/lib/activity/log";
import { onDraftGenerated, onDraftApproved, onOutreachSent } from "@/lib/tasks/autoTasks";
import { sendMail } from "@/lib/email/sendMail";
import { isSmtpConfigured } from "@/lib/email/config";
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
 * If SMTP_HOST/EMAIL_USER/EMAIL_PASSWORD are configured (see .env.example),
 * this actually sends the email over SMTP and stores the real Message-ID
 * for reply threading. If not configured, it falls back to the v1 behavior
 * of just logging the message as sent (for manual copy/paste sending).
 */
export async function sendDraftAction(id: string) {
  const user = await requireUser();
  const draft = await prisma.outreachDraft.findUniqueOrThrow({ where: { id } });

  let recipientEmail: string | null = null;
  if (draft.contactId) {
    const contact = await prisma.contact.findUnique({ where: { id: draft.contactId } });
    recipientEmail = contact?.email ?? null;
  }

  let sendResult: { ok: boolean; messageId?: string; error?: string } = { ok: false, error: "SMTP not configured" };
  if (isSmtpConfigured() && recipientEmail) {
    sendResult = await sendMail({ to: recipientEmail, subject: draft.subject, body: draft.body });
  }

  // A real send attempt that actually failed (e.g. SMTP auth error) is
  // recorded as FAILED rather than silently claiming success. When SMTP
  // just isn't configured at all, we keep the v1 manual-send behavior
  // (log it as sent — the human is doing the actual sending by hand).
  const attemptedRealSend = isSmtpConfigured() && Boolean(recipientEmail);
  const messageStatus: "SENT" | "FAILED" = attemptedRealSend && !sendResult.ok ? "FAILED" : "SENT";

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
      status: messageStatus,
      sentAt: messageStatus === "SENT" ? new Date() : null,
      messageId: sendResult.messageId ?? null,
      errorMessage: attemptedRealSend && !sendResult.ok ? sendResult.error ?? null : null,
    },
  });

  if (messageStatus === "FAILED") {
    // Don't move the pipeline forward or mark the draft sent if the real
    // send attempt failed — surface it back to the rep instead.
    revalidatePath(`/outreach/${id}`);
    revalidatePath("/outreach");
    throw new Error(`Send failed: ${sendResult.error ?? "unknown SMTP error"}`);
  }

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
