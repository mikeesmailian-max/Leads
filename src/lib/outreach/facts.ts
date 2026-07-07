import { prisma } from "@/lib/db";
import { computeLaneRateSuggestion } from "./rateQuote";

export interface OutreachFacts {
  accountName: string;
  accountType: string;
  region: string | null;
  equipmentFocus: string | null;
  industry: string | null;
  contactFirstName: string | null;
  contactTitle: string | null;
  laneLabel: string | null;
  laneEquipment: string | null;
  laneFrequencyCount: number | null;
  laneCommodity: string | null;
  priorOutreachCount: number;
  lastOutreachAt: Date | null;
  hasRepliedBefore: boolean;
  sourceIsDocument: boolean;
  suggestedRateText: string | null;
}

export interface SenderProfile {
  companyName: string;
  senderName: string;
  senderTitle: string;
  signatureBlock: string;
  regionalSpecialization: string; // e.g. "western states"
  equipmentLanguage: string; // e.g. "dry van and reefer"
  tone: "concise" | "warm" | "direct";
}

const DEFAULT_SENDER_PROFILE: SenderProfile = {
  companyName: "Mega Fleet Corp",
  senderName: "Mike",
  senderTitle: "Mega Fleet Corp",
  signatureBlock: "Mike\nMega Fleet Corp",
  regionalSpecialization: "western states",
  equipmentLanguage: "dry van and reefer",
  tone: "concise",
};

export async function getSenderProfile(): Promise<SenderProfile> {
  const setting = await prisma.setting.findUnique({ where: { key: "outreach.senderProfile" } });
  if (!setting) return DEFAULT_SENDER_PROFILE;
  return { ...DEFAULT_SENDER_PROFILE, ...(setting.value as Partial<SenderProfile>) };
}

/**
 * Pulls ONLY facts that actually exist in the database for a given account /
 * contact / lane combination. The generator is only ever allowed to use what
 * comes back from this function — nothing about volume, spend, or existing
 * relationships is ever invented downstream.
 */
export async function gatherFacts(
  accountId: string,
  contactId?: string | null,
  laneId?: string | null,
): Promise<OutreachFacts> {
  const account = await prisma.account.findUniqueOrThrow({ where: { id: accountId } });
  const contact = contactId ? await prisma.contact.findUnique({ where: { id: contactId } }) : null;
  const lane = laneId ? await prisma.lane.findUnique({ where: { id: laneId } }) : null;

  const priorMessages = await prisma.outreachMessage.findMany({
    where: { accountId, direction: "OUTBOUND" },
    orderBy: { createdAt: "desc" },
  });
  const priorReplies = await prisma.reply.count({ where: { accountId } });

  const rateSuggestion = laneId ? await computeLaneRateSuggestion(laneId) : null;
  const suggestedRateText = rateSuggestion
    ? `$${rateSuggestion.suggestedLinehaul.toLocaleString()} (${rateSuggestion.basis})`
    : null;

  return {
    accountName: account.name,
    accountType: account.type,
    region: account.region,
    equipmentFocus: account.equipmentFocus,
    industry: account.industry,
    contactFirstName: contact?.firstName ?? (contact?.fullName ? contact.fullName.split(" ")[0] : null),
    contactTitle: contact?.title ?? null,
    laneLabel: lane?.label ?? null,
    laneEquipment: lane?.equipmentType ?? null,
    laneFrequencyCount: lane?.frequencyCount ?? null,
    laneCommodity: lane?.commodityClues ?? null,
    priorOutreachCount: priorMessages.length,
    lastOutreachAt: priorMessages[0]?.createdAt ?? null,
    hasRepliedBefore: priorReplies > 0,
    sourceIsDocument: account.source === "Uploaded document",
    suggestedRateText,
  };
}
