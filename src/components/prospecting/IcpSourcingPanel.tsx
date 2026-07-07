"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { Sparkles, Loader2 } from "lucide-react";
import { runIcpSourcingAction, updateIcpProfileAction } from "@/lib/actions/prospecting";
import { Button } from "@/components/ui/Button";
import type { IcpProfile } from "@/lib/prospecting/icpSourcing";

export function IcpSourcingPanel({ initialProfile, apolloConfigured }: { initialProfile: IcpProfile; apolloConfigured: boolean }) {
  const [industries, setIndustries] = useState(initialProfile.industries.join(", "));
  const [locations, setLocations] = useState(initialProfile.locations.join(", "));
  const [minEmployees, setMinEmployees] = useState(String(initialProfile.minEmployees ?? ""));
  const [maxEmployees, setMaxEmployees] = useState(String(initialProfile.maxEmployees ?? ""));
  const [pending, startTransition] = useTransition();
  const [lastResult, setLastResult] = useState<{ found: number; created: number; skippedExisting: number } | null>(null);

  function save() {
    startTransition(async () => {
      await updateIcpProfileAction({
        industries: industries.split(",").map((s) => s.trim()).filter(Boolean),
        locations: locations.split(",").map((s) => s.trim()).filter(Boolean),
        minEmployees: minEmployees ? Number(minEmployees) : undefined,
        maxEmployees: maxEmployees ? Number(maxEmployees) : undefined,
      });
      toast.success("ICP profile saved");
    });
  }

  function run() {
    startTransition(async () => {
      const result = await runIcpSourcingAction();
      if (!result.ok) {
        toast.error(result.error ?? "ICP sourcing failed");
        return;
      }
      setLastResult(result);
      toast.success(`Found ${result.found} companies — created ${result.created} new prospects`);
    });
  }

  if (!apolloConfigured) {
    return (
      <p className="text-sm text-slate-400">
        ICP-based account sourcing needs <code className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-800">APOLLO_API_KEY</code> configured — see Settings for integration status.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        Searches Apollo for companies matching your ideal customer profile and adds new ones directly to the pipeline in Researching — finding shippers, not just processing the ones you already uploaded.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Industries (comma-separated)</span>
          <input
            value={industries}
            onChange={(e) => setIndustries(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            placeholder="Food & Beverage, Manufacturing"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Locations (comma-separated)</span>
          <input
            value={locations}
            onChange={(e) => setLocations(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            placeholder="California, Arizona"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Min employees</span>
          <input
            value={minEmployees}
            onChange={(e) => setMinEmployees(e.target.value)}
            type="number"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Max employees</span>
          <input
            value={maxEmployees}
            onChange={(e) => setMaxEmployees(e.target.value)}
            type="number"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={save} disabled={pending}>
          Save ICP profile
        </Button>
        <Button size="sm" onClick={run} disabled={pending}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Run sourcing now
        </Button>
        {lastResult && (
          <span className="text-xs text-slate-400">
            Last run: {lastResult.found} found, {lastResult.created} created, {lastResult.skippedExisting} already existed
          </span>
        )}
      </div>
    </div>
  );
}
