import { getDashboardData } from "@/lib/dashboard/queries";
import { KPICard } from "@/components/dashboard/KPICard";
import { WorkQueue } from "@/components/dashboard/WorkQueue";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Upload,
  FileCheck2,
  Building2,
  Users,
  ShieldQuestion,
  Send,
  CalendarClock,
  Inbox,
  Route,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STAGE_LABELS: Record<string, string> = {
  NEW_FROM_UPLOAD: "New From Upload",
  RESEARCHING: "Researching",
  CONTACT_FOUND: "Contact Found",
  DRAFT_READY: "Draft Ready",
  SENT: "Sent",
  REPLIED: "Replied",
  INTERESTED: "Interested",
  QUOTING: "Quoting",
  CUSTOMER: "Customer",
  WON: "Won",
  LOST: "Lost",
  ARCHIVED: "Archived",
};

export default async function DashboardPage() {
  const data = await getDashboardData();
  const { kpis, stageGroups, topLanes, topCompanies, queues } = data;

  const maxStageCount = Math.max(1, ...stageGroups.map((s) => s._count._all));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Dashboard</h2>
        <p className="text-sm text-slate-500">What needs your attention right now.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
        <KPICard label="Awaiting Review" value={kpis.uploadsAwaitingReview} icon={Upload} tone="amber" href="/uploads?filter=needs_review" />
        <KPICard label="Parsed Today" value={kpis.parsedToday} icon={FileCheck2} tone="blue" href="/uploads" hint={`${kpis.parsedWeek} this week · ${kpis.parsedMonth} this month`} />
        <KPICard label="New Accounts (7d)" value={kpis.newAccounts7d} icon={Building2} tone="green" href="/accounts" />
        <KPICard label="New Contacts (7d)" value={kpis.newContacts7d} icon={Users} tone="green" href="/contacts" />
        <KPICard label="Need Verification" value={kpis.contactsNeedingVerification} icon={ShieldQuestion} tone="amber" href="/contacts?verification=UNVERIFIED" />
        <KPICard label="Drafts Ready" value={kpis.draftsReady} icon={Send} tone="blue" href="/outreach?status=READY_TO_SEND" />
        <KPICard label="Follow-ups Due Today" value={kpis.followUpsDueToday} icon={CalendarClock} tone="red" href="/tasks?filter=due_today" />
        <KPICard label="Replies to Review" value={kpis.repliesWaitingReview} icon={Inbox} tone="amber" href="/replies" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <WorkQueue
          title="Work Queues"
          items={[
            { label: "Needs OCR review", count: queues.needsOcrReview, href: "/uploads?filter=needs_review", urgent: queues.needsOcrReview > 0 },
            { label: "Needs company match", count: queues.needsCompanyMatch, href: "/uploads?filter=needs_match" },
            { label: "Needs contact search", count: queues.needsContactSearch, href: "/accounts?filter=no_contacts" },
            { label: "Needs email draft approval", count: queues.needsDraftApproval, href: "/outreach?status=DRAFT" },
            { label: "Follow-up due", count: queues.followUpDueCount, href: "/tasks?filter=due_today", urgent: queues.followUpDueCount > 0 },
            { label: "Replied / interested", count: queues.repliedInterestedCount, href: "/pipeline?stage=INTERESTED" },
            { label: "Quote requested", count: queues.quoteRequestedCount, href: "/pipeline?stage=QUOTING" },
            { label: "Archived / dead", count: queues.archivedDeadCount, href: "/pipeline?stage=ARCHIVED" },
          ]}
        />

        <Card>
          <CardHeader>
            <CardTitle>Accounts by Stage</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {stageGroups.length === 0 && <p className="text-sm text-slate-400">No accounts yet.</p>}
            {stageGroups
              .sort((a, b) => b._count._all - a._count._all)
              .map((s) => (
                <Link
                  key={s.pipelineStage}
                  href={`/pipeline?stage=${s.pipelineStage}`}
                  className="block"
                >
                  <div className="mb-0.5 flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">{STAGE_LABELS[s.pipelineStage] ?? s.pipelineStage}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{s._count._all}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${(s._count._all / maxStageCount) * 100}%` }}
                    />
                  </div>
                </Link>
              ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Recurring Lanes</CardTitle>
          </CardHeader>
          <CardBody>
            {topLanes.length === 0 ? (
              <EmptyState icon={Route} title="No lanes discovered yet" description="Upload rate confirmations to start building lane intelligence." />
            ) : (
              <ul className="space-y-2">
                {topLanes.map((lane) => (
                  <li key={lane.id}>
                    <Link href={`/lanes/${lane.id}`} className="flex items-center justify-between text-sm hover:text-brand-600">
                      <span className="text-slate-700 dark:text-slate-300">{lane.label}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {lane.frequencyCount}×
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Most Frequent Companies in Uploaded Documents</CardTitle>
        </CardHeader>
        <CardBody>
          {topCompanies.length === 0 ? (
            <p className="text-sm text-slate-400">Nothing yet — upload a rate confirmation to get started.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {topCompanies.map(({ account, count }) => (
                <li key={account!.id}>
                  <Link
                    href={`/accounts/${account!.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-slate-300 dark:border-slate-800"
                  >
                    <span className="truncate text-slate-700 dark:text-slate-300">{account!.name}</span>
                    <span className="ml-2 shrink-0 text-xs text-slate-400">{count} doc{count !== 1 ? "s" : ""}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
