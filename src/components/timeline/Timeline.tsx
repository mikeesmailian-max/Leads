import {
  FileText,
  Building2,
  UserPlus,
  Send,
  CheckCircle2,
  MessageSquare,
  ListChecks,
  StickyNote,
  ArrowRightCircle,
  GitMerge,
  ShieldCheck,
} from "lucide-react";
import { relativeTime, formatDateTime } from "@/lib/utils";
import type { ActivityType } from "@prisma/client";

const ICONS: Record<ActivityType, any> = {
  CREATED: CheckCircle2,
  UPDATED: ArrowRightCircle,
  STAGE_CHANGED: ArrowRightCircle,
  UPLOAD_PARSED: FileText,
  ACCOUNT_MATCHED: Building2,
  ACCOUNT_MERGED: GitMerge,
  CONTACT_DISCOVERED: UserPlus,
  CONTACT_VERIFIED: ShieldCheck,
  DRAFT_GENERATED: Send,
  DRAFT_APPROVED: CheckCircle2,
  TASK_CREATED: ListChecks,
  TASK_COMPLETED: CheckCircle2,
  EMAIL_SENT: Send,
  REPLY_RECEIVED: MessageSquare,
  REPLY_CLASSIFIED: MessageSquare,
  NOTE_ADDED: StickyNote,
};

export interface TimelineEntry {
  id: string;
  type: ActivityType | "NOTE";
  summary: string;
  createdAt: Date;
  actorName?: string | null;
}

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">No activity yet.</p>;
  }

  return (
    <ol className="relative space-y-0">
      {entries.map((entry, idx) => {
        const Icon = entry.type === "NOTE" ? StickyNote : ICONS[entry.type as ActivityType] ?? ArrowRightCircle;
        const isLast = idx === entries.length - 1;
        return (
          <li key={entry.id} className="relative flex gap-3 pb-5">
            {!isLast && <span className="absolute left-[13px] top-6 h-full w-px bg-slate-200 dark:bg-slate-800" />}
            <span className="z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <Icon className="h-3.5 w-3.5 text-slate-500" />
            </span>
            <div className="pt-0.5">
              <p className="text-sm text-slate-700 dark:text-slate-300">{entry.summary}</p>
              <p className="text-xs text-slate-400" title={formatDateTime(entry.createdAt)}>
                {relativeTime(entry.createdAt)}
                {entry.actorName ? ` · ${entry.actorName}` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
