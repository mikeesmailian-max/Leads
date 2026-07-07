import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { ContactStatusChip } from "@/components/ui/StatusChip";
import { ContactActions } from "@/components/contacts/ContactActions";
import { ContactFormModal } from "@/components/contacts/ContactFormModal";
import { NoteForm } from "@/components/notes/NoteForm";
import { Timeline } from "@/components/timeline/Timeline";
import { scoreContact } from "@/lib/scoring/contactScoring";
import { formatDate } from "@/lib/utils";
import { Mail, Phone, Linkedin, Pencil, Send } from "lucide-react";

export const dynamic = "force-dynamic";

const BREAKDOWN_LABELS: Record<string, string> = {
  domainMatch: "Company domain match",
  titleRelevance: "Title relevance",
  documentPresence: "Found in uploaded document",
  nameConsistency: "Name consistency",
  facilityRelevance: "Facility relevance",
  emailPatternConfidence: "Email pattern",
  webSourceConfidence: "Source reliability",
};

export default async function ContactDetailPage({ params }: { params: { id: string } }) {
  const contact = await prisma.contact.findUnique({
    where: { id: params.id },
    include: { account: true, facility: true, notes: { include: { author: true }, orderBy: { createdAt: "desc" } } },
  });
  if (!contact) notFound();

  const [activities, accounts, outreachMessages] = await Promise.all([
    prisma.activity.findMany({ where: { contactId: contact.id }, include: { actor: true }, orderBy: { createdAt: "desc" }, take: 40 }),
    prisma.account.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 500 }),
    prisma.outreachMessage.findMany({ where: { contactId: contact.id }, orderBy: { createdAt: "desc" } }),
  ]);

  const { breakdown } = scoreContact({
    fullName: contact.fullName,
    title: contact.title,
    email: contact.email,
    accountDomain: contact.account?.domain,
    source: contact.source,
    facilityId: contact.facilityId,
    foundInDocument: contact.source === "document",
  });

  const timelineEntries = [
    ...activities.map((a) => ({ id: a.id, type: a.type, summary: a.summary, createdAt: a.createdAt, actorName: a.actor?.name })),
    ...contact.notes.map((n) => ({ id: n.id, type: "NOTE" as const, summary: n.body, createdAt: n.createdAt, actorName: n.author?.name })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">{contact.fullName}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            {contact.title && <span>{contact.title}</span>}
            {contact.account && (
              <Link href={`/accounts/${contact.account.id}`} className="hover:text-brand-600">
                {contact.account.name}
              </Link>
            )}
            <ContactStatusChip status={contact.status} />
            {contact.doNotContact && <span className="font-medium text-red-600">Do Not Contact</span>}
          </p>
          <p className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-brand-600">
                <Mail className="h-3.5 w-3.5" /> {contact.email}
              </a>
            )}
            {contact.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> {contact.phone}
              </span>
            )}
            {contact.linkedinUrl && (
              <a href={contact.linkedinUrl} target="_blank" className="flex items-center gap-1 hover:text-brand-600">
                <Linkedin className="h-3.5 w-3.5" /> LinkedIn
              </a>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ContactFormModal
            accounts={accounts}
            contact={{
              id: contact.id,
              fullName: contact.fullName,
              title: contact.title,
              email: contact.email,
              phone: contact.phone,
              linkedinUrl: contact.linkedinUrl,
              accountId: contact.accountId,
            }}
            trigger={
              <button className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            }
          />
          <Link
            href={`/outreach/new?accountId=${contact.accountId ?? ""}&contactId=${contact.id}`}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Send className="h-3.5 w-3.5" /> Draft Outreach
          </Link>
        </div>
      </div>

      <ContactActions contactId={contact.id} verificationStatus={contact.verificationStatus} doNotContact={contact.doNotContact} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Confidence Score — {Math.round(contact.confidenceScore * 100)}%</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2">
              {Object.entries(breakdown).map(([key, value]) => (
                <div key={key}>
                  <div className="mb-0.5 flex justify-between text-xs">
                    <span className="text-slate-500">{BREAKDOWN_LABELS[key] ?? key}</span>
                    <span className="font-medium text-slate-600">{Math.round((value as number) * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${(value as number) * 100}%` }} />
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Outreach History</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2">
              {outreachMessages.length === 0 && <p className="text-sm text-slate-400">No outreach sent yet.</p>}
              {outreachMessages.map((m) => (
                <div key={m.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{m.subject ?? "(no subject)"}</span>
                    <span className="text-xs text-slate-400">{m.status}</span>
                  </div>
                  {m.sentAt && <p className="text-xs text-slate-400">{formatDate(m.sentAt)}</p>}
                </div>
              ))}
            </CardBody>
          </Card>

          {contact.internalNotes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{contact.internalNotes}</p>
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
              <NoteForm contactId={contact.id} />
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
