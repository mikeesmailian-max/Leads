"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTaskStatus } from "@/lib/actions/tasks";

export function TaskCheckbox({ taskId, done }: { taskId: string; done: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <input
      type="checkbox"
      checked={done}
      disabled={pending}
      onChange={(e) => {
        startTransition(async () => {
          await setTaskStatus(taskId, e.target.checked ? "DONE" : "OPEN");
          router.refresh();
        });
      }}
      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
    />
  );
}
