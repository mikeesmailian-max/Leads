import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function KPICard({
  label,
  value,
  icon: Icon,
  href,
  tone = "slate",
  hint,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  href?: string;
  tone?: "slate" | "amber" | "green" | "red" | "blue";
  hint?: string;
}) {
  const toneRing: Record<string, string> = {
    slate: "text-slate-500",
    amber: "text-amber-500",
    green: "text-emerald-500",
    red: "text-red-500",
    blue: "text-blue-500",
  };

  const content = (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-1.5 text-2xl font-semibold text-slate-900 dark:text-slate-50">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
      </div>
      {Icon && <Icon className={cn("h-5 w-5 shrink-0", toneRing[tone])} strokeWidth={1.75} />}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }
  return content;
}
