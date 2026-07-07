"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { changeOpportunityStage } from "@/lib/actions/opportunities";
import { PriorityChip } from "@/components/ui/StatusChip";
import { relativeTime } from "@/lib/utils";

export interface KanbanOpportunity {
  id: string;
  accountName: string;
  accountId: string;
  contactName: string | null;
  laneLabel: string | null;
  equipmentType: string | null;
  urgency: string;
  ownerName: string | null;
  updatedAt: Date;
}

export interface KanbanColumn {
  stage: string;
  label: string;
  opportunities: KanbanOpportunity[];
}

export function KanbanBoard({ columns }: { columns: KanbanColumn[] }) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDrop(stage: string) {
    if (!dragId) return;
    const id = dragId;
    setDragId(null);

    let lostReason: string | null = null;
    if (stage === "LOST") {
      lostReason = window.prompt("Why was this lost? (optional)");
    }

    startTransition(async () => {
      await changeOpportunityStage(id, stage as any, lostReason);
      toast.success(`Moved to ${stage.replaceAll("_", " ")}`);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {columns.map((col) => (
        <div
          key={col.stage}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(col.stage)}
          className="flex w-64 shrink-0 flex-col rounded-xl bg-slate-100 dark:bg-slate-900/60"
        >
          <div className="flex items-center justify-between px-3 py-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{col.label}</h3>
            <span className="rounded-full bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800">
              {col.opportunities.length}
            </span>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-2" style={{ minHeight: 80, maxHeight: "70vh" }}>
            {col.opportunities.map((o) => (
              <div
                key={o.id}
                draggable
                onDragStart={() => setDragId(o.id)}
                className={`cursor-grab rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm transition active:cursor-grabbing dark:border-slate-800 dark:bg-slate-900 ${pending ? "opacity-60" : ""}`}
              >
                <Link href={`/accounts/${o.accountId}`} className="font-medium text-slate-800 hover:text-brand-600 dark:text-slate-200">
                  {o.accountName}
                </Link>
                {o.contactName && <p className="text-xs text-slate-400">{o.contactName}</p>}
                {o.laneLabel && <p className="mt-1 text-xs text-slate-500">{o.laneLabel}</p>}
                <div className="mt-2 flex items-center justify-between">
                  <PriorityChip priority={o.urgency} />
                  <span className="text-[11px] text-slate-400">{relativeTime(o.updatedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
