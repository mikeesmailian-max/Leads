"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2, Sparkles } from "lucide-react";
import { generateDraftsAction } from "@/lib/actions/outreach";
import { Button } from "@/components/ui/Button";
import { ALL_STYLES, STYLE_LABELS, type Style } from "@/lib/outreach/templates";

interface Option {
  id: string;
  label: string;
}

export function NewDraftForm({
  accounts,
  contacts,
  lanes,
  defaultAccountId,
  defaultContactId,
}: {
  accounts: Option[];
  contacts: (Option & { accountId: string | null })[];
  lanes: Option[];
  defaultAccountId?: string;
  defaultContactId?: string;
}) {
  const [accountId, setAccountId] = useState(defaultAccountId ?? "");
  const [contactId, setContactId] = useState(defaultContactId ?? "");
  const [laneId, setLaneId] = useState("");
  const [style, setStyle] = useState<Style>("LANE_SPECIFIC");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const filteredContacts = accountId ? contacts.filter((c) => c.accountId === accountId) : contacts;

  function handleGenerate() {
    if (!accountId) {
      toast.error("Pick a company first");
      return;
    }
    startTransition(async () => {
      const drafts = await generateDraftsAction({ accountId, contactId: contactId || null, laneId: laneId || null, style });
      toast.success(`Generated ${drafts.length} draft${drafts.length > 1 ? "s" : ""}`);
      router.push(`/outreach/${drafts[0].id}`);
    });
  }

  return (
    <div className="max-w-xl space-y-4">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">Company *</span>
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="">Select a company…</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">Contact (optional)</span>
        <select value={contactId} onChange={(e) => setContactId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="">No specific contact yet</option>
          {filteredContacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">Lane (optional)</span>
        <select value={laneId} onChange={(e) => setLaneId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="">No specific lane</option>
          {lanes.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">Outreach style</span>
        <select value={style} onChange={(e) => setStyle(e.target.value as Style)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
          {ALL_STYLES.map((s) => (
            <option key={s} value={s}>
              {STYLE_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-slate-400">
        Generates a short and a long version (A/B) using only facts already in the database — no invented volume, spend, or relationships.
      </p>
      <Button onClick={handleGenerate} disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Generate drafts
      </Button>
    </div>
  );
}
