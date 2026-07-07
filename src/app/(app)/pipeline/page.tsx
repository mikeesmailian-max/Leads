import { prisma } from "@/lib/db";
import Link from "next/link";
import { KanbanBoard, type KanbanColumn } from "@/components/pipeline/KanbanBoard";
import { Table, THead, TBody, Tr, Th, Td } from "@/components/ui/Table";
import { StageChip, PriorityChip } from "@/components/ui/StatusChip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Kanban, LayoutList } from "lucide-react";
import { relativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STAGES: { stage: string; label: string }[] = [
  { stage: "NEW_FROM_UPLOAD", label: "New From Upload" },
  { stage: "RESEARCHING", label: "Researching" },
  { stage: "CONTACT_FOUND", label: "Contact Found" },
  { stage: "DRAFT_READY", label: "Draft Ready" },
  { stage: "SENT", label: "Sent" },
  { stage: "REPLIED", label: "Replied" },
  { stage: "INTERESTED", label: "Interested" },
  { stage: "QUOTING", label: "Quoting" },
  { stage: "CUSTOMER", label: "Customer" },
  { stage: "WON", label: "Won" },
  { stage: "LOST", label: "Lost" },
  { stage: "ARCHIVED", label: "Archived" },
];

export default async function PipelinePage({ searchParams }: { searchParams: { view?: string; stage?: string } }) {
  const view = searchParams.view === "table" ? "table" : "kanban";

  const opportunities = await prisma.opportunity.findMany({
    where: { deletedAt: null, ...(searchParams.stage ? { stage: searchParams.stage as any } : {}) },
    include: { account: true, contact: true, lane: true, owner: true },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });

  const columns: KanbanColumn[] = STAGES.map(({ stage, label }) => ({
    stage,
    label,
    opportunities: opportunities
      .filter((o) => o.stage === stage)
      .map((o) => ({
        id: o.id,
        accountName: o.account.name,
        accountId: o.accountId,
        contactName: o.contact?.fullName ?? null,
        laneLabel: o.lane?.label ?? null,
        equipmentType: o.lane?.equipmentType ?? null,
        urgency: o.urgency,
        ownerName: o.owner?.name ?? null,
        updatedAt: o.updatedAt,
      })),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Pipeline</h2>
          <p className="text-sm text-slate-500">Drag cards between stages, or use the table view for bulk scanning.</p>
        </div>
        <div className="flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700">
          <Link href="/pipeline?view=kanban" className={cn("flex items-center gap-1.5 px-3 py-1.5 text-sm", view === "kanban" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "hover:bg-slate-50 dark:hover:bg-slate-800")}>
            <Kanban className="h-3.5 w-3.5" /> Board
          </Link>
          <Link href="/pipeline?view=table" className={cn("flex items-center gap-1.5 px-3 py-1.5 text-sm", view === "table" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "hover:bg-slate-50 dark:hover:bg-slate-800")}>
            <LayoutList className="h-3.5 w-3.5" /> Table
          </Link>
        </div>
      </div>

      {opportunities.length === 0 ? (
        <EmptyState icon={Kanban} title="No opportunities yet" description="Opportunities are created automatically when you approve an uploaded document." />
      ) : view === "kanban" ? (
        <KanbanBoard columns={columns} />
      ) : (
        <Table>
          <THead>
            <Tr>
              <Th>Company</Th>
              <Th>Contact</Th>
              <Th>Lane</Th>
              <Th>Stage</Th>
              <Th>Urgency</Th>
              <Th>Owner</Th>
              <Th>Updated</Th>
            </Tr>
          </THead>
          <TBody>
            {opportunities.map((o) => (
              <Tr key={o.id}>
                <Td>
                  <Link href={`/accounts/${o.accountId}`} className="font-medium text-slate-800 hover:text-brand-600 dark:text-slate-200">
                    {o.account.name}
                  </Link>
                </Td>
                <Td>{o.contact?.fullName ?? "—"}</Td>
                <Td>{o.lane?.label ?? "—"}</Td>
                <Td>
                  <StageChip stage={o.stage} />
                </Td>
                <Td>
                  <PriorityChip priority={o.urgency} />
                </Td>
                <Td>{o.owner?.name ?? "Unassigned"}</Td>
                <Td className="text-xs text-slate-400">{relativeTime(o.updatedAt)}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
