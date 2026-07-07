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
        "hover:-translate-y-0.5 hover:border-slate-300 hover:sha