import { prisma } from "@/lib/db";
import Link from "next/link";
import { ReplyClassifyForm } from "@/components/replies/ReplyClassifyForm";
import { ReplyCategoryChip, SentimentChip } from "@/components/ui/StatusChip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Inbox } from "lucide-react";
import { relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RepliesPage() {
  const SENTIMENT_PRIORITY: Record<string, number> = { HOT: 0, WARM: 1, NEUTRAL: 2, COLD: 3 };
  const [repliesRaw, accounts, contacts] = await Promise.all([
    prisma.reply.findMany({
      include: { account: true, contact: true },
      orderBy: { receivedAt: "desc" },
      take: 100,
    }),
    prisma.account.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 500 }),
    prisma.contact.findMany({ where: { deletedAt: null }, select: { id: true, fullName: true, accountId: true }, orderBy: { fullName: "asc" }, take: 1000 }),
  ]);

  const replies = [...repliesRaw].sort((a, b) => {
    const pa = a.sentimentTier ? SENTIMENT_PRIORITY[a.sentimentTier] ?? 4 : 4;
    const pb = b.sentimentTier ? SENTIMENT_PRIORITY[b.sentimentTier] ?? 4 : 4;
    if (pa !== pb) return pa - pb;
    return b.receivedAt.getTime() - a.receivedAt.getTime();
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Replies</h2>
        <p className="text-sm text-slate-500">
          Paste in reply text to classify it and move the pipeline forward, or let inbox polling ingest replies automatically (see Settings for integration status). Sentiment tiers below (hot/warm/neutral/cold) come from recommendation #7's auto-triage.
        </p>
      </div>

      <ReplyClassifyForm accounts={accounts} contacts={contacts} />

      {replies.length === 0 ? (
        <EmptyState icon={Inbox} title="No replies logged yet" />
      ) : (
        <ul className="space-y-2">
          {replies.map((r) => (
            <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  {r.account && (
                    <Link href={`/accounts/${r.account.id}`} className="font-medium text-slate-800 hover:text-brand-600 dark:text-slate-200">
                      {r.account.name}
                    </Link>
                  )}
                  {r.contact && <span className="text-slate-400">· {r.contact.fullName}</span>}
                </div>
                <span className="flex items-center gap-1.5">
                  <SentimentChip tier={r.sentimentTier} />
                  <ReplyCategoryChip category={r.category} />
                </span>
              </div>
              <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{r.rawText}</p>
              {r.suggestedNextAction && <p className="mt-1.5 text-xs font-medium text-brand-600">Next: {r.suggestedNextAction}</p>}
              <p className="mt-1 text-xs text-slate-400">{relativeTime(r.receivedAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
