"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { scoreContact } from "@/lib/scoring/contactScoring";
import { getScoringWeights } from "@/lib/scoring/getWeights";
import { extractDomain } from "@/lib/dedupe/normalize";
import { logActivity } from "@/lib/activity/log";
import { revalidatePath } from "next/cache";
import type { ContactStatus, VerificationStatus } from "@prisma/client";

export interface ContactInput {
  accountId?: string | null;
  facilityId?: string | null;
  fullName: string;
  title?: string | null;
  department?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
  internalNotes?: string | null;
  ownerId?: string | null;
}

export async function createContact(input: ContactInput) {
  const user = await requireUser();
  const account = input.accountId ? await prisma.account.findUnique({ where: { id: input.accountId } }) : null;
  const weights = await getScoringWeights();
  const { confidence } = scoreContact({
    fullName: input.fullName,
    title: input.title,
    email: input.email,
    accountDomain: account?.domain ?? extractDomain(input.email),
    source: "manual",
    facilityId: input.facilityId,
  }, weights);

  const parts = input.fullName.trim().split(/\s+/);
  const contact = await prisma.contact.create({
    data: {
      accountId: input.accountId || null,
      facilityId: input.facilityId || null,
      fullName: input.fullName,
      firstName: parts[0] ?? null,
      lastName: parts.slice(1).join(" ") || null,
      title: input.title || null,
      department: input.department || null,
      email: input.email || null,
      phone: input.phone || null,
      linkedinUrl: input.linkedinUrl || null,
      internalNotes: input.internalNotes || null,
      confidenceScore: confidence,
      source: "manual",
      status: "NEW",
      ownerId: input.ownerId || user.id,
    },
  });
  await logActivity({ type: "CONTACT_DISCOVERED", summary: `Contact added manually: ${contact.fullName}`, contactId: contact.id, accountId: contact.accountId, actorId: user.id });
  if (input.accountId) revalidatePath(`/accounts/${input.accountId}`);
  revalidatePath("/contacts");
  return contact;
}

export async function updateContact(id: string, input: Partial<ContactInput>) {
  const user = await requireUser();
  const existing = await prisma.contact.findUniqueOrThrow({ where: { id } });
  const account = input.accountId !== undefined
    ? input.accountId ? await prisma.account.findUnique({ where: { id: input.accountId } }) : null
    : existing.accountId ? await prisma.account.findUnique({ where: { id: existing.accountId } }) : null;

  const weights = await getScoringWeights();
  const { confidence } = scoreContact({
    fullName: input.fullName ?? existing.fullName,
    title: input.title ?? existing.title,
    email: input.email ?? existing.email,
    accountDomain: account?.domain ?? extractDomain(input.email ?? existing.email),
    source: existing.source,
    facilityId: input.facilityId ?? existing.facilityId,
    foundInDocument: existing.source === "document",
  }, weights);

  const contact = await prisma.contact.update({
    where: { id },
    data: { ...input, confidenceScore: confidence },
  });
  await logActivity({ type: "UPDATED", summary: "Contact details updated", contactId: id, accountId: contact.accountId, actorId: user.id });
  revalidatePath(`/contacts/${id}`);
  revalidatePath("/contacts");
  return contact;
}

export async function setVerificationStatus(id: string, status: VerificationStatus) {
  const user = await requireUser();
  const contact = await prisma.contact.update({
    where: { id },
    data: { verificationStatus: status, status: status === "VERIFIED" ? "VERIFIED" : undefined },
  });
  await logActivity({
    type: "CONTACT_VERIFIED",
    summary: `Marked as ${status.toLowerCase()}`,
    contactId: id,
    accountId: contact.accountId,
    actorId: user.id,
  });
  revalidatePath(`/contacts/${id}`);
  revalidatePath("/contacts");
}

export async function setContactStatus(id: string, status: ContactStatus) {
  await requireUser();
  const contact = await prisma.contact.update({ where: { id }, data: { status } });
  revalidatePath(`/contacts/${id}`);
  revalidatePath("/contacts");
  return contact;
}

export async function toggleDoNotContact(id: string, value: boolean) {
  await requireUser();
  await prisma.contact.update({ where: { id }, data: { doNotContact: value } });
  revalidatePath(`/contacts/${id}`);
}

export async function archiveContact(id: string) {
  const user = await requireUser();
  await prisma.contact.update({ where: { id }, data: { deletedAt: new Date(), status: "DEAD" } });
  await logActivity({ type: "UPDATED", summary: "Contact archived", contactId: id, actorId: user.id });
  revalidatePath("/contacts");
}
