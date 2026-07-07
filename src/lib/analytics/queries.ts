import { prisma } from "@/lib/db";
import { subDays, startOfDay, format } from "date-fns";

export async function getAnalyticsData() {
  const now = new Date();
  const fourteenDaysAgo = subDays(now, 14);
  const staleThreshold = subDays(now, 14);

  const [
    uploadsRaw,
    draftsCreated,
    emailsSent,
    repliesReceived,
    positiveReplies,
    contactsTotal,
    contactsVerified,
    tasksCompletedOnTime,
    tasksCompletedLate,
    topLanes,
    accountsBySource,
    contactCountsByAccount,
    opportunitiesByStage,
    stalAccounts,
    styleStats,
  ] = await Promise.all([
    prisma.document.findMany({ where: { createdAt: { gte: fourteenDaysAgo } }, select: { createdAt: true } }),
    prisma.outreachDraft.count(),
    prisma.outreachMessage.count({ where: { direction: "OUTBOUND", status: { in: ["SENT", "DELIVERED"] } } }),
    prisma.reply.count(),
    prisma.reply.count({ where: { category: { in: ["INTERESTED", "QUOTE_REQUEST"] } } }),
    prisma.contact.count({ where: { deletedAt: null } }),
    prisma.contact.count({ where: { deletedAt: null, verificationStatus: "VERIFIED" } }),
    prisma.task.count({ where: { status: "DONE", completedAt: { not: null }, dueDate: { not: null } } }),
    // approximate "late" as completedAt after dueDate
    prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*)::bigint as count FROM "Task" WHERE status = 'DONE' AND "completedAt" IS NOT NULL AND "dueDate" IS NOT NULL AND "completedAt" > "dueDate"`,
    ).catch(() => [{ count: 0n }]),
    prisma.lane.findMany({ where: { deletedAt: null }, orderBy: { frequencyCount: "desc" }, take: 8 }),
    prisma.account.groupBy({ by: ["source"], _count: { _all: true }, where: { deletedAt: null } }),
    prisma.account.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, industry: true, _count: { select: { contacts: true } } },
      orderBy: { contacts: { _count: "desc" } },
      take: 8,
    }),
    prisma.opportunity.groupBy({ by: ["stage"], _count: { _all: true }, where: { deletedAt: null } }),
    prisma.account.findMany({
      where: { deletedAt: null, lastActivityAt: { lt: staleThreshold }, pipelineStage: { notIn: ["WON", "LOST", "ARCHIVED", "CUSTOMER"] } },
      orderBy: { lastActivityAt: "asc" },
      take: 10,
    }),
    prisma.outreachDraft.findMany({ where: { status: { in: ["SENT"] } }, select: { style: true, accountId: true } }),
  ]);

  // uploads per day for last 14 days
  const dayBuckets: Record<string, number> = {};
  for (let i = 13; i >= 0; i--) {
    dayBuckets[format(startOfDay(subDays(now, i)), "MM/dd")] = 0;
  }
  for (const doc of uploadsRaw) {
    const key = format(startOfDay(doc.createdAt), "MM/dd");
    if (key in dayBuckets) dayBuckets[key]++;
  }
  const uploadsByDay = Object.entries(dayBuckets).map(([date, count]) => ({ date, count }));

  // best-performing outreach style: reply rate = replies from accounts that received that style / sent count of that style
  const sentByStyle: Record<string, number> = {};
  for (const d of styleStats) {
    sentByStyle[d.style] = (sentByStyle[d.style] ?? 0) + 1;
  }
  const repliesByAccount = await prisma.reply.findMany({ select: { accountId: true, category: true } });
  const positiveAccounts = new Set(repliesByAccount.filter((r) => r.category === "INTERESTED" || r.category === "QUOTE_REQUEST").map((r) => r.accountId));
  const styleAccounts: Record<string, Set<string>> = {};
  for (const d of styleStats) {
    styleAccounts[d.style] = styleAccounts[d.style] ?? new Set();
    if (d.accountId) styleAccounts[d.style].add(d.accountId);
  }
  const outreachPerformance = Object.entries(sentByStyle).map(([style, sent]) => {
    const accounts = styleAccounts[style] ?? new Set();
    const positive = [...accounts].filter((a) => positiveAccounts.has(a)).length;
    return { style, sent, positive, rate: accounts.size > 0 ? positive / accounts.size : 0 };
  });

  const followUpCompliance = tasksCompletedOnTime > 0 ? 1 - Number(tasksCompletedLate[0]?.count ?? 0) / tasksCompletedOnTime : 1;

  return {
    uploadsByDay,
    draftsCreated,
    emailsSent,
    repliesReceived,
    positiveReplyRate: emailsSent > 0 ? positiveReplies / emailsSent : 0,
    contactVerificationRate: contactsTotal > 0 ? contactsVerified / contactsTotal : 0,
    followUpCompliance: Math.max(0, Math.min(1, followUpCompliance)),
    topLanes,
    accountsBySource,
    topIndustryAccounts: contactCountsByAccount,
    opportunitiesByStage,
    staleAccounts: stalAccounts,
    outreachPerformance,
  };
}
