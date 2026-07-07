"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity/log";
import { onReplyReceived, onWrongContact, onInterestedReply } from "@/lib/tasks/autoTasks";
import { NEXT_ACTION_BY_CATEGORY, type ReplyCategoryGuess } from "@/lib/replies/classify";
import { revalidatePath } from "next/cache";

export async function classifyReplyAction(input: {
  accountId: string;
  contactId?: string | null;
  rawText: string;
  category: ReplyCategoryGuess;
}) {
  const user = await requireUser();

  const reply = await prisma.reply.create({
    data: {
      accountId: input.accountId,
      contactId: input.contactId || null,
      rawText: input.rawText,
      category: input.category as any,
      suggestedNextAction: NEXT_ACTION_BY_CATEGORY[input.category],
      classifiedById: user.id,
    },
  });

  await logActivity({
    type: "REPLY_CLASSIFIED",
    summary: `Reply classified: ${input.category.replaceAll("_", " ")}`,
    accountId: input.accountId,
    contactId: input.contactId,
    actorId: user.id,
  });

  const opportunity = await prisma.opportunity.findFirst({ where: { accountId: input.accountId, deletedAt: null }, orderBy: { createdAt: "desc" } });

  // Universal: any reply closes pending follow-up tasks and marks contact replied.
  await onReplyReceived(input.accountId, input.contactId ?? null);
  if (input.contactId) {
    await prisma.contact.update({ where: { id: input.contactId }, data: { status: "REPLIED" } });
  }

  if (input.category === "WRONG_CONTACT" && input.contactId) {
    await onWrongContact(input.accountId, input.contactId);
  } else if (input.category === "INTERESTED" || input.category === "QUOTE_REQUEST") {
    await onInterestedReply(input.accountId, input.contactId ?? null, opportunity?.id);
    if (opportunity) {
      await prisma.stageHistory.create({ data: { opportunityId: opportunity.id, fromStage: opportunity.stage, toStage: input.category === "QUOTE_REQUEST" ? "QUOTING" : "INTERESTED", changedById: user.id } });
      await prisma.opportunity.update({ where: { id: opportunity.id }, data: { stage: input.category === "QUOTE_REQUEST" ? "QUOTING" : "INTERESTED" } });
      await prisma.account.update({ where: { id: input.accountId }, data: { pipelineStage: input.category === "QUOTE_REQUEST" ? "QUOTING" : "INTERESTED" } });
    }
  } else if (input.category === "NOT_INTERESTED" || input.category === "UNSUBSCRIBE") {
    if (opportunity) {
      await prisma.stageHistory.create({ data: { opportunityId: opportunity.id, fromStage: opportunity.stage, toStage: "LOST", changedById: user.id, note: input.category } });
      await prisma.opportunity.update({ where: { id: opportunity.id }, data: { stage: "LOST", lostReason: input.category } });
      await prisma.account.update({ where: { id: input.accountId }, data: { pipelineStage: "LOST" } });
    }
    if (input.category === "UNSUBSCRIBE" && input.contactId) {
      await prisma.contact.update({ where: { id: input.contactId }, data: { doNotContact: true } });
    }
  } else if (opportunity) {
    await prisma.stageHistory.create({ data: { opportunityId: opportunity.id, fromStage: opportunity.stage, toStage: "REPLIED", changedById: user.id } });
    await prisma.opportunity.update({ where: { id: opportunity.id }, data: { stage: "REPLIED" } });
    await prisma.account.update({ where: { id: input.accountId }, data: { pipelineStage: "REPLIED" } });
  }

  revalidatePath("/replies");
  revalidatePath("/pipeline");
  revalidatePath("/tasks");
  revalidatePath(`/accounts/${input.accountId}`);
  return reply;
}
