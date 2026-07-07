import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { StageChip } from "@/components/ui/StatusChip";
import { SuggestedAngleEditor } from "@/components/lanes/SuggestedAngleEditor";
import { NoteForm } from "@/components/notes/NoteForm";
import { Timeline } from "@/components/timeline/Timeline";
import { LaneOverlapPanel } from "@/components/prospecting/LaneOverlapPanel";
import { getIntegrationStatus } from "@/lib/integrations/status";
import { FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LaneDetailPage({ params }: { params: { id: string } }) {
  const lane = await prisma.lane.findUnique({
    where: { id: params.id },
    include: {
      accounts: { include: { account: true } },
      facilities: { include: { facility: true } },
      opportunities: { include: { account: true } },
      documentParses: { include: { document: true } },
      notes: { include: { author: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!lane) notFound();
  const integrations = getIntegrationStatus();

  const activities = await prisma.activity.findMany({ where: { laneId: lane.id }, include: { actor: true }, orderBy: { createdAt: "desc" }, take: 40 });
  const timelineEntries = [
    ...activities.map((a) => ({ id: a.id, type: a.type, summary: a.summary, createdAt: a.createdAt, actorName: a.actor?.name })),
    ...lane.notes.map((n) => ({ id: n.id, type: "NOTE" as const, summary: n.body, createdAt: n.createdAt, actorName: n.author?.name })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">{lane.label}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {lane.equipmentType?.replaceAll("_", " ") ?? "Equipment unknown"} · seen {lane.frequencyCount}× in uploaded documents
          {lane.commodityClues && ` · commodity: ${lane.commodityClues}`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Suggested Outreach Angle</CardTitle>
            </CardHeader>
            <CardBody>
              <SuggestedAngleEditor laneId={lane.id} initial={lane.suggestedAngle ?? ""} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Related Accounts</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2">
              {lane.accounts.length === 0 && <p className="text-sm text-slate-400">No accounts linked yet.</p>}
              {lane.accounts.map(({ account }) => (
                <Link key={account.id} href={`/accounts/${account.id}`} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-slate-300 dark:border-slate-800">
                  <span>{account.name}</span>
                  <span className="text-xs text-slate-400">{account.type}</span>
                </Link>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prospects on this Lane</CardTitle>
            </CardHeader>
            <CardBody>
              <LaneOverlapPanel laneId={lane.id} apolloConfigured={integrations.apolloEnrichment} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Opportunities on this Lane</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2">
              {lane.opportunities.length === 0 && <p className="text-sm text-slate-400">No opportunities yet.</p>}
              {lane.opportunities.map((o) => (
                <Link key={o.id} href={`/accounts/${o.accountId}`} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-slate-300 dark:border-slate-800">
                  <span>{o.account.name}</span>
                  <StageChip stage={o.stage} />
                </Link>
              ))}
            </CardBody>
          </Card>

          {lane.documentParses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Source Documents</CardTitle>
              </CardHeader>
              <CardBody className="space-y-2">
                {lane.documentParses.map((p) => (
                  <Link key={p.id} href={`/uploads/${p.documentId}`} className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-slate-300 dark:border-slate-800">
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    {p.document.originalFilename}
                  </Link>
                ))}
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardBody>
              <NoteForm laneId={lane.id} />
              <div className="mt-4">
                <Timeline entries={timelineEntries} />
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
