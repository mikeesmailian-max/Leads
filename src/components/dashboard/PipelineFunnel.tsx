import Link from "next/link";
import { cn } from "@/lib/utils";

const FUNNEL_STAGES: { key: string; label: string }[] = [
  { key: "NEW_FROM_UPLOAD", label: "New" },
  { key: "RESEARCHING", label: "Researching" },
  { key: "CONTACT_FOUND", label: "Contact Found" },
  { key: "DRAFT_READY", label: "Draft Ready" },
  { key: "SENT", label: "Sent" },
  { key: "REPLIED", label: "Replied" },
  { key: "INTERESTED", label: "Interested" },
  { key: "QUOTING", label: "Quoting" },
  { key: "CUSTOMER", label: "Customer" },
];

export function PipelineFunnel({ stageGroups }: { stageGroups: { pipelineStage: string; _count: { _all: number } }[] }) {
  const countFor = (key: string) => stageGroups.find((s) => s.pipelineStage === key)?._count._all ?? 0;
  const total = stageGroups.reduce((sum, s) => sum + s._count._all, 0);
  const maxCount = Math.max(1, ...FUNNEL_STAGES.map((s) => countFor(s.key)));

  const won = countFor("CUSTOMER") + countFor("WON");
  const conversionRate = total > 0 ? Math.round((won / total) * 100) : 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      {/* subtle dot-grid accent, kept light/crisp */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: "radial-gradient(rgb(203 213 225) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
          maskImage: "linear-gradient(to bottom, black, transparent 85%)",
        }}
      />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Pipeline Funnel</h3>
          <p className="text-xs text-slate-400">{total} active accounts across every stage</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 dark:bg-emerald-950/40">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{conversionRate}% converted to customer</span>
        </div>
      </div>

      <div className="relative mt-5 grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-5 lg:grid-cols-9">
        {FUNNEL_STAGES.map((stage) => {
          const count = countFor(stage.key);
          const heightPct = Math.max(6, Math.round((count / maxCount) * 100));
          return (
            <Link
              key={stage.key}
              href={`/pipeline?stage=${stage.key}`}
              className="group flex flex-col items-center gap-2"
            >
              <div className="flex h-16 w-full items-end justify-center">
                <div
                  className={cn(
                    "w-full max-w-[36px] rounded-t-md bg-brand-200 transition-all duration-300 group-hover:bg-brand-500 dark:bg-brand-900 dark:group-hover:bg-brand-500",
                  )}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-50">{count}</span>
              <span className="text-center text-[10px] font-medium leading-tight text-slate-400 group-hover:text-brand-600">
                {stage.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
