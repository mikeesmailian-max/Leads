"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Search, Plus, Loader2 } from "lucide-react";
import { findLaneOverlapProspectsAction, addLaneOverlapProspectAction } from "@/lib/actions/prospecting";
import { Button } from "@/components/ui/Button";
import type { ApolloOrgResult } from "@/lib/prospecting/apolloOrgs";

export function LaneOverlapPanel({ laneId, apolloConfigured }: { laneId: string; apolloConfigured: boolean }) {
  const [candidates, setCandidates] = useState<(ApolloOrgResult & { alreadyExists: boolean })[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [addingId, setAddingId] = useState<string | null>(null);
  const router = useRouter();

  if (!apolloConfigured) {
    return <p className="text-sm text-slate-400">Lane-overlap prospecting needs APOLLO_API_KEY configured.</p>;
  }

  function search() {
    startTransition(async () => {
      const result = await findLaneOverlapProspectsAction(laneId);
      if (!result.ok) {
        toast.error(result.error ?? "Search failed");
        return;
      }
      setCandidates(result.candidates);
      if (result.candidates.length === 0) toast("No companies found near this lane's geography", { icon: "ℹ️" });
    });
  }

  function add(candidate: ApolloOrgResult) {
    setAddingId(candidate.apolloOrgId);
    startTransition(async () => {
      await addLaneOverlapProspectAction(laneId, candidate);
      toast.success(`${candidate.name} added as a prospect on this lane`);
      setAddingId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        You already run this exact corridor — these are other companies located near either end of it, worth a look as new prospects.
      </p>
      <Button variant="outline" size="sm" onClick={search} disabled={pending}>
        {pending && !addingId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
        Find prospects on this lane
      </Button>
      {candidates && candidates.length > 0 && (
        <ul className="space-y-1.5">
          {candidates.map((c) => (
            <li key={c.apolloOrgId} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-800">
              <span>
                <span className="text-slate-700 dark:text-slate-300">{c.name}</span>
                <span className="ml-2 text-xs text-slate-400">{[c.city, c.state].filter(Boolean).join(", ")}</span>
              </span>
              {c.alreadyExists ? (
                <span className="text-xs text-slate-400">Already in CRM</span>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => add(c)} disabled={pending}>
                  {addingId === c.apolloOrgId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Add as prospect
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
