import { prisma } from "@/lib/db";
import { addDays } from "date-fns";
import { logActivity } from "@/lib/activity/log";
import type { TaskPriority } from "@prisma/client";

interface CreateTaskOpts {
  title: string;
  description?: string;
  taskType: Parameters<typeof prisma.task.create>[0]["data"]["taskType"];
  priority?: TaskPriority;
  dueInDays?: number;
  accountId?: string | null;
  contactId?: string | null;
  laneId?: string | null;
  documentId?: string | null;
  opportunityId?: string | null;
  ownerId?: string | null;
}

async function createTask(opts: CreateTaskOpts) {
  const task = await prisma.task.create({
    data: {
      title: opts.title,
      description: opts.description,
      taskType: opts.taskType,
      priority: opts.priority ?? "MEDIUM",
      dueDate: opts.dueInDays !== undefined ? addDays(new Date(), opts.dueInDays) : null,
      accountId: opts.accountId ?? null,
      contactId: opts.contactId ?? null,
      laneId: opts.laneId ?? null,
      documentId: opts.documentId ?? null,
      opportunityId: opts.opportunityId ?? null,
      ownerId: opts.ownerId ?? null,
      status: "OPEN",
    },
  });
  await logActivity({
    type: "TASK_CREATED",
    summary: opts.title,
    accountId: opts.accountId,
    contactId: opts.contactId,
    documentId: opts.documentId,
    opportunityId: opts.opportunityId,
  });
  return task;
}

/** Document uploaded/parsed with low confidence → needs human review. */
export async function onDocumentNeedsReview(documentId: string, accountName?: string | null) {
  return createTask({
    title: `Review parsed upload${accountName ? ` — ${accountName}` : ""}`,
    taskType: "REVIEW_UPLOAD",
    priority: "MEDIUM",
    dueInDays: 1,
    documentId,
  });
}

/** New unverified contact discovered → verify before outreach. */
export async function onContactDiscovered(contactId: string, accountId: string | null, confidence: number) {
  if (confidence >= 0.85) return null; // high-confidence contacts skip manual verification
  return createTask({
    title: "Verify contact",
    taskType: "VERIFY_CONTACT",
    priority: confidence < 0.5 ? "HIGH" : "MEDIUM",
    dueInDays: 2,
    contactId,
    accountId,
  });
}

/** Draft generated → approve before it can be sent. */
export async function onDraftGenerated(accountId: string, contactId: string | null) {
  return createTask({
    title: "Approve outreach draft",
    taskType: "APPROVE_DRAFT",
    priority: "MEDIUM",
    dueInDays: 1,
    accountId,
    contactId,
  });
}

/** Draft approved → send it. */
export async function onDraftApproved(accountId: string, contactId: string | null, draftId: string) {
  return createTask({
    title: "Send approved outreach",
    description: `Draft ${draftId} is approved and ready to send.`,
    taskType: "SEND_OUTREACH",
    priority: "HIGH",
    dueInDays: 0,
    accountId,
    contactId,
  });
}

/** Outreach sent → schedule the standard follow-up cadence. */
export async function onOutreachSent(accountId: string, contactId: string | null, opportunityId?: string | null) {
  const first = await createTask({
    title: "Follow up (2 days)",
    taskType: "FOLLOW_UP",
    priority: "MEDIUM",
    dueInDays: 2,
    accountId,
    contactId,
    opportunityId,
  });
  await createTask({
    title: "Follow up (5 days)",
    taskType: "FOLLOW_UP",
    priority: "LOW",
    dueInDays: 5,
    accountId,
    contactId,
    opportunityId,
  });
  return first;
}

/** Reply received → close any still-open follow-up tasks for this account/contact. */
export async function onReplyReceived(accountId: string, contactId: string | null) {
  await prisma.task.updateMany({
    where: {
      accountId,
      contactId: contactId ?? undefined,
      taskType: "FOLLOW_UP",
      status: { in: ["OPEN", "IN_PROGRESS"] },
    },
    data: { status: "CANCELLED" },
  });
}

/** Reply classified as wrong contact → research a better one. */
export async function onWrongContact(accountId: string, contactId: string) {
  await prisma.contact.update({ where: { id: contactId }, data: { status: "WRONG_CONTACT" } });
  return createTask({
    title: "Research better contact",
    taskType: "RESEARCH_CONTACT",
    priority: "HIGH",
    dueInDays: 1,
    accountId,
    contactId,
  });
}

/** Reply classified as interested → move toward quoting. */
export async function onInterestedReply(accountId: string, contactId: string | null, opportunityId?: string | null) {
  return createTask({
    title: "Call account — interested reply",
    taskType: "CALL_ACCOUNT",
    priority: "URGENT",
    dueInDays: 0,
    accountId,
    contactId,
    opportunityId,
  });
}

/** Account judged not a fit → archive. */
export async function onArchiveAccount(accountId: string) {
  return createTask({
    title: "Confirm archive — no fit",
    taskType: "ARCHIVE_ACCOUNT",
    priority: "LOW",
    dueInDays: 3,
    accountId,
  });
}
