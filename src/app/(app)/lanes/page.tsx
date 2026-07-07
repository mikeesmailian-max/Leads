import { prisma } from "@/lib/db";
import Link from "next/link";
import { Table, THead, TBody, Tr, Th, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Route } from "lucide-react";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function LanesPage({
  searchParams,
}: {
  searchParams: { equipment?: string; account?: string; sort?: string };
}) {
  const where: Prisma.LaneWhereInput = { deletedAt: null };
  if (searchParams.equipment) where.equipmentType = searchParams.equipment as any;
  if (searchParams.account) where.accounts = { some: { accountId: searchParams.account } };

  const lanes = await prisma.lane.findMany({
    where,
    include: { accounts: { include: { account: true } }, _count: { select: { opportunities: true } } },
    orderBy: searchParams.sort === "recent" ? { updatedAt: "desc" } : { frequencyCount: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Lanes</h2>
        <p className="text-sm text-slate-500">Origin → destination intelligence discovered from uploaded rate confirmations.</p>
      </div>

      <form className="flex flex-wrap gap-2" method="get">
        <select name="equipment" defaultValue={searchParams.equipment ?? ""} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="">All equipment</option>
          <option value="DRY_VAN">Dry Van</option>
          <option value="REEFER">Reefer</option>
          <option value="FLATBED">Flatbed</option>
          <option value="OTHER">Other</option>
        </select>
        <select name="sort" defaultValue={searchParams.sort ?? "frequency"} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="frequency">Sort: Most frequent</option>
          <option value="recent">Sort: Recently updated</option>
        </select>
        <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Filter</button>
      </form>

      {lanes.length === 0 ? (
        <EmptyState icon={Route} title="No lanes discovered yet" description="Approve an uploaded rate confirmation to start building lane intelligence." />
      ) : (
        <Table>
          <THead>
            <Tr>
              <Th>Lane</Th>
              <Th>Equipment</Th>
              <Th>Frequency</Th>
              <Th>Accounts</Th>
              <Th>Opportunities</Th>
            </Tr>
          </THead>
          <TBody>
            {lanes.map((lane) => (
              <Tr key={lane.id}>
                <Td>
                  <Link href={`/lanes/${lane.id}`} className="font-medium text-slate-800 hover:text-brand-600 dark:text-slate-200">
                    {lane.label}
                  </Link>
                </Td>
                <Td>{lane.equipmentType?.replaceAll("_", " ") ?? "—"}</Td>
                <Td>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {lane.frequencyCount}×
                  </span>
                </Td>
                <Td>{lane.accounts.map((a) => a.account.name).join(", ") || "—"}</Td>
                <Td>{lane._count.opportunities}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
