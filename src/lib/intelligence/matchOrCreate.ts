import { prisma } from "@/lib/db";
import { findAccountMatches } from "@/lib/dedupe/accountDedupe";
import { normalizeCompanyName, extractDomain } from "@/lib/dedupe/normalize";
import type { AccountType, EquipmentType } from "@prisma/client";

const AUTO_MATCH_THRESHOLD = 0.9;

/**
 * Finds a high-confidence existing Account or creates a new one.
 * Returns `{ created: true }` when a brand-new prospect record was made so
 * callers can log the right activity type / surface "new account discovered".
 */
export async function matchOrCreateAccount(opts: {
  rawName: string;
  type: AccountType;
  sourceDocumentId?: string | null;
  emailForDomain?: string | null;
}): Promise<{ account: Awaited<ReturnType<typeof prisma.account.create>>; created: boolean }> {
  const name = opts.rawName.trim();
  const domain = extractDomain(opts.emailForDomain ?? undefined);
  const matches = await findAccountMatches(name, domain);
  const best = matches[0];

  if (best && best.score >= AUTO_MATCH_THRESHOLD) {
    // Keep last-activity fresh; don't downgrade an existing pipeline stage.
    const updated = await prisma.account.update({
      where: { id: best.account.id },
      data: { lastActivityAt: new Date() },
    });
    return { account: updated, created: false };
  }

  const created = await prisma.account.create({
    data: {
      name,
      normalizedName: normalizeCompanyName(name),
      domain,
      type: opts.type,
      source: opts.sourceDocumentId ? "Uploaded document" : "Manual entry",
      sourceDocumentId: opts.sourceDocumentId ?? null,
      pipelineStage: "NEW_FROM_UPLOAD",
    },
  });
  return { account: created, created: true };
}

export async function matchOrCreateFacility(opts: {
  name?: string | null;
  accountId?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  address?: string | null;
}) {
  const name = opts.name?.trim() || [opts.city, opts.state].filter(Boolean).join(", ") || "Unknown Facility";

  const existing = opts.accountId
    ? await prisma.facility.findFirst({
        where: {
          accountId: opts.accountId,
          city: opts.city ?? undefined,
          state: opts.state ?? undefined,
          deletedAt: null,
        },
      })
    : null;

  if (existing) return { facility: existing, created: false };

  const facility = await prisma.facility.create({
    data: {
      name,
      accountId: opts.accountId ?? null,
      city: opts.city ?? null,
      state: opts.state ?? null,
      zip: opts.zip ?? null,
      addressLine1: opts.address ?? null,
      facilityType: "OTHER",
    },
  });
  return { facility, created: true };
}

export async function matchOrCreateLane(opts: {
  originCity?: string | null;
  originState?: string | null;
  destCity?: string | null;
  destState?: string | null;
  equipmentType?: EquipmentType | null;
  commodity?: string | null;
}) {
  const { laneLabel } = await import("@/lib/dedupe/normalize");
  const label = laneLabel(opts.originCity ?? null, opts.originState ?? null, opts.destCity ?? null, opts.destState ?? null);

  const existing = await prisma.lane.findFirst({
    where: {
      originCity: opts.originCity ?? null,
      originState: opts.originState ?? null,
      destCity: opts.destCity ?? null,
      destState: opts.destState ?? null,
      deletedAt: null,
    },
  });

  if (existing) {
    const updated = await prisma.lane.update({
      where: { id: existing.id },
      data: {
        frequencyCount: { increment: 1 },
        equipmentType: opts.equipmentType ?? existing.equipmentType,
        commodityClues: opts.commodity
          ? Array.from(new Set([...(existing.commodityClues ?? "").split(",").filter(Boolean), opts.commodity])).join(",")
          : existing.commodityClues,
      },
    });
    return { lane: updated, created: false };
  }

  const lane = await prisma.lane.create({
    data: {
      label,
      originCity: opts.originCity ?? null,
      originState: opts.originState ?? null,
      destCity: opts.destCity ?? null,
      destState: opts.destState ?? null,
      equipmentType: opts.equipmentType ?? null,
      commodityClues: opts.commodity ?? null,
      frequencyCount: 1,
      suggestedAngle: buildSuggestedAngle(opts),
    },
  });
  return { lane, created: true };
}

function buildSuggestedAngle(opts: {
  originCity?: string | null;
  originState?: string | null;
  destCity?: string | null;
  destState?: string | null;
  equipmentType?: EquipmentType | null;
}): string {
  const region = [opts.originState, opts.destState].filter(Boolean).join("/");
  const equip = opts.equipmentType === "REEFER" ? "reefer" : opts.equipmentType === "DRY_VAN" ? "dry van" : "freight";
  return `We noticed activity on this lane and support ${equip} coverage${region ? ` in the ${region} corridor` : ""}.`;
}
