import { getAnalyticsData } from "@/lib/analytics/queries";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { KPICard } from "@/components/dashboard/KPICard";
import { UploadsChart } from "@/components/analytics/UploadsChart";
import { STYLE_LABELS } from "@/lib/outreach/templates";
import { relativeTime } from "@/lib/utils";
import Link from "next/link";
import { Send, MessageSquare, ShieldCheck, CalendarClock, TrendingUp } from "lucide-react";

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

export default async function AnalyticsPage() {
  const data = await getAnalyticsData();
  const maxStage = Math.max(1, ...data.opportunitiesByStage.map((s) => s._count._all));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Analytics</h2>
        <p className="text-sm text-slate-500">The numbers that actually matter for freight prospecting — not vanity metrics.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KPICard label="Drafts Created" value={data.draftsCreated} icon={Send} />
        <KPICard label="Emails Sent" value={data.emailsSent} icon={Send} tone="blue" />
        <KPICard label="Replies Received" value={data.repliesReceived} icon={MessageSquare} tone="blue" />
        <KPICard label="Positive Reply Rate" value={`${Math.round(data.positiveReplyRate * 100)}%`} icon={TrendingUp} tone="green" />
        <KPICard label="Contact Verification Rate" value={`${Math.round(data.contactVerificationRate * 100)}%`} icon={ShieldCheck} tone="green" />
        <KPICard label="Follow-up Compliance" value={`${Math.round(data.followUpCompliance * 100)}%`} icon={CalendarClock} tone="amber" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Uploads — Last 14 Days</CardTitle>
        </CardHeader>
        <CardBody>
          <UploadsChart data={data.uploadsByDay} />
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Conversion by Stage</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {data.opportunitiesByStage
              .sort((a, b) => b._count._all - a._count._all)
              .map((s) => (
                <div key={s.stage}>
                  <div className="mb-0.5 flex justify-between text-xs">
                    <span className="text-slate-500">{STAGE_LABELS[s.stage] ?? s.stage}</span>
                    <span className="font-medium text-slate-600">{s._count._all}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${(s._count._all / maxStage) * 100}%` }} />
                  </div>
                </div>
              ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Best-Performing Outreach Style</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {data.outreachPerformance.length === 0 && <p className="text-sm text-slate-400">Not enough sent outreach yet.</p>}
            {data.outreachPerformance
              .sort((a, b) => b.rate - a.rate)
              .map((s) => (
                <div key={s.style} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">{STYLE_LABELS[s.style as keyof typeof STYLE_LABELS] ?? s.style}</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {Math.round(s.rate * 100)}% <span className="text-xs text-slate-400">({s.sent} sent)</span>
                  </span>
                </div>
              ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Recurring Lanes</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {data.topLanes.map((l) => (
              <Link key={l.id} href={`/lanes/${l.id}`} className="flex items-center justify-between text-sm hover:text-brand-600">
                <span className="text-slate-600 dark:text-slate-400">{l.label}</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{l.frequencyCount}×</span>
              </Link>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Companies by Contact Count</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {data.topIndustryAccounts.map((a) => (
              <Link key={a.id} href={`/accounts/${a.id}`} className="flex items-center justify-between text-sm hover:text-brand-600">
                <span className="text-slate-600 dark:text-slate-400">
                  {a.name} {a.industry && <span className="text-xs text-slate-400">({a.industry})</span>}
                </span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{a._count.contacts}</span>
              </Link>
            ))}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accounts Untouched 14+ Days (Needs Attention)</CardTitle>
        </CardHeader>
        <CardBody className="space-y-2">
          {data.staleAccounts.length === 0 && <p className="text-sm text-slate-400">Nothing stale — good pipeline hygiene.</p>}
          {data.staleAccounts.map((a) => (
            <Link key={a.id} href={`/accounts/${a.id}`} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-slate-300 dark:border-slate-800">
              <span className="text-slate-700 dark:text-slate-300">{a.name}</span>
              <span className="text-xs text-amber-600">Last activity {relativeTime(a.lastActivityAt)}</span>
            </Link>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
