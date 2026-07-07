"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2, Sparkles, Inbox } from "lucide-react";
import { classifyReplyAction } from "@/lib/actions/replies";
import { suggestReplyCategory, type ReplyCategoryGuess } from "@/lib/replies/classify";
import { Button } from "@/components/ui/Button";

const CATEGORIES: ReplyCategoryGuess[] = [
  "INTERESTED",
  "NOT_INTERESTED",
  "WRONG_CONTACT",
  "SEND_RATES",
  "SEND_CAPACITY",
  "QUOTE_REQUEST",
  "LATER",
  "UNSUBSCRIBE",
  "OUT_OF_OFFICE",
  "UNKNOWN",
];

export function ReplyClassifyForm({
  accounts,
  contacts,
}: {
  accounts: { id: string; name: string }[];
  contacts: { id: string; fullName: string; accountId: string | null }[];
}) {
  const [accountId, setAccountId] = useState("");
  const [contactId, setContactId] = useState("");
  const [text, setText] = useState("");
  const [category, setCategory] = useState<ReplyCategoryGuess>("UNKNOWN");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const filteredContacts = accountId ? contacts.filter((c) => c.accountId === accountId) : contacts;

  function suggest() {
    if (!text.trim()) return;
    setCategory(suggestReplyCategory(text));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountId || !text.trim()) {
      toast.error("Pick a company and paste the reply text");
      return;
    }
    startTransition(async () => {
      await classifyReplyAction({ accountId, contactId: contactId || null, rawText: text, category });
      toast.success("Reply logged and pipeline updated");
      setText("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <Inbox className="h-4 w-4" /> Classify a reply
      </div>
      <div className="grid grid-cols-2 gap-3">
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="">Select company…</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select value={contactId} onChange={(e) => setContactId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="">No specific contact</option>
          {filteredContacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.fullName}
            </option>
          ))}
        </select>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste the reply email text here…"
        rows={5}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
      />
      <div className="flex flex-wrap items-center gap-2">
        <select value={category} onChange={(e) => setCategory(e.target.value as ReplyCategoryGuess)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <Button type="button" variant="outline" size="sm" onClick={suggest}>
          <Sparkles className="h-3.5 w-3.5" /> Suggest category
        </Button>
        <div className="flex-1" />
        <Button type="submit" size="sm" disabled={pending}>
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Log reply &amp; update pipeline
        </Button>
      </div>
    </form>
  );
}
