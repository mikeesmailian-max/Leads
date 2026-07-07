import { prisma } from "@/lib/db";
import { NewDraftForm } from "@/components/outreach/NewDraftForm";

export const dynamic = "force-dynamic";

export default async function NewOutreachPage({
  searchParams,
}: {
  searchParams: { accountId?: string; contactId?: string };
}) {
  const [accounts, contacts, lanes] = await Promise.all([
    prisma.account.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, take: 500 }),
    prisma.contact.findMany({ where: { deletedAt: null }, orderBy: { fullName: "asc" }, take: 1000 }),
    prisma.lane.findMany({ where: { deletedAt: null }, orderBy: { frequencyCount: "desc" }, take: 500 }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">New Outreach Draft</h2>
        <p className="text-sm text-slate-500">Pick a company, optional contact and lane, and a style — we'll generate short and long versions to compare.</p>
      </div>
      <NewDraftForm
        accounts={accounts.map((a) => ({ id: a.id, label: a.name }))}
        contacts={contacts.map((c) => ({ id: c.id, label: c.fullName, accountId: c.accountId }))}
        lanes={lanes.map((l) => ({ id: l.id, label: l.label }))}
        defaultAccountId={searchParams.accountId}
        defaultContactId={searchParams.contactId}
      />
    </div>
  );
}
