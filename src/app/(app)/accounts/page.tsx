import { prisma } from "@/lib/db";
import Link from "next/link";
import { Table, THead, TBody, Tr, Th, Td } from "@/components/ui/Table";
import { StageChip } from "@/components/ui/StatusChip";
import { EmptyState } from "@/components/ui/EmptyState";
import { AccountFormModal } from "@/components/accounts/AccountFormModal";
import { Building2 } from "lucide-react";
import { relativeTime } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: { type?: string; stage?: string; q?: string; filter?: string };
}) {
  const where: Prisma.AccountWhereInput = { deletedAt: null };
  if (searchParams.type) where.type = searchParams.type as any;
  if (searchParams.stage) where.pipelineStage = searchParams.stage as any;
  if (searchParams.q) where.name = { contains: searchParams.q, mode: "insensitive" };
  if (searchParams.filter === "no_contacts") where.contacts = { none: {} };

  const accounts = await prisma.account.findMany({
    where,
    include: { _count: { select: { contacts: true, facilities: true } }, owner: true },
    orderBy: { lastActivityAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Accounts</h2>
          <p className="text-sm text-slate-500">Shippers, brokers, consignees, and prospects discovered or added manually.</p>
        </div>
        <AccountFormModal />
      </div>

      <form className="flex flex-wrap gap-2" method="get">
        <input
          name="q"
          defaultValue={searchParams.q}
          placeholder="Search company name…"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
        <select name="type" defaultValue={searchParams.type ?? ""} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="">All types</option>
          {["SHIPPER", "BROKER", "CONSIGNEE", "WAREHOUSE", "FACILITY", "CARRIER", "PROSPECT", "CUSTOMER", "OTHER"].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select name="stage" defaultValue={searchParams.stage ?? ""} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="">All stages</option>
          {["NEW_FROM_UPLOAD", "RESEARCHING", "CONTACT_FOUND", "DRAFT_READY", "SENT", "REPLIED", "INTERESTED", "QUOTING", "CUSTOMER", "WON", "LOST", "ARCHIVED"].map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
          Filter
        </button>
      </form>

      {accounts.length === 0 ? (
        <EmptyState icon={Building2} title="No accounts found" description="Upload a rate confirmation or add one manually to get started." />
      ) : (
        <Table>
          <THead>
            <Tr>
              <Th>Company</Th>
              <Th>Type</Th>
              <Th>Stage</Th>
              <Th>Region</Th>
              <Th>Contacts</Th>
              <Th>Owner</Th>
              <Th>Last Activity</Th>
            </Tr>
          </THead>
          <TBody>
            {accounts.map((a) => (
              <Tr key={a.id}>
                <Td>
                  <Link href={`/accounts/${a.id}`} className="font-medium text-slate-800 hover:text-brand-600 dark:text-slate-200">
                    {a.name}
                  </Link>
                </Td>
                <Td>{a.type}</Td>
                <Td>
                  <StageChip stage={a.pipelineStage} />
                </Td>
                <Td>{a.region ?? "—"}</Td>
                <Td>{a._count.contacts}</Td>
                <Td>{a.owner?.name ?? "Unassigned"}</Td>
                <Td className="text-xs text-slate-400">{relativeTime(a.lastActivityAt)}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
