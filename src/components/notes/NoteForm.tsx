"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, StickyNote } from "lucide-react";
import { addNote } from "@/lib/actions/accounts";

export function NoteForm(props: {
  accountId?: string;
  contactId?: string;
  laneId?: string;
  facilityId?: string;
  opportunityId?: string;
}) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    startTransition(async () => {
      await addNote({ body, ...props });
      setBody("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-start gap-2">
      <StickyNote className="mt-2 h-4 w-4 shrink-0 text-slate-300" />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add a note…"
        rows={2}
        className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800"
      />
      <button
        type="submit"
        disabled={pending || !body.trim()}
        className="mt-0.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 dark:bg-white dark:text-slate-900"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add"}
      </button>
    </form>
  );
}
