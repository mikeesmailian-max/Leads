import { getDashboardData } from "@/lib/dashboard/queries";
import { KPICard } from "@/components/dashboard/KPICard";
import { WorkQueue } from "@/components/dashboard/WorkQueue";
import { PipelineFunnel } from "@/components/dashboard/PipelineFunnel";
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

export default async function DashboardPage() {
  const data = await getDashboardData();
  const { kpis, stageGroups, topLanes, topCompanies, queues } = data;

  const maxCompanyCount = Math.max(1, ...topCompanies.map((c) => c.count));
  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Dashboard</h2>
          <p className="text-sm text-slate-500">What needs your attention right now.</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          Live &middot; updated {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      <PipelineFunnel stageGroups={stageGroups} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-8">
        <KPICard label="Awaiting Review" value={kpis.uploadsAwaitingReview} icon={Upload} tone="amber" href="/uploads?filter=needs_review" />
        <KPICard label="Parsed Today" value={kpis.parsedToday} icon={FileCheck2} tone="blue" href="/uploads" hint={`${kpis.parsedWeek} wk · ${kpis.parsedMonth} mo`} />
        <KPICard label="New Accounts" value={kpis.newAccounts7d} icon={Building2} tone="green" href="/accounts" hint="Last 7 days" />
        <KPICard label="New Contacts" value={kpis.newContacts7d} icon={Users} tone="green" href="/contacts" hint="Last 7 days" />
        <KPICard label="Need Verification" value={kpis.contactsNeedingVerification} icon={ShieldQuestion} tone="amber" href="/contacts?verification=UNVERIFIED" />
        <KPICard label="Drafts Ready" value={kpis.draftsReady} icon={Send} tone="blue" href="/outreach?status=READY_TO_SEND" />
        <KPICard label="Follow-ups Due" value={kpis.followUpsDueToday} icon={CalendarClock} tone="red" href="/tasks?filter=due_today" urgent />
        <KPICard label="Replies to Review" value={kpis.repliesWaitingReview} icon={Inbox} tone="amber" href="/replies" urgent />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
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
              { label: "Stale deals (7d+ no activity)", count: queues.staleAccountsCount, href: "/accounts", urgent: queues.staleAccountsCount > 0 },
            ]}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Top Recurring Lanes</CardTitle>
          </CardHeader>
          <CardBody>
            {topLanes.length === 0 ? (
              <EmptyState icon={Route} title="No lanes discovered yet" description="Upload rate confirmations to start building lane intelligence." />
            ) : (
              <ul className="space-y-1">
                {topLanes.map((lane, i) => {
                  const maxFreq = Math.max(1, ...topLanes.map((l) => l.frequencyCount));
                  const pct = Math.round((lane.frequencyCount / maxFreq) * 100);
                  return (
                    <li key={lane.id}>
                      <Link
                        href={`/lanes/${lane.id}`}
                        className="group relative block overflow-hidden rounded-lg px-2 py-2 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      >
                        <span
                          className="absolute inset-y-0 left-0 bg-brand-50 transition-all duration-300 dark:bg-brand-950/40"
                          style={{ width: `${pct}%` }}
                        />
                        <span className="relative flex items-center justify-between">
                          <span className="flex items-center gap-2 truncate text-slate-700 dark:text-slate-300">
                            <span className="text-xs font-semibold text-slate-300 dark:text-slate-600">{i + 1}</span>
                            <span className="truncate">{lane.label}</span>
                          </span>
                          <span className="ml-2 shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 group-hover:bg-brand-100 group-hover:text-brand-700 dark:bg-slate-800 dark:text-slate-300">
                            {lane.frequencyCount}×
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
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
              {topCompanies.map(({ account, count }, i) => (
                <li key={account!.id}>
                  <Link
                    href={`/accounts/${account!.id}`}
                    className="group relative flex items-center gap-3 overflow-hidden rounded-lg border border-slate-100 px-3 py-2 text-sm transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-sm dark:border-slate-800"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[11px] font-bold text-slate-500 group-hover:bg-brand-100 group-hover:text-brand-700 dark:bg-slate-800 dark:text-slate-400">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-slate-700 dark:text-slate-300">{account!.name}</span>
                      <span className="mt-0.5 block h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <span
                          className="block h-full rounded-full bg-brand-400"
                          style={{ width: `${Math.round((count / maxCompanyCount) * 100)}%` }}
                        />
                      </span>
                    </span>
                    <span className="ml-2 shrink-0 text-xs font-medium text-slate-400">{count} doc{count !== 1 ? "s" : ""}</span>
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
