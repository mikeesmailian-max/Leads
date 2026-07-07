"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { createContact, updateContact } from "@/lib/actions/contacts";
import { SUGGESTED_LOGISTICS_TITLES } from "@/lib/parser/patterns";

interface AccountOption {
  id: string;
  name: string;
}

export function ContactFormModal({
  accounts,
  defaultAccountId,
  contact,
  trigger,
}: {
  accounts: AccountOption[];
  defaultAccountId?: string;
  contact?: {
    id: string;
    fullName: string;
    title: string | null;
    email: string | null;
    phone: string | null;
    linkedinUrl: string | null;
    accountId: string | null;
  };
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState(contact?.fullName ?? "");
  const [title, setTitle] = useState(contact?.title ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(contact?.linkedinUrl ?? "");
  const [accountId, setAccountId] = useState(contact?.accountId ?? defaultAccountId ?? "");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const payload = {
        fullName,
        title: title || null,
        email: email || null,
        phone: phone || null,
        linkedinUrl: linkedinUrl || null,
        accountId: accountId || null,
      };
      if (contact) {
        await updateContact(contact.id, payload);
        toast.success("Contact updated");
      } else {
        await createContact(payload);
        toast.success("Contact added");
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
            <Plus className="h-3.5 w-3.5" /> Add Contact
          </Button>
        )}
      </span>
      <Modal open={open} onClose={() => setOpen(false)} title={contact ? "Edit Contact" : "Add Contact"}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Full name *</span>
            <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Company</span>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
              <option value="">—</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Title</span>
            <input
              list="suggested-titles"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Transportation Manager"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            <datalist id="suggested-titles">
              {SUGGESTED_LOGISTICS_TITLES.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Phone</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">LinkedIn URL</span>
            <input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {contact ? "Save changes" : "Add contact"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
