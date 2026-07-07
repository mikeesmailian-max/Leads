"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { enrichAccountAction } from "@/lib/actions/enrichment";

export function EnrichButton({ accountId, hasDomain, apolloConfigured }: { accountId: string; hasDomain: boolean; apolloConfigured: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!apolloConfigured) {
    return (
      <span className="text-xs text-slate-400" title="Set APOLLO_API_KEY in .env to enable contact enrichment">
        Enrichment not configured
      </span>
    );
  }

  return (
    <Button
      variant="secondary"
      disabled={pending || !hasDomain}
      title={!hasDomain ? "This account has no known website/domain to search" : "Find additional contacts and flag the shipping/logistics decision-maker"}
      onClick={() => {
        startTransition(async () => {
          const result = await enrichAccountAction(accountId);
          if (!result.ok) {
            toast.error(result.error || "Enrichment failed");
            return;
          }
          if (result.contactsFound === 0) {
            toast("No additional contacts found", { icon: "ℹ️" });
          } else {
            toast.success(
              `Found ${result.contactsFound} contact${result.contactsFound === 1 ? "" : "s"}${result.decisionMakerContactId ? " — decision-maker flagged" : ""}`,
            );
          }
          router.refresh();
        });
      }}
    >
      <Sparkles className="mr-1.5 h-4 w-4" />
      {pending ? "Enriching..." : "Find Contacts"}
    </Button>
  );
}
