import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity/log";
import { onReplyReceived, onWrongContact, onInterestedReply } from "@/lib/tasks/autoTasks";
import { NEXT_ACTION_BY_CATEGORY, type ReplyCategoryGuess } from "@/lib/replies/classify";

/**
 * Core "a reply came in and was classified" workflow — shared by the manual
 * paste-and-classify UI (src/lib/actions/replies.ts) and the automatic IMAP
 * inbox poller (src/lib/email/imapClient.ts). Extracted so background jobs
 * (which have no logged-in session) can trigger the exact same pipeline
 * stage transitions, task creation, and activity logging as a human
 * classifying a reply by hand.
 */
export async function applyClassifiedReply(input: {
  accountId: string;
  contactId?: string | null;
  emailThreadId?: string | null;
  rawText: string;
  category: ReplyCategoryGuess;
  actorId: string | null; // null when triggered by an automated job
  fromEmail?: string | null;
  externalMessageId?: string | null;
}) {
  const reply = await prisma.reply.create({
    data: {
      accountId: input.accountId,
      contactId: input.contactId || null,
      emailThreadId: input.emailThreadId || null,
      rawText: input.rawText,
      category: input.category as any,
      suggestedNextAction: NEXT_ACTION_BY_CATEGORY[input.category],
      classifiedById: input.actorId,
      fromEmail: input.fromEmail || null,
      externalMessageId: input.externalMessageId || null,
    },
  });

  await logActivity({
    type: "REPLY_CLASSIFIED",
    summary: `Reply classified: ${input.category.replaceAll("_", " ")}${input.actorId ? "" : " (auto-ingested from inbox)"}`,
    accountId: input.accountId,
    contactId: input.contactId,
    actorId: input.actorId,
  });

  const opportunity = await prisma.opportunity.findFirst({ where: { accountId: input.accountId, deletedAt: null }, orderBy: { createdAt: "desc" } });

  await onReplyReceived(input.accountId, input.contactId ?? null);
  if (input.contactId) {
    await prisma.contact.update({ where: { id: input.contactId }, data: { status: "REPLIED" } });
  }

  if (input.category === "WRONG_CONTACT" && input.contactId) {
    await onWrongContact(input.accountId, input.contactId);
  } else if (input.category === "INTERESTED" || input.category === "QUOTE_REQUEST") {
    await onInterestedReply(input.accountId, input.contactId ?? null, opportunity?.id);
    if (opportunity) {
      await prisma.stageHistory.create({ data: { opportunityId: opportunity.id, fromStage: opportunity.stage, toStage: input.category === "QUOTE_REQUEST" ? "QUOTING" : "INTERESTED", changedById: input.actorId } });
      await prisma.opportunity.update({ where: { id: opportunity.id }, data: { stage: input.category === "QUOTE_REQUEST" ? "QUOTING" : "INTERESTED" } });
      await prisma.account.update({ where: { id: input.accountId }, data: { pipelineStage: input.category === "QUOTE_REQUEST" ? "QUOTING" : "INTERESTED" } });
    }
  } else if (input.category === "NOT_INTERESTED" || input.category === "UNSUBSCRIBE") {
    if (opportunity) {
      await prisma.stageHistory.create({ data: { opportunityId: opportunity.id, fromStage: opportunity.stage, toStage: "LOST", changedById: input.actorId, note: input.category } });
      await prisma.opportunity.update({ where: { id: opportunity.id }, data: { stage: "LOST", lostReason: input.category } });
      await prisma.account.update({ where: { id: input.accountId }, data: { pipelineStage: "LOST" } });
    }
    if (input.category === "UNSUBSCRIBE" && input.contactId) {
      await prisma.contact.update({ where: { id: input.contactId }, data: { doNotContact: true } });
    }
  } else if (opportunity) {
    await prisma.stageHistory.create({ data: { opportunityId: opportunity.id, fromStage: opportunity.stage, toStage: "REPLIED", changedById: input.actorId } });
    await prisma.opportunity.update({ where: { id: opportunity.id }, data: { stage: "REPLIED" } });
    await prisma.account.update({ where: { id: input.accountId }, data: { pipelineStage: "REPLIED" } });
  }

  return reply;
}
