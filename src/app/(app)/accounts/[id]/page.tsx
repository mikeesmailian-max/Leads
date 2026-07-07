import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { StageChip, ContactStatusChip } from "@/components/ui/StatusChip";
import { StageSelect } from "@/components/accounts/StageSelect";
import { MergePanel } from "@/components/accounts/MergePanel";
import { AccountFormModal } from "@/components/accounts/AccountFormModal";
import { NoteForm } from "@/components/notes/NoteForm";
import { Timeline } from "@/components/timeline/Timeline";
import { getDuplicateCandidates } from "@/lib/actions/accounts";
import { formatDate, relativeTime, money } from "@/lib/utils";
import { Globe, MapPin, Truck, Send, FileText, Pencil, ShieldCheck } from "lucide-react";
import { EnrichButton } from "@/components/accounts/EnrichButton";
import { HiringSignalButton } from "@/components/accounts/HiringSignalButton";
import { getIntegrationStatus } from "@/lib/integrations/status";
import { Briefcase } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AccountDetailPage({ params }: { params: { id: string } }) {
  const account = await prisma.account.findUnique({
    where: { id: params.id },
    include: {
      owner: true,
      contacts: { where: { deletedAt: null }, orderBy: { confidenceScore: "desc" } },
      facilities: { where: { deletedAt: null } },
      laneLinks: { include: { lane: true } },
      opportunities: { where: { deletedAt: null }, include: { lane: true } },
      outreachDrafts: { orderBy: { createdAt: "desc" }, take: 5 },
      notes: { orderBy: { createdAt: "desc" }, include: { author: true } },
      parsesAsShipper: { include: { document: true } },
    },
  });
  if (!account) notFound();

  const [activities, duplicates] = await Promise.all([
    prisma.activity.findMany({ where: { accountId: account.id }, include: { actor: true }, orderBy: { createdAt: "desc" }, take: 40 }),
    getDuplicateCandidates(account.id),
  ]);
  const integrations = getIntegrationStatus();

  const timelineEntries = [
    ...activities.map((a) => ({ id: a.id, type: a.type, summary: a.summary, createdAt: a.createdAt, actorName: a.actor?.name })),
    ...account.notes.map((n) => ({ id: n.id, type: "NOTE" as const, summary: n.body, createdAt: n.createdAt, actorName: n.author?.name })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">{account.name}</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800">{account.type}</span>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            {account.website && (
              <a href={`https://${account.domain}`} target="_blank" className="flex items-center gap-1 hover:text-brand-600">
                <Globe className="h-3.5 w-3.5" /> {account.domain}
              </a>
            )}
            {account.region && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {account.region}
              </span>
            )}
            {account.equipmentFocus && (
              <span className="flex items-center gap-1">
                <Truck className="h-3.5 w-3.5" /> {account.equipmentFocus.replace("_", " ")}
              </span>
            )}
            <span>First seen {formatDate(account.firstSeenAt)}</span>
            {account.hiringSignalDetected && (
              <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" title={account.hiringSignalDetail ?? undefined}>
                <Briefcase className="h-3 w-3" /> Hiring signal
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StageSelect accountId={account.id} currentStage={account.pipelineStage} />
          <AccountFormModal
            account={{
              id: account.id,
              name: account.name,
              website: account.website,
              type: account.type,
              industry: account.industry,
              region: account.region,
              equipmentFocus: account.equipmentFocus,
              internalNotes: account.internalNotes,
            }}
            trigger={
              <button className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            }
          />
          <Link
            href={`/outreach/new?accountId=${account.id}`}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Send className="h-3.5 w-3.5" /> Draft Outreach
          </Link>
        </div>
      </div>

      {duplicates.length > 0 && <MergePanel accountId={account.id} candidates={duplicates.map((d) => ({ id: d.account.id, name: d.account.name, type: d.account.type, score: d.score, reason: d.reason }))} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Contacts ({account.contacts.length})</CardTitle>
              <div className="flex items-center gap-2">
                <EnrichButton accountId={account.id} hasDomain={Boolean(account.domain)} apolloConfigured={integrations.apolloEnrichment} />
                <HiringSignalButton accountId={account.id} hasApolloOrgId={Boolean(account.apolloOrgId)} apolloConfigured={integrations.apolloEnrichment} />
              </div>
            </CardHeader>
            <CardBody className="space-y-2">
              {account.contacts.length === 0 && <p className="text-sm text-slate-400">No contacts found yet.</p>}
              {account.contacts.map((c) => (
                <Link
                  key={c.id}
                  href={`/contacts/${c.id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-slate-300 dark:border-slate-800"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{c.fullName}</span>
                    {c.title && <span className="text-slate-400">{c.title}</span>}
                    {c.isDecisionMaker && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                        <ShieldCheck className="h-3 w-3" /> Decision-maker
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{Math.round(c.confidenceScore * 100)}%</span>
                    <ContactStatusChip status={c.status} />
                  </span>
                </Link>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Facilities ({account.facilities.length})</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2">
              {account.facilities.length === 0 && <p className="text-sm text-slate-400">No facilities recorded.</p>}
              {account.facilities.map((f) => (
                <div key={f.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-800">
                  <span className="font-medium text-slate-800 dark:text-slate-200">{f.name}</span>
                  <span className="ml-2 text-slate-400">
                    {[f.city, f.state].filter(Boolean).join(", ")} · {f.facilityType.replaceAll("_", " ")}
                  </span>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lanes ({account.laneLinks.length})</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2">
              {account.laneLinks.length === 0 && <p className="text-sm text-slate-400">No lanes linked yet.</p>}
              {account.laneLinks.map(({ lane }) => (
                <Link key={lane.id} href={`/lanes/${lane.id}`} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-slate-300 dark:border-slate-800">
                  <span>{lane.label}</span>
                  <span className="text-xs text-slate-400">{lane.frequencyCount}× seen</span>
                </Link>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Outreach</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2">
              {account.outreachDrafts.length === 0 && <p className="text-sm text-slate-400">No drafts generated yet.</p>}
              {account.outreachDrafts.map((d) => (
                <Link key={d.id} href={`/outreach/${d.id}`} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-slate-300 dark:border-slate-800">
                  <span className="truncate">{d.subject}</span>
                  <span className="text-xs text-slate-400">{d.status}</span>
                </Link>
              ))}
            </CardBody>
          </Card>

          {account.parsesAsShipper.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Source Documents</CardTitle>
              </CardHeader>
              <CardBody className="space-y-2">
                {account.parsesAsShipper.map((p) => (
                  <Link key={p.id} href={`/uploads/${p.documentId}`} className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-slate-300 dark:border-slate-800">
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    {p.document.originalFilename}
                    {p.linehaulAmount && <span className="ml-auto text-xs text-slate-400">{money(Number(p.linehaulAmount))}</span>}
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
              <NoteForm accountId={account.id} />
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
