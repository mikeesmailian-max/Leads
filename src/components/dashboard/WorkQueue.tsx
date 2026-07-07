import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

export interface WorkQueueItem {
  label: string;
  count: number;
  href: string;
  urgent?: boolean;
}

export function WorkQueue({ title, items }: { title: string; items: WorkQueueItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              className="group flex items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                {item.urgent && item.count > 0 && (
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                  </span>
                )}
                {item.label}
              </span>
              <span className="flex items-center gap-2">
                <span
                  className={
                    item.count > 0
                      ? item.urgent
                        ? "rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-300"
                        : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      : "rounded-full px-2 py-0.5 text-xs font-semibold text-slate-300 dark:text-slate-600"
                  }
                >
                  {item.count}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
