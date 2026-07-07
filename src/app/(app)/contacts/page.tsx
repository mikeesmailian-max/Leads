import { prisma } from "@/lib/db";
import Link from "next/link";
import { Table, THead, TBody, Tr, Th, Td } from "@/components/ui/Table";
import { ContactStatusChip } from "@/components/ui/StatusChip";
import { EmptyState } from "@/components/ui/EmptyState";
import { ContactFormModal } from "@/components/contacts/ContactFormModal";
import { Users } from "lucide-react";
import { relativeTime } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: { q?: string; verification?: string; status?: string; owner?: string };
}) {
  const where: Prisma.ContactWhereInput = { deletedAt: null };
  if (searchParams.q) where.fullName = { contains: searchParams.q, mode: "insensitive" };
  if (searchParams.verification) where.verificationStatus = searchParams.verification as any;
  if (searchParams.status) where.status = searchParams.status as any;
  if (searchParams.owner) where.ownerId = searchParams.owner;

  const [contacts, accounts] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: { account: true, owner: true },
      orderBy: { confidenceScore: "desc" },
      take: 200,
    }),
    prisma.account.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 500 }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Contacts</h2>
          <p className="text-sm text-slate-500">Decision makers discovered from documents, manually added, or inferred.</p>
        </div>
        <ContactFormModal accounts={accounts} />
      </div>

      <form className="flex flex-wrap gap-2" method="get">
        <input name="q" defaultValue={searchParams.q} placeholder="Search name…" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
        <select name="verification" defaultValue={searchParams.verification ?? ""} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="">All verification</option>
          {["UNVERIFIED", "PENDING", "VERIFIED", "INVALID"].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={searchParams.status ?? ""} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="">All statuses</option>
          {["NEW", "UNVERIFIED", "VERIFIED", "DRAFTED", "EMAILED", "REPLIED", "INTERESTED", "WRONG_CONTACT", "DEAD"].map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Filter</button>
      </form>

      {contacts.length === 0 ? (
        <EmptyState icon={Users} title="No contacts yet" description="Approve an upload or add a contact manually to start building your list." />
      ) : (
        <Table>
          <THead>
            <Tr>
              <Th>Name</Th>
              <Th>Title</Th>
              <Th>Company</Th>
              <Th>Confidence</Th>
              <Th>Status</Th>
              <Th>Verification</Th>
              <Th>Last Contacted</Th>
            </Tr>
          </THead>
          <TBody>
            {contacts.map((c) => (
              <Tr key={c.id}>
                <Td>
                  <Link href={`/contacts/${c.id}`} className="inline-flex items-center gap-1.5 font-medium text-slate-800 hover:text-brand-600 dark:text-slate-200">
                    {c.fullName}
                    {c.isDecisionMaker && (
                      <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                        Decision-maker
                      </span>
                    )}
                  </Link>
                </Td>
                <Td>{c.title ?? "—"}</Td>
                <Td>
                  {c.account ? (
                    <Link href={`/accounts/${c.account.id}`} className="hover:text-brand-600">
                      {c.account.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td>
                  <span
                    className={
                      c.confidenceScore >= 0.75
                        ? "font-medium text-emerald-600"
                        : c.confidenceScore >= 0.5
                          ? "font-medium text-amber-600"
                          : "font-medium text-slate-400"
                    }
                  >
                    {Math.round(c.confidenceScore * 100)}%
                  </span>
                </Td>
                <Td>
                  <ContactStatusChip status={c.status} />
                </Td>
                <Td className="text-xs text-slate-400">{c.verificationStatus}</Td>
                <Td className="text-xs text-slate-400">{c.lastContactedAt ? relativeTime(c.lastContactedAt) : "Never"}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
