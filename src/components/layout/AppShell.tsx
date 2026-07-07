import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Toaster } from "react-hot-toast";

export function AppShell({
  children,
  userName,
  userEmail,
  title,
}: {
  children: ReactNode;
  userName: string;
  userEmail: string;
  title?: string;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar userName={userName} userEmail={userEmail} title={title} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
      <Toaster position="top-right" toastOptions={{ style: { fontSize: "13px" } }} />
    </div>
  );
}
