import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

export function KPICard({
  label,
  value,
  icon: Icon,
  href,
  tone = "slate",
  hint,
  urgent,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  href?: string;
  tone?: "slate" | "amber" | "green" | "red" | "blue";
  hint?: string;
  urgent?: boolean;
}) {
  const toneStyles: Record<string, { icon: string; chip: string; bar: string }> = {
    slate: { icon: "text-slate-500", chip: "bg-slate-100 dark:bg-slate-800", bar: "bg-slate-300" },
    amber: { icon: "text-amber-600", chip: "bg-amber-50 dark:bg-amber-950/40", bar: "bg-amber-400" },
    green: { icon: "text-emerald-600", chip: "bg-emerald-50 dark:bg-emerald-950/40", bar: "bg-emerald-400" },
    red: { icon: "text-red-600", chip: "bg-red-50 dark:bg-red-950/40", bar: "bg-red-400" },
    blue: { icon: "text-blue-600", chip: "bg-blue-50 dark:bg-blue-950/40", bar: "bg-blue-400" },
  };
  const t = toneStyles[tone];
  const isNumeric = typeof value === "number";

  const content = (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.12)]",
        "dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700",
      )}
    >
      <span className={cn("absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100", t.bar)} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
          <p className="mt-2 text-[26px] font-bold leading-none tracking-tight text-slate-900 dark:text-slate-50">
            {isNumeric ? <AnimatedNumber value={value as number} /> : value}
          </p>
          {hint && <p className="mt-1.5 truncate text-xs text-slate-400">{hint}</p>}
        </div>
        {Icon && (
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", t.chip)}>
            <Icon className={cn("h-4 w-4", t.icon)} strokeWidth={2} />
          </span>
        )}
      </div>
      {urgent && isNumeric && (value as number) > 0 && (
        <span className="absolute right-3 top-3 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
      )}
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
