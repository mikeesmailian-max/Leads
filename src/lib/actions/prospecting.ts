"use server";

import { requireUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { runIcpSourcing, getIcpProfile, type IcpProfile } from "@/lib/prospecting/icpSourcing";
import { findLaneOverlapProspects, addLaneOverlapProspect } from "@/lib/prospecting/laneOverlap";
import { parseBulkImportText, importBulkAccounts } from "@/lib/prospecting/bulkImport";
import { checkHiringSignal } from "@/lib/prospecting/hiringSignals";
import { prisma } from "@/lib/db";
import type { ApolloOrgResult } from "@/lib/prospecting/apolloOrgs";
import type { ImportSourceType } from "@prisma/client";

export async function runIcpSourcingAction() {
  const user = await requireUser();
  const result = await runIcpSourcing(user.id);
  revalidatePath("/accounts");
  revalidatePath("/prospecting");
  return result;
}

export async function updateIcpProfileAction(profile: IcpProfile) {
  await requireUser();
  await prisma.setting.upsert({
    where: { key: "prospecting.icp" },
    create: { key: "prospecting.icp", value: profile as any },
    update: { value: profile as any },
  });
  revalidatePath("/prospecting");
}

export async function findLaneOverlapProspectsAction(laneId: string) {
  await requireUser();
  return findLaneOverlapProspects(laneId);
}

export async function addLaneOverlapProspectAction(laneId: string, candidate: ApolloOrgResult) {
  const user = await requireUser();
  const account = await addLaneOverlapProspect(laneId, candidate, user.id);
  revalidatePath(`/lanes/${laneId}`);
  revalidatePath("/accounts");
  return account;
}

export async function bulkImportAction(input: { label: string; sourceType: ImportSourceType; text: string }) {
  const user = await requireUser();
  const rows = parseBulkImportText(input.text);
  const result = await importBulkAccounts({ label: input.label, sourceType: input.sourceType, rows, actorId: user.id });
  revalidatePath("/prospecting");
  revalidatePath("/accounts");
  return result;
}

export async function checkHiringSignalAction(accountId: string) {
  const user = await requireUser();
  const result = await checkHiringSignal(accountId);
  revalidatePath(`/accounts/${accountId}`);
  return result;
}
