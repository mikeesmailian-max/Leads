"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { changeAccountStage } from "@/lib/actions/accounts";

const STAGES = ["NEW_FROM_UPLOAD", "RESEARCHING", "CONTACT_FOUND", "DRAFT_READY", "SENT", "REPLIED", "INTERESTED", "QUOTING", "CUSTOMER", "WON", "LOST", "ARCHIVED"];

export function StageSelect({ accountId, currentStage }: { accountId: string; currentStage: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <select
      defaultValue={currentStage}
      disabled={pending}
      onChange={(e) => {
        startTransition(async () => {
          await changeAccountStage(accountId, e.target.value as any);
          toast.success("Stage updated");
          router.refresh();
        });
      }}
      className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-medium dark:border-slate-700 dark:bg-slate-800"
    >
      {STAGES.map((s) => (
        <option key={s} value={s}>
          {s.replaceAll("_", " ")}
        </option>
      ))}
    </select>
  );
}
