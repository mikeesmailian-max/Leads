"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { updateLaneAngle } from "@/lib/actions/lanes";
import { Button } from "@/components/ui/Button";

export function SuggestedAngleEditor({ laneId, initial }: { laneId: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
      />
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await updateLaneAngle(laneId, value);
            toast.success("Saved");
            router.refresh();
          })
        }
      >
        {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Save
      </Button>
    </div>
  );
}
