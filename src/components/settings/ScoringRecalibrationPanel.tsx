"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { TrendingUp, Loader2, CheckCircle2 } from "lucide-react";
import { analyzeWinLossAction, applyRecalibrationAction } from "@/lib/actions/settings";
import { Button } from "@/components/ui/Button";
import type { RecalibrationSuggestion } from "@/lib/scoring/recalibrate";

export function ScoringRecalibrationPanel() {
  const [suggestion, setSuggestion] = useState<RecalibrationSuggestion | null>(null);
  const [pending, startTransition] = useTransition();

  function analyze() {
    startTransition(async () => {
      const result = await analyzeWinLossAction();
      setSuggestion(result);
      if (!result.ok) toast.error(result.error ?? "Not enough data yet");
    });
  }

  function apply() {
    if (!suggestion || !suggestion.ok) return;
    startTransition(async () => {
      await applyRecalibrationAction(suggestion);
      toast.success("Scoring weights updated");
      setSuggestion(null);
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        Win/loss feedback loop (recommendation #8): compares contacts on closed-won vs. closed-lost deals to suggest weight
        adjustments. This is a directional signal from your own closed deals, not a precise model — review before applying.
      </p>
      <Button variant="outline" size="sm" onClick={analyze} disabled={pending}>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TrendingUp className="h-3.5 w-3.5" />}
        Analyze win/loss patterns
      </Button>

      {suggestion && suggestion.ok && (
        <div className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <p className="text-xs text-slate-400">
            Based on {suggestion.wonSampleSize} won and {suggestion.lostSampleSize} lost deals.
          </p>
          {suggestion.rationale.length === 0 ? (
            <p className="text-sm text-slate-500">No meaningful adjustment suggested — current weights look reasonable.</p>
          ) : (
            <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
              {suggestion.rationale.map((r, i) => (
                <li key={i}>• {r}</li>
              ))}
            </ul>
          )}
          {suggestion.rationale.length > 0 && (
            <Button size="sm" onClick={apply} disabled={pending}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Apply suggested weights
            </Button>
          )}
        </div>
      )}
      {suggestion && !suggestion.ok && (
        <p className="text-sm text-amber-600 dark:text-amber-400">{suggestion.error}</p>
      )}
    </div>
  );
}
