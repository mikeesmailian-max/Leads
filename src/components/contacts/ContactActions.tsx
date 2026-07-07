"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ShieldCheck, ShieldX, ShieldQuestion, Ban } from "lucide-react";
import { setVerificationStatus, toggleDoNotContact } from "@/lib/actions/contacts";
import { Button } from "@/components/ui/Button";

export function ContactActions({ contactId, verificationStatus, doNotContact }: { contactId: string; verificationStatus: string; doNotContact: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function verify(status: "VERIFIED" | "INVALID" | "PENDING") {
    startTransition(async () => {
      await setVerificationStatus(contactId, status);
      toast.success(`Marked ${status.toLowerCase()}`);
      router.refresh();
    });
  }

  function dnc() {
    startTransition(async () => {
      await toggleDoNotContact(contactId, !doNotContact);
      toast.success(doNotContact ? "Removed do-not-contact flag" : "Marked do-not-contact");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant={verificationStatus === "VERIFIED" ? "primary" : "outline"} disabled={pending} onClick={() => verify("VERIFIED")}>
        <ShieldCheck className="h-3.5 w-3.5" /> Verified
      </Button>
      <Button size="sm" variant={verificationStatus === "PENDING" ? "primary" : "outline"} disabled={pending} onClick={() => verify("PENDING")}>
        <ShieldQuestion className="h-3.5 w-3.5" /> Pending
      </Button>
      <Button size="sm" variant={verificationStatus === "INVALID" ? "danger" : "outline"} disabled={pending} onClick={() => verify("INVALID")}>
        <ShieldX className="h-3.5 w-3.5" /> Invalid
      </Button>
      <Button size="sm" variant={doNotContact ? "danger" : "outline"} disabled={pending} onClick={dnc}>
        <Ban className="h-3.5 w-3.5" /> {doNotContact ? "Do-Not-Contact ON" : "Mark Do-Not-Contact"}
      </Button>
    </div>
  );
}
