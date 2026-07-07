"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { Upload, Loader2 } from "lucide-react";
import { bulkImportAction } from "@/lib/actions/prospecting";
import { Button } from "@/components/ui/Button";

const SOURCE_OPTIONS: { value: "COMPETITOR_CUSTOMERS" | "DIRECTORY" | "OTHER"; label: string }[] = [
  { value: "COMPETITOR_CUSTOMERS", label: "Competitor customers" },
  { value: "DIRECTORY", label: "Directory / association" },
  { value: "OTHER", label: "Other list" },
];

export function BulkImportForm() {
  const [label, setLabel] = useState("");
  const [sourceType, setSourceType] = useState<"COMPETITOR_CUSTOMERS" | "DIRECTORY" | "OTHER">("COMPETITOR_CUSTOMERS");
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!label.trim() || !text.trim()) {
      toast.error("Give the batch a label and paste at least one company");
      return;
    }
    startTransition(async () => {
      const result = await bulkImportAction({ label, sourceType, text });
      if (!result.ok) {
        toast.error(result.error ?? "Import failed");
        return;
      }
      toast.success(`Imported ${result.rowsCreated} new prospects (${result.rowsSkipped} already existed)`);
      setText("");
      setLabel("");
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        No reliable API exists to auto-scrape competitor customer lists or association directories — paste in whatever list you found (competitor case-study customer logos, a chamber-of-commerce export, a trade-show attendee list) and this bulk-imports it as prospects, deduping against accounts you already have.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Batch label</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            placeholder="e.g. XYZ Carrier customer logos, Fresno Chamber directory"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Source type</span>
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value as typeof sourceType)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          >
            {SOURCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">
          Paste one company per line — "Name", "Name, domain.com", or "Name, domain.com, City, ST"
        </span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-800"
          placeholder={"Acme Foods, acmefoods.com, Fresno, CA\nValley Distribution Co"}
        />
      </label>
      <Button size="sm" onClick={submit} disabled={pending}>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        Import as prospects
      </Button>
    </div>
  );
}
