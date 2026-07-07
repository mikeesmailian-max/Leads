"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { normalizeCompanyName, extractDomain } from "@/lib/dedupe/normalize";
import { findAccountMatches } from "@/lib/dedupe/accountDedupe";
import { logActivity } from "@/lib/activity/log";
import { revalidatePath } from "next/cache";
import type { AccountType, EquipmentType, PipelineStage } from "@prisma/client";

export interface AccountInput {
  name: string;
  website?: string | null;
  type: AccountType;
  industry?: string | null;
  region?: string | null;
  equipmentFocus?: EquipmentType | null;
  internalNotes?: string | null;
  ownerId?: string | null;
}

export async function createAccount(input: AccountInput) {
  const user = await requireUser();
  const domain = extractDomain(input.website);
  const account = await prisma.account.create({
    data: {
      name: input.name,
      normalizedName: normalizeCompanyName(input.name),
      website: input.website || null,
      domain,
      type: input.type,
      industry: input.industry || null,
      region: input.region || null,
      equipmentFocus: input.equipmentFocus || null,
      internalNotes: input.internalNotes || null,
      ownerId: input.ownerId || user.id,
      source: "Manual entry",
    },
  });
  await logActivity({ type: "CREATED", summary: "Account created manually", accountId: account.id, actorId: user.id });
  revalidatePath("/accounts");
  return account;
}

export async function updateAccount(id: string, input: Partial<AccountInput> & { pipelineStage?: PipelineStage }) {
  const user = await requireUser();
  const data: any = { ...input, lastActivityAt: new Date() };
  if (input.name) data.normalizedName = normalizeCompanyName(input.name);
  if (input.website) data.domain = extractDomain(input.website);

  const account = await prisma.account.update({ where: { id }, data });
  await logActivity({ type: "UPDATED", summary: "Account details updated", accountId: id, actorId: user.id });
  revalidatePath(`/accounts/${id}`);
  revalidatePath("/accounts");
  return account;
}

export async function changeAccountStage(id: string, stage: PipelineStage) {
  const user = await requireUser();
  await prisma.account.update({ where: { id }, data: { pipelineStage: stage, lastActivityAt: new Date() } });
  await logActivity({ type: "STAGE_CHANGED", summary: `Stage changed to ${stage}`, accountId: id, actorId: user.id });
  revalidatePath(`/accounts/${id}`);
  revalidatePath("/pipeline");
  revalidatePath("/accounts");
}

export async function archiveAccount(id: string) {
  const user = await requireUser();
  await prisma.account.update({ where: { id }, data: { deletedAt: new Date(), pipelineStage: "ARCHIVED" } });
  await logActivity({ type: "UPDATED", summary: "Account archived", accountId: id, actorId: user.id });
  revalidatePath("/accounts");
}

export async function getDuplicateCandidates(accountId: string) {
  const account = await prisma.account.findUniqueOrThrow({ where: { id: accountId } });
  const matches = await findAccountMatches(account.name, account.domain);
  return matches.filter((m) => m.account.id !== accountId);
}

export async function mergeAccounts(targetAccountId: string, sourceAccountId: string) {
  const user = await requireUser();
  if (targetAccountId === sourceAccountId) throw new Error("Cannot merge an account into itself");

  await prisma.$transaction([
    prisma.contact.updateMany({ where: { accountId: sourceAccountId }, data: { accountId: targetAccountId } }),
    prisma.facility.updateMany({ where: { accountId: sourceAccountId }, data: { accountId: targetAccountId } }),
    prisma.opportunity.updateMany({ where: { accountId: sourceAccountId }, data: { accountId: targetAccountId } }),
    prisma.task.updateMany({ where: { accountId: sourceAccountId }, data: { accountId: targetAccountId } }),
    prisma.note.updateMany({ where: { accountId: sourceAccountId }, data: { accountId: targetAccountId } }),
    prisma.activity.updateMany({ where: { accountId: sourceAccountId }, data: { accountId: targetAccountId } }),
    prisma.outreachDraft.updateMany({ where: { accountId: sourceAccountId }, data: { accountId: targetAccountId } }),
    prisma.outreachMessage.updateMany({ where: { accountId: sourceAccountId }, data: { accountId: targetAccountId } }),
    prisma.emailThread.updateMany({ where: { accountId: sourceAccountId }, data: { accountId: targetAccountId } }),
    prisma.reply.updateMany({ where: { accountId: sourceAccountId }, data: { accountId: targetAccountId } }),
    prisma.laneAccount.deleteMany({ where: { accountId: sourceAccountId } }), // avoid unique-constraint collisions; lane frequency stays on lane itself
    prisma.account.update({ where: { id: sourceAccountId }, data: { deletedAt: new Date() } }),
    prisma.accountMerge.create({ data: { targetAccountId, sourceAccountId, mergedById: user.id } }),
  ]);

  await logActivity({ type: "ACCOUNT_MERGED", summary: "Duplicate account merged in", accountId: targetAccountId, actorId: user.id });
  revalidatePath("/accounts");
  revalidatePath(`/accounts/${targetAccountId}`);
}

export async function addNote(input: {
  body: string;
  accountId?: string;
  contactId?: string;
  laneId?: string;
  facilityId?: string;
  opportunityId?: string;
}) {
  const user = await requireUser();
  const note = await prisma.note.create({ data: { ...input, authorId: user.id } });
  await logActivity({
    type: "NOTE_ADDED",
    summary: input.body.slice(0, 80),
    accountId: input.accountId,
    contactId: input.contactId,
    laneId: input.laneId,
    facilityId: input.facilityId,
    opportunityId: input.opportunityId,
    actorId: user.id,
  });
  if (input.accountId) revalidatePath(`/accounts/${input.accountId}`);
  if (input.contactId) revalidatePath(`/contacts/${input.contactId}`);
  return note;
}
