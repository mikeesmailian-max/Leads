"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  Building2,
  Users,
  Route,
  Send,
  Kanban,
  ListChecks,
  BarChart3,
  Settings,
  Truck,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/uploads", label: "Uploads", icon: Upload },
  { href: "/accounts", label: "Accounts", icon: Building2 },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/lanes", label: "Lanes", icon: Route },
  { href: "/outreach", label: "Outreach", icon: Send },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/replies", label: "Replies", icon: Inbox },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:flex">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Truck className="h-4.5 w-4.5" size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-slate-900 dark:text-slate-50">Mega Fleet</p>
          <p className="text-[11px] leading-tight text-slate-400">Sales Prospecting</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 px-2 py-2">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
