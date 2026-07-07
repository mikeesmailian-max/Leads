"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { GitMerge, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { mergeAccounts } from "@/lib/actions/accounts";

export interface Candidate {
  id: string;
  name: string;
  type: string;
  score: number;
  reason: string;
}

export function MergePanel({ accountId, candidates }: { accountId: string; candidates: Candidate[] }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (candidates.length === 0) return null;

  function handleMerge(sourceId: string) {
    if (!confirm("Merge this account into the current one? This cannot be undone.")) return;
    startTransition(async () => {
      await mergeAccounts(accountId, sourceId);
      toast.success("Accounts merged");
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-800 dark:text-amber-300">
        <GitMerge className="h-4 w-4" /> Possible duplicates
      </p>
      <ul className="space-y-1.5">
        {candidates.map((c) => (
          <li key={c.id} className="flex items-center justify-between text-sm">
            <span className="text-amber-900 dark:text-amber-200">
              {c.name} <span className="text-xs text-amber-600">({Math.round(c.score * 100)}% match · {c.reason.replace("_", " ")})</span>
            </span>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => handleMerge(c.id)}>
              {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Merge in"}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
