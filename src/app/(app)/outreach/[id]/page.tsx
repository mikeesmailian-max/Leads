import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { DraftEditor } from "@/components/outreach/DraftEditor";
import { DraftStatusChip } from "@/components/ui/StatusChip";
import { STYLE_LABELS } from "@/lib/outreach/templates";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DraftDetailPage({ params }: { params: { id: string } }) {
  const draft = await prisma.outreachDraft.findUnique({
    where: { id: params.id },
    include: { account: true, contact: true, lane: true },
  });
  if (!draft) notFound();

  const siblings = await prisma.outreachDraft.findMany({
    where: {
      accountId: draft.accountId,
      contactId: draft.contactId,
      style: draft.style,
      deletedAt: null,
    },
    orderBy: { versionLabel: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {STYLE_LABELS[draft.style as keyof typeof STYLE_LABELS] ?? draft.style} · Version {draft.versionLabel} ({draft.length})
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">
            <Link href={`/accounts/${draft.accountId}`} className="hover:text-brand-600">
              {draft.account.name}
            </Link>
          </h2>
          {draft.contact && (
            <p className="text-sm text-slate-500">
              To: <Link href={`/contacts/${draft.contact.id}`} className="hover:text-brand-600">{draft.contact.fullName}</Link>
              {draft.contact.title && ` — ${draft.contact.title}`}
            </p>
          )}
          {draft.lane && (
            <p className="text-sm text-slate-500">
              Lane: <Link href={`/lanes/${draft.lane.id}`} className="hover:text-brand-600">{draft.lane.label}</Link>
            </p>
          )}
        </div>
        <DraftStatusChip status={draft.status} />
      </div>

      {siblings.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {siblings.map((s) => (
            <Link
              key={s.id}
              href={`/outreach/${s.id}`}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm font-medium",
                s.id === draft.id
                  ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                  : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-800",
              )}
            >
              Version {s.versionLabel} · {s.length}
            </Link>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Draft</CardTitle>
        </CardHeader>
        <CardBody>
          <DraftEditor
            draftId={draft.id}
            initialSubject={draft.subject}
            initialBody={draft.body}
            status={draft.status}
            contactPhone={draft.contact?.phone}
            contactLinkedinUrl={draft.contact?.linkedinUrl}
          />
        </CardBody>
      </Card>

      {draft.factsUsed && (
        <Card>
          <CardHeader>
            <CardTitle>Facts Used to Generate This Draft</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="mb-2 text-xs text-slate-400">
              Only these facts — pulled directly from the database — were available to the generator. Nothing about volume, spend, or relationships was invented.
            </p>
            <pre className="max-h-56 overflow-y-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              {JSON.stringify(draft.factsUsed, null, 2)}
            </pre>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
