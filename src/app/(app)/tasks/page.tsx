import { prisma } from "@/lib/db";
import Link from "next/link";
import { TaskFormModal } from "@/components/tasks/TaskFormModal";
import { TaskCheckbox } from "@/components/tasks/TaskCheckbox";
import { PriorityChip } from "@/components/ui/StatusChip";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListChecks } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const VIEWS = [
  { key: "due_today", label: "Due Today" },
  { key: "overdue", label: "Overdue" },
  { key: "high_priority", label: "High Priority" },
  { key: "waiting_reply", label: "Waiting on Reply" },
  { key: "quote_followup", label: "Quote Follow-up" },
  { key: "all", label: "All Open" },
  { key: "completed", label: "Completed" },
];

export default async function TasksPage({ searchParams }: { searchParams: { view?: string; filter?: string } }) {
  const view = searchParams.filter === "due_today" ? "due_today" : searchParams.view ?? "all";
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const where: Prisma.TaskWhereInput = { deletedAt: null };
  if (view === "due_today") where.AND = [{ status: { in: ["OPEN", "IN_PROGRESS"] } }, { dueDate: { gte: todayStart, lte: todayEnd } }];
  else if (view === "overdue") where.AND = [{ status: { in: ["OPEN", "IN_PROGRESS"] } }, { dueDate: { lt: todayStart } }];
  else if (view === "high_priority") where.AND = [{ status: { in: ["OPEN", "IN_PROGRESS"] } }, { priority: { in: ["HIGH", "URGENT"] } }];
  else if (view === "waiting_reply") where.AND = [{ status: { in: ["OPEN", "IN_PROGRESS"] } }, { taskType: "FOLLOW_UP" }];
  else if (view === "quote_followup") where.AND = [{ status: { in: ["OPEN", "IN_PROGRESS"] } }, { taskType: "MOVE_TO_QUOTE" }];
  else if (view === "completed") where.status = "DONE";
  else where.status = { in: ["OPEN", "IN_PROGRESS"] };

  const [tasks, accounts] = await Promise.all([
    prisma.task.findMany({
      where,
      include: { account: true, contact: true },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
      take: 300,
    }),
    prisma.account.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 500 }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Tasks</h2>
          <p className="text-sm text-slate-500">Auto-created follow-ups plus anything you add manually.</p>
        </div>
        <TaskFormModal accounts={accounts} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={`/tasks?view=${v.key}`}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              view === v.key
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300",
            )}
          >
            {v.label}
          </Link>
        ))}
      </div>

      {tasks.length === 0 ? (
        <EmptyState icon={ListChecks} title="Nothing here" description="You're all caught up for this view." />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {tasks.map((t) => {
            const overdue = t.dueDate && t.dueDate < todayStart && t.status !== "DONE";
            return (
              <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                <TaskCheckbox taskId={t.id} done={t.status === "DONE"} />
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate text-sm font-medium text-slate-800 dark:text-slate-200", t.status === "DONE" && "text-slate-400 line-through")}>
                    {t.title}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {t.account && (
                      <Link href={`/accounts/${t.account.id}`} className="hover:text-brand-600">
                        {t.account.name}
                      </Link>
                    )}
                    {t.contact && ` · ${t.contact.fullName}`}
                    {t.taskType && ` · ${t.taskType.replaceAll("_", " ")}`}
                  </p>
                </div>
                <PriorityChip priority={t.priority} />
                <span className={cn("w-20 shrink-0 text-right text-xs", overdue ? "font-semibold text-red-600" : "text-slate-400")}>
                  {t.dueDate ? formatDate(t.dueDate) : "No due date"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
