"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Briefcase, Loader2 } from "lucide-react";
import { checkHiringSignalAction } from "@/lib/actions/prospecting";
import { Button } from "@/components/ui/Button";

export function HiringSignalButton({ accountId, hasApolloOrgId, apolloConfigured }: { accountId: string; hasApolloOrgId: boolean; apolloConfigured: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!apolloConfigured) return null;
  if (!hasApolloOrgId) {
    return <span className="text-xs text-slate-400">Hiring signals need Apollo enrichment/sourcing first</span>;
  }

  function run() {
    startTransition(async () => {
      const result = await checkHiringSignalAction(accountId);
      if (!result.ok) {
        toast.error(result.error ?? "Hiring signal check failed");
        return;
      }
      toast.success(result.detected ? `Hiring signal found: ${result.detail}` : "No relevant hiring activity found");
      router.refresh();
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={run} disabled={pending}>
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Briefcase className="h-3.5 w-3.5" />}
      Check hiring signal
    </Button>
  );
}
