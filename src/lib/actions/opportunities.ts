"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity/log";
import { onArchiveAccount } from "@/lib/tasks/autoTasks";
import { revalidatePath } from "next/cache";
import type { PipelineStage } from "@prisma/client";

export async function changeOpportunityStage(id: string, toStage: PipelineStage, lostReason?: string | null) {
  const user = await requireUser();
  const opportunity = await prisma.opportunity.findUniqueOrThrow({ where: { id } });

  await prisma.opportunity.update({
    where: { id },
    data: { stage: toStage, lostReason: toStage === "LOST" ? lostReason ?? null : null },
  });
  await prisma.stageHistory.create({
    data: { opportunityId: id, fromStage: opportunity.stage, toStage, changedById: user.id, note: lostReason ?? null },
  });
  await prisma.account.update({ where: { id: opportunity.accountId }, data: { pipelineStage: toStage, lastActivityAt: new Date() } });
  await logActivity({
    type: "STAGE_CHANGED",
    summary: `Moved from ${opportunity.stage.replaceAll("_", " ")} to ${toStage.replaceAll("_", " ")}`,
    accountId: opportunity.accountId,
    opportunityId: id,
    actorId: user.id,
  });

  if (toStage === "ARCHIVED") {
    await onArchiveAccount(opportunity.accountId);
  }

  revalidatePath("/pipeline");
  revalidatePath(`/accounts/${opportunity.accountId}`);
  revalidatePath("/dashboard");
}

export async function createOpportunity(input: { accountId: string; contactId?: string | null; laneId?: string | null }) {
  const user = await requireUser();
  const opportunity = await prisma.opportunity.create({
    data: { accountId: input.accountId, contactId: input.contactId || null, laneId: input.laneId || null, stage: "NEW_FROM_UPLOAD", ownerId: user.id },
  });
  await prisma.stageHistory.create({ data: { opportunityId: opportunity.id, toStage: "NEW_FROM_UPLOAD", changedById: user.id } });
  revalidatePath("/pipeline");
  return opportunity;
}
