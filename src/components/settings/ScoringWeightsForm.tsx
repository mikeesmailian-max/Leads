"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2, Save, RotateCcw } from "lucide-react";
import { updateScoringWeights, resetScoringWeights } from "@/lib/actions/settings";
import { Button } from "@/components/ui/Button";
import type { ScoringWeights } from "@/lib/scoring/getWeights";

const LABELS: Record<keyof ScoringWeights, string> = {
  domainMatch: "Company domain match",
  titleRelevance: "Title relevance",
  documentPresence: "Found in uploaded document",
  nameConsistency: "Name consistency",
  facilityRelevance: "Facility relevance",
  emailPatternConfidence: "Email pattern confidence",
  webSourceConfidence: "Source reliability",
};

export function ScoringWeightsForm({ initial }: { initial: ScoringWeights }) {
  const [weights, setWeights] = useState(initial);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const total = Object.values(weights).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-3">
      {(Object.keys(weights) as (keyof ScoringWeights)[]).map((key) => (
        <div key={key} className="flex items-center gap-3">
          <span className="w-56 shrink-0 text-sm text-slate-600 dark:text-slate-400">{LABELS[key]}</span>
          <input
            type="range"
            min={0}
            max={40}
            value={weights[key]}
            onChange={(e) => setWeights((w) => ({ ...w, [key]: Number(e.target.value) }))}
            className="flex-1"
          />
          <span className="w-10 text-right text-sm font-medium text-slate-700 dark:text-slate-300">{weights[key]}</span>
        </div>
      ))}
      <p className={`text-xs ${total === 100 ? "text-slate-400" : "text-amber-600"}`}>
        Total: {total}{total !== 100 && " — weights don't need to sum to 100, but it's easiest to reason about scores if they do."}
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await updateScoringWeights(weights);
              toast.success("Weights saved");
              router.refresh();
            })
          }
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save weights
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await resetScoringWeights();
              toast.success("Reset to defaults");
              router.refresh();
            })
          }
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Button>
      </div>
    </div>
  );
}
