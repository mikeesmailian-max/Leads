"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { createAccount, updateAccount } from "@/lib/actions/accounts";

const ACCOUNT_TYPES = ["SHIPPER", "BROKER", "CONSIGNEE", "WAREHOUSE", "FACILITY", "CARRIER", "PROSPECT", "CUSTOMER", "OTHER"];
const EQUIPMENT = ["", "DRY_VAN", "REEFER", "FLATBED", "OTHER"];

export function AccountFormModal({
  account,
  trigger,
}: {
  account?: {
    id: string;
    name: string;
    website: string | null;
    type: string;
    industry: string | null;
    region: string | null;
    equipmentFocus: string | null;
    internalNotes: string | null;
  };
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(account?.name ?? "");
  const [website, setWebsite] = useState(account?.website ?? "");
  const [type, setType] = useState(account?.type ?? "PROSPECT");
  const [industry, setIndustry] = useState(account?.industry ?? "");
  const [region, setRegion] = useState(account?.region ?? "");
  const [equipmentFocus, setEquipmentFocus] = useState(account?.equipmentFocus ?? "");
  const [notes, setNotes] = useState(account?.internalNotes ?? "");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const payload = {
        name,
        website: website || null,
        type: type as any,
        industry: industry || null,
        region: region || null,
        equipmentFocus: (equipmentFocus || null) as any,
        internalNotes: notes || null,
      };
      if (account) {
        await updateAccount(account.id, payload);
        toast.success("Account updated");
      } else {
        await createAccount(payload);
        toast.success("Account created");
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>
        {trigger ?? (
          <Button size="sm">
            <Plus className="h-3.5 w-3.5" /> New Account
          </Button>
        )}
      </span>
      <Modal open={open} onClose={() => setOpen(false)} title={account ? "Edit Account" : "New Account"}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Company name *</span>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Website</span>
              <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="acme.com" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Type</span>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Industry</span>
              <input value={industry} onChange={(e) => setIndustry(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Region</span>
              <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. Southwest" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Equipment focus</span>
            <select value={equipmentFocus} onChange={(e) => setEquipmentFocus(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
              {EQUIPMENT.map((e) => (
                <option key={e} value={e}>
                  {e || "—"}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Notes</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {account ? "Save changes" : "Create account"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
