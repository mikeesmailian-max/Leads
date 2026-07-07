import { prisma } from "@/lib/db";
import { startOfDay, startOfWeek, startOfMonth } from "date-fns";

export async function getDashboardData() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    uploadsAwaitingReview,
    parsedToday,
    parsedWeek,
    parsedMonth,
    newAccounts7d,
    newContacts7d,
    contactsNeedingVerification,
    draftsReady,
    followUpsDueToday,
    repliesWaitingReview,
    stageGroups,
    topLanes,
    needsOcrReview,
    needsCompanyMatch,
    needsContactSearch,
    needsDraftApproval,
    followUpDueCount,
    repliedInterestedCount,
    quoteRequestedCount,
    archivedDeadCount,
    topShipperGroups,
    staleAccountsCount,
  ] = await Promise.all([
    prisma.document.count({ where: { needsReview: true, status: { not: "APPROVED" } } }),
    prisma.document.count({ where: { status: { in: ["PARSED", "APPROVED"] }, createdAt: { gte: todayStart } } }),
    prisma.document.count({ where: { status: { in: ["PARSED", "APPROVED"] }, createdAt: { gte: weekStart } } }),
    prisma.document.count({ where: { status: { in: ["PARSED", "APPROVED"] }, createdAt: { gte: monthStart } } }),
    prisma.account.count({ where: { createdAt: { gte: sevenDaysAgo }, deletedAt: null } }),
    prisma.contact.count({ where: { createdAt: { gte: sevenDaysAgo }, deletedAt: null } }),
    prisma.contact.count({ where: { verificationStatus: { in: ["UNVERIFIED", "PENDING"] }, deletedAt: null, doNotContact: false } }),
    prisma.outreachDraft.count({ where: { status: { in: ["APPROVED", "READY_TO_SEND"] } } }),
    prisma.task.count({ where: { taskType: "FOLLOW_UP", status: { in: ["OPEN", "IN_PROGRESS"] }, dueDate: { lte: now } } }),
    prisma.reply.count({ where: { category: "UNKNOWN" } }),
    prisma.account.groupBy({ by: ["pipelineStage"], _count: { _all: true }, where: { deletedAt: null } }),
    prisma.lane.findMany({ where: { deletedAt: null }, orderBy: { frequencyCount: "desc" }, take: 6 }),
    prisma.document.count({ where: { needsReview: true, status: { not: "APPROVED" } } }),
    prisma.documentParse.count({ where: { isApproved: false } }),
    prisma.account.count({
      where: { pipelineStage: { in: ["NEW_FROM_UPLOAD", "RESEARCHING"] }, deletedAt: null, contacts: { none: {} } },
    }),
    prisma.task.count({ where: { taskType: "APPROVE_DRAFT", status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.task.count({ where: { taskType: "FOLLOW_UP", status: { in: ["OPEN", "IN_PROGRESS"] }, dueDate: { lte: now } } }),
    prisma.opportunity.count({ where: { stage: { in: ["REPLIED", "INTERESTED"] }, deletedAt: null } }),
    prisma.opportunity.count({ where: { stage: "QUOTING", deletedAt: null } }),
    prisma.opportunity.count({ where: { stage: { in: ["ARCHIVED", "LOST"] }, deletedAt: null } }),
    prisma.documentParse.groupBy({
      by: ["shipperAccountId"],
      _count: { _all: true },
      where: { shipperAccountId: { not: null } },
      orderBy: { _count: { shipperAccountId: "desc" } },
      take: 5,
    }),
    prisma.account.count({
      where: {
        deletedAt: null,
        pipelineStage: { in: ["RESEARCHING", "CONTACT_FOUND"] },
        lastActivityAt: { lte: sevenDaysAgo },
      },
    }),
  ]);

  const topShipperAccountIds = topShipperGroups.map((g) => g.shipperAccountId!).filter(Boolean);
  const topShipperAccounts = topShipperAccountIds.length
    ? await prisma.account.findMany({ where: { id: { in: topShipperAccountIds } } })
    : [];
  const topCompanies = topShipperGroups
    .map((g) => ({
      account: topShipperAccounts.find((a) => a.id === g.shipperAccountId),
      count: g._count._all,
    }))
    .filter((c) => c.account);

  return {
    kpis: {
      uploadsAwaitingReview,
      parsedToday,
      parsedWeek,
      parsedMonth,
      newAccounts7d,
      newContacts7d,
      contactsNeedingVerification,
      draftsReady,
      followUpsDueToday,
      repliesWaitingReview,
    },
    stageGroups,
    topLanes,
    topCompanies,
    queues: {
      needsOcrReview,
      needsCompanyMatch,
      needsContactSearch,
      needsDraftApproval,
      followUpDueCount,
      repliedInterestedCount,
      quoteRequestedCount,
      archivedDeadCount,
      staleAccountsCount,
    },
  };
}
