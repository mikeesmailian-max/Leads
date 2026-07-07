"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Save, CheckCircle2, Send, Archive, Copy, Loader2, PackageCheck } from "lucide-react";
import { updateDraftAction, approveDraftAction, markReadyToSendAction, sendDraftAction, archiveDraftAction } from "@/lib/actions/outreach";
import { Button } from "@/components/ui/Button";

export function DraftEditor({
  draftId,
  initialSubject,
  initialBody,
  status,
}: {
  draftId: string;
  initialSubject: string;
  initialBody: string;
  status: string;
}) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
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
    if (!confirm("Mark this draft as sent? This logs it to the outreach history and starts follow-up tasks.")) return;
    startTransition(async () => {
      await sendDraftAction(draftId);
      toast.success("Marked as sent");
      router.refresh();
    });
  }

  function archive() {
    startTransition(async () => {
      await archiveDraftAction(draftId);
      toast.success("Archived");
      router.push("/outreach");
    });
  }

  function copy() {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    toast.success("Copied to clipboard");
  }

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
            <Send className="h-3.5 w-3.5" /> Mark as Sent
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
