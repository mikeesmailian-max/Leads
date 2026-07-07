import { prisma } from "@/lib/db";
import Link from "next/link";
import { Table, THead, TBody, Tr, Th, Td } from "@/components/ui/Table";
import { DraftStatusChip } from "@/components/ui/StatusChip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Send, Plus } from "lucide-react";
import { relativeTime } from "@/lib/utils";
import { STYLE_LABELS } from "@/lib/outreach/templates";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function OutreachPage({ searchParams }: { searchParams: { status?: string; accountId?: string } }) {
  const where: Prisma.OutreachDraftWhereInput = { deletedAt: null };
  if (searchParams.status) where.status = searchParams.status as any;
  if (searchParams.accountId) where.accountId = searchParams.accountId;

  const drafts = await prisma.outreachDraft.findMany({
    where,
    include: { account: true, contact: true, lane: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Outreach</h2>
          <p className="text-sm text-slate-500">Draft, compare, and track fact-based outreach.</p>
        </div>
        <Button href="/outreach/new" size="sm">
          <Plus className="h-3.5 w-3.5" /> New Draft
        </Button>
      </div>

      {drafts.length === 0 ? (
        <EmptyState icon={Send} title="No drafts yet" description="Generate your first outreach draft from an account or contact page." action={<Button href="/outreach/new">Generate a draft</Button>} />
      ) : (
        <Table>
          <THead>
            <Tr>
              <Th>Subject</Th>
              <Th>Company</Th>
              <Th>Contact</Th>
              <Th>Style</Th>
              <Th>Version</Th>
              <Th>Status</Th>
              <Th>Created</Th>
            </Tr>
          </THead>
          <TBody>
            {drafts.map((d) => (
              <Tr key={d.id}>
                <Td>
                  <Link href={`/outreach/${d.id}`} className="font-medium text-slate-800 hover:text-brand-600 dark:text-slate-200">
                    {d.subject}
                  </Link>
                </Td>
                <Td>{d.account.name}</Td>
                <Td>{d.contact?.fullName ?? "—"}</Td>
                <Td>{STYLE_LABELS[d.style as keyof typeof STYLE_LABELS] ?? d.style}</Td>
                <Td>{d.versionLabel} ({d.length})</Td>
                <Td>
                  <DraftStatusChip status={d.status} />
                </Td>
                <Td className="text-xs text-slate-400">{relativeTime(d.createdAt)}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
