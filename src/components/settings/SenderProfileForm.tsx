"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2, Save } from "lucide-react";
import { updateSenderProfile } from "@/lib/actions/settings";
import { Button } from "@/components/ui/Button";
import type { SenderProfile } from "@/lib/outreach/facts";

export function SenderProfileForm({ initial }: { initial: SenderProfile }) {
  const [profile, setProfile] = useState(initial);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function set<K extends keyof SenderProfile>(key: K, value: SenderProfile[K]) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Company name</span>
          <input value={profile.companyName} onChange={(e) => set("companyName", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Sender name</span>
          <input value={profile.senderName} onChange={(e) => set("senderName", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Regional specialization</span>
          <input value={profile.regionalSpecialization} onChange={(e) => set("regionalSpecialization", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Equipment language</span>
          <input value={profile.equipmentLanguage} onChange={(e) => set("equipmentLanguage", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">Signature block</span>
        <textarea value={profile.signatureBlock} onChange={(e) => set("signatureBlock", e.target.value)} rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">Default tone</span>
        <select value={profile.tone} onChange={(e) => set("tone", e.target.value as SenderProfile["tone"])} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="concise">Concise</option>
          <option value="direct">Direct</option>
          <option value="warm">Warm</option>
        </select>
      </label>
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await updateSenderProfile(profile);
            toast.success("Saved");
            router.refresh();
          })
        }
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        Save profile
      </Button>
    </div>
  );
}
