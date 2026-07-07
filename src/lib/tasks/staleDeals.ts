import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity/log";
import type { PipelineStage } from "@prisma/client";

const STALE_STAGES: PipelineStage[] = ["RESEARCHING", "CONTACT_FOUND"];
export const DEFAULT_STALE_THRESHOLD_DAYS = 7;

export interface StaleAccount {
  id: string;
  name: string;
  pipelineStage: string;
  daysSinceActivity: number;
}

/**
 * Stale-deal auto-escalation (recommendation #6). Right now nothing forces
 * a stuck deal back into someone's queue — an account can sit in
 * Researching/Contact Found indefinitely with no task ever firing. This
 * finds those and (via escalateStaleAccounts) creates a follow-up task so
 * they can't be silently forgotten.
 */
export async function findStaleAccounts(thresholdDays = DEFAULT_STALE_THRESHOLD_DAYS): Promise<StaleAccount[]> {
  const cutoff = new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000);
  const accounts = await prisma.account.findMany({
    where: {
      deletedAt: null,
      pipelineStage: { in: STALE_STAGES },
      lastActivityAt: { lte: cutoff },
    },
    select: { id: true, name: true, pipelineStage: true, lastActivityAt: true },
  });

  return accounts.map((a) => ({
    id: a.id,
    name: a.name,
    pipelineStage: a.pipelineStage,
    daysSinceActivity: Math.floor((Date.now() - a.lastActivityAt.getTime()) / (24 * 60 * 60 * 1000)),
  }));
}

export interface EscalateStaleResult {
  scanned: number;
  escalated: number;
}

/** Creates (or skips, if one's already open) a FOLLOW_UP task for each stale account. */
export async function escalateStaleAccounts(thresholdDays = DEFAULT_STALE_THRESHOLD_DAYS): Promise<EscalateStaleResult> {
  const stale = await findStaleAccounts(thresholdDays);
  let escalated = 0;

  for (const account of stale) {
    const existingOpen = await prisma.task.findFirst({
      where: {
        accountId: account.id,
        taskType: "FOLLOW_UP",
        status: { in: ["OPEN", "IN_PROGRESS"] },
        description: { contains: "Stale account" },
      },
    });
    if (existingOpen) continue;

    const priority = account.daysSinceActivity >= 21 ? "URGENT" : account.daysSinceActivity >= 14 ? "HIGH" : "MEDIUM";

    await prisma.task.create({
      data: {
        title: `Stale deal — no activity in ${account.daysSinceActivity}d`,
        description: `Stale account: ${account.name} has been in ${account.pipelineStage} for ${account.daysSinceActivity} days with no recorded activity.`,
        taskType: "FOLLOW_UP",
        priority,
        dueDate: new Date(),
        accountId: account.id,
        status: "OPEN",
      },
    });

    await logActivity({
      type: "TASK_CREATED",
      summary: `Stale-deal escalation — ${account.daysSinceActivity} days with no activity`,
      accountId: account.id,
    });

    escalated++;
  }

  return { scanned: stale.length, escalated };
}
