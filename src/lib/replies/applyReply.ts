import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity/log";
import { onReplyReceived, onWrongContact, onInterestedReply } from "@/lib/tasks/autoTasks";
import { NEXT_ACTION_BY_CATEGORY, type ReplyCategoryGuess } from "@/lib/replies/classify";
import { sentimentTierFromCategory, classifyReplyWithLLM } from "@/lib/replies/sentiment";
import { draftQuoteOnInterest } from "@/lib/outreach/rateQuote";

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
  // Reply sentiment auto-triage (recommendation #7): the heuristic category
  // guess is free and instant. When it can't confidently categorize a reply
  // (UNKNOWN), optionally upgrade via LLM — gated behind ANTHROPIC_API_KEY,
  // so this stays heuristic-only when unconfigured.
  let category = input.category;
  let sentimentSource: "heuristic" | "llm" = "heuristic";
  let sentimentTier = sentimentTierFromCategory(category);

  if (category === "UNKNOWN") {
    const llmResult = await classifyReplyWithLLM(input.rawText);
    if (llmResult) {
      category = llmResult.category;
      sentimentTier = llmResult.sentiment;
      sentimentSource = "llm";
    }
  }

  const reply = await prisma.reply.create({
    data: {
      accountId: input.accountId,
      contactId: input.contactId || null,
      emailThreadId: input.emailThreadId || null,
      rawText: input.rawText,
      category: category as any,
      suggestedNextAction: NEXT_ACTION_BY_CATEGORY[category],
      classifiedById: input.actorId,
      fromEmail: input.fromEmail || null,
      externalMessageId: input.externalMessageId || null,
      sentimentTier: sentimentTier as any,
      sentimentSource,
    },
  });

  await logActivity({
    type: "REPLY_CLASSIFIED",
    summary: `Reply classified: ${category.replaceAll("_", " ")} (${sentimentTier.toLowerCase()})${input.actorId ? "" : " — auto-ingested from inbox"}`,
    accountId: input.accountId,
    contactId: input.contactId,
    actorId: input.actorId,
  });

  const opportunity = await prisma.opportunity.findFirst({ where: { accountId: input.accountId, deletedAt: null }, orderBy: { createdAt: "desc" } });

  await onReplyReceived(input.accountId, input.contactId ?? null);
  if (input.contactId) {
    await prisma.contact.update({ where: { id: input.contactId }, data: { status: "REPLIED" } });
  }

  if (category === "WRONG_CONTACT" && input.contactId) {
    await onWrongContact(input.accountId, input.contactId);
  } else if (category === "INTERESTED" || category === "QUOTE_REQUEST") {
    await onInterestedReply(input.accountId, input.contactId ?? null, opportunity?.id);
    if (opportunity) {
      const toStage = category === "QUOTE_REQUEST" ? "QUOTING" : "INTERESTED";
      await prisma.stageHistory.create({ data: { opportunityId: opportunity.id, fromStage: opportunity.stage, toStage, changedById: input.actorId } });
      await prisma.opportunity.update({ where: { id: opportunity.id }, data: { stage: toStage } });
      await prisma.account.update({ where: { id: input.accountId }, data: { pipelineStage: toStage } });

      // Instant quote-on-interest (recommendation #10): the moment an
      // opportunity hits Interested/Quoting, auto-draft a rate quote from
      // historical rate-con data on the same lane instead of waiting on a
      // manual quote. No-ops quietly if there isn't enough lane history.
      await draftQuoteOnInterest(opportunity.id, input.actorId);
    }
  } else if (category === "NOT_INTERESTED" || category === "UNSUBSCRIBE") {
    if (opportunity) {
      await prisma.stageHistory.create({ data: { opportunityId: opportunity.id, fromStage: opportunity.stage, toStage: "LOST", changedById: input.actorId, note: category } });
      await prisma.opportunity.update({ where: { id: opportunity.id }, data: { stage: "LOST", lostReason: category } });
      await prisma.account.update({ where: { id: input.accountId }, data: { pipelineStage: "LOST" } });
    }
    if (category === "UNSUBSCRIBE" && input.contactId) {
      await prisma.contact.update({ where: { id: input.contactId }, data: { doNotContact: true } });
    }
  } else if (opportunity) {
    await prisma.stageHistory.create({ data: { opportunityId: opportunity.id, fromStage: opportunity.stage, toStage: "REPLIED", changedById: input.actorId } });
    await prisma.opportunity.update({ where: { id: opportunity.id }, data: { stage: "REPLIED" } });
    await prisma.account.update({ where: { id: input.accountId }, data: { pipelineStage: "REPLIED" } });
  }

  return reply;
}
