"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Save, CheckCircle2, Send, Archive, Copy, Loader2, PackageCheck, Linkedin, MessageSquare, Mail } from "lucide-react";
import { updateDraftAction, approveDraftAction, markReadyToSendAction, sendDraftAction, archiveDraftAction } from "@/lib/actions/outreach";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type Channel = "EMAIL" | "SMS" | "LINKEDIN";

export function DraftEditor({
  draftId,
  initialSubject,
  initialBody,
  status,
  contactPhone,
  contactLinkedinUrl,
}: {
  draftId: string;
  initialSubject: string;
  initialBody: string;
  status: string;
  contactPhone?: string | null;
  contactLinkedinUrl?: string | null;
}) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [channel, setChannel] = useState<Channel>("EMAIL");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const locked = status === "SENT" || status === "ARCHIVED";

  function save() {
    startTransition(async () => {
      await updateDraftAction(draftId, { subject, body });
      toast.success("Saved");
      router.refresh();
    });
  }

  function approve() {
    startTransition(async () => {
      await save();
      await approveDraftAction(draftId);
      toast.success("Approved — send task created");
      router.refresh();
    });
  }

  function readyToSend() {
    startTransition(async () => {
      await markReadyToSendAction(draftId);
      toast.success("Marked ready to send");
      router.refresh();
    });
  }

  function send() {
    if (channel === "LINKEDIN") {
      navigator.clipboard.writeText(`${subject}\n\n${body}`);
      if (!confirm("LinkedIn has no send API — this copies the message to your clipboard. Open LinkedIn, paste it, send it, then confirm here to mark it sent. Continue?")) return;
    } else if (!confirm(`Send this draft via ${channel === "SMS" ? "SMS" : "email"}? This logs it to the outreach history and starts follow-up tasks.`)) {
      return;
    }
    startTransition(async () => {
      try {
        await sendDraftAction(draftId, channel);
        toast.success(channel === "LINKEDIN" ? "Marked as sent (LinkedIn — sent manually)" : "Marked as sent");
        router.refresh();
      } catch (err: any) {
        toast.error(err?.message ?? "Send failed");
      }
    });
  }

  function copy() {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    toast.success("Copied to clipboard");
  }

  function archive() {
    if (!confirm("Archive this draft? It will no longer show up in the active outreach queue.")) return;
    startTransition(async () => {
      await archiveDraftAction(draftId);
      toast.success("Draft archived");
      router.refresh();
    });
  }

  const CHANNEL_OPTIONS: { value: Channel; label: string; icon: typeof Mail; available: boolean; hint?: string }[] = [
    { value: "EMAIL", label: "Email", icon: Mail, available: true },
    { value: "SMS", label: "SMS", icon: MessageSquare, available: Boolean(contactPhone), hint: contactPhone ?? "No phone on file" },
    { value: "LINKEDIN", label: "LinkedIn", icon: Linkedin, available: Boolean(contactLinkedinUrl), hint: contactLinkedinUrl ?? "No LinkedIn URL on file" },
  ];

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">Subject</span>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={locked}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">Body</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={locked}
          rows={12}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm leading-relaxed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800"
        />
      </label>

      {!locked && (status === "APPROVED" || status === "READY_TO_SEND") && (
        <div>
          <span className="mb-1.5 block text-xs font-medium text-slate-500">Send via</span>
          <div className="flex flex-wrap gap-1.5">
            {CHANNEL_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  title={opt.hint}
                  onClick={() => opt.available && setChannel(opt.value)}
                  disabled={!opt.available}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                    channel === opt.value
                      ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                      : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-800",
                    !opt.available && "cursor-not-allowed opacity-40",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {opt.label}
                  {opt.value !== "EMAIL" && !opt.available && <span className="text-[10px]">(no contact info)</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
        <Button variant="outline" size="sm" onClick={copy}>
          <Copy className="h-3.5 w-3.5" /> Copy
        </Button>
        {!locked && (
          <Button variant="outline" size="sm" onClick={save} disabled={pending}>
            <Save className="h-3.5 w-3.5" /> Save edits
          </Button>
        )}
        <div className="flex-1" />
        {status === "DRAFT" && (
          <Button size="sm" onClick={approve} disabled={pending}>
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Approve
          </Button>
        )}
        {status === "APPROVED" && (
          <Button size="sm" onClick={readyToSend} disabled={pending}>
            <PackageCheck className="h-3.5 w-3.5" /> Mark Ready to Send
          </Button>
        )}
        {(status === "APPROVED" || status === "READY_TO_SEND") && (
          <Button size="sm" onClick={send} disabled={pending}>
            <Send className="h-3.5 w-3.5" /> Mark as Sent{channel !== "EMAIL" ? ` (${channel === "SMS" ? "SMS" : "LinkedIn"})` : ""}
          </Button>
        )}
        {!locked && (
          <Button variant="ghost" size="sm" onClick={archive} disabled={pending}>
            <Archive className="h-3.5 w-3.5" /> Archive
          </Button>
        )}
      </div>
    </div>
  );
}
