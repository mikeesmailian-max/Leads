import { CommandPalette } from "@/components/search/CommandPalette";
import { UserMenu } from "@/components/layout/UserMenu";

export function TopBar({ userName, userEmail, title }: { userName: string; userEmail: string; title?: string }) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 md:px-6">
      <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{title ?? ""}</h1>
      <div className="flex items-center gap-3">
        <CommandPalette />
        <UserMenu name={userName} email={userEmail} />
      </div>
    </header>
  );
}
