import { cn } from "@/lib/utils";
import { titleCase } from "@/lib/utils";

export type ChipTone = "slate" | "blue" | "green" | "amber" | "red" | "purple" | "teal" | "pink";

const toneClasses: Record<ChipTone, string> = {
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  red: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  purple: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  teal: "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  pink: "bg-pink-50 text-pink-700 dark:bg-pink-950 dark:text-pink-300",
};

export function StatusChip({
  label,
  tone = "slate",
  dot = false,
  className,
}: {
  label: string;
  tone?: ChipTone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        toneClasses[tone],
        className,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", toneClasses[tone].split(" ")[1])} />}
      {titleCase(label)}
    </span>
  );
}

const STAGE_TONES: Record<string, ChipTone> = {
  NEW_FROM_UPLOAD: "slate",
  RESEARCHING: "blue",
  CONTACT_FOUND: "blue",
  DRAFT_READY: "purple",
  SENT: "teal",
  REPLIED: "amber",
  INTERESTED: "green",
  QUOTING: "green",
  CUSTOMER: "green",
  WON: "green",
  LOST: "red",
  ARCHIVED: "slate",
};

const DOC_STATUS_TONES: Record<string, ChipTone> = {
  UPLOADED: "slate",
  PROCESSING: "blue",
  PARSED: "teal",
  NEEDS_REVIEW: "amber",
  APPROVED: "green",
  ERROR: "red",
};

const CONTACT_STATUS_TONES: Record<string, ChipTone> = {
  NEW: "slate",
  UNVERIFIED: "amber",
  VERIFIED: "green",
  DRAFTED: "purple",
  EMAILED: "teal",
  REPLIED: "blue",
  INTERESTED: "green",
  WRONG_CONTACT: "red",
  DEAD: "slate",
};

const TASK_PRIORITY_TONES: Record<string, ChipTone> = {
  LOW: "slate",
  MEDIUM: "blue",
  HIGH: "amber",
  URGENT: "red",
};

const TASK_STATUS_TONES: Record<string, ChipTone> = {
  OPEN: "slate",
  IN_PROGRESS: "blue",
  DONE: "green",
  CANCELLED: "slate",
};

const DRAFT_STATUS_TONES: Record<string, ChipTone> = {
  DRAFT: "slate",
  APPROVED: "blue",
  READY_TO_SEND: "purple",
  SENT: "teal",
  ARCHIVED: "slate",
};

const REPLY_CATEGORY_TONES: Record<string, ChipTone> = {
  INTERESTED: "green",
  NOT_INTERESTED: "red",
  WRONG_CONTACT: "amber",
  SEND_RATES: "blue",
  SEND_CAPACITY: "blue",
  QUOTE_REQUEST: "purple",
  LATER: "slate",
  UNSUBSCRIBE: "red",
  OUT_OF_OFFICE: "slate",
  UNKNOWN: "slate",
};

export function StageChip({ stage }: { stage: string }) {
  return <StatusChip label={stage} tone={STAGE_TONES[stage] ?? "slate"} />;
}
export function DocStatusChip({ status }: { status: string }) {
  return <StatusChip label={status} tone={DOC_STATUS_TONES[status] ?? "slate"} />;
}
export function ContactStatusChip({ status }: { status: string }) {
  return <StatusChip label={status} tone={CONTACT_STATUS_TONES[status] ?? "slate"} />;
}
export function PriorityChip({ priority }: { priority: string }) {
  return <StatusChip label={priority} tone={TASK_PRIORITY_TONES[priority] ?? "slate"} />;
}
export function TaskStatusChip({ status }: { status: string }) {
  return <StatusChip label={status} tone={TASK_STATUS_TONES[status] ?? "slate"} />;
}
export function DraftStatusChip({ status }: { status: string }) {
  return <StatusChip label={status} tone={DRAFT_STATUS_TONES[status] ?? "slate"} />;
}
export function ReplyCategoryChip({ category }: { category: string }) {
  return <StatusChip label={category} tone={REPLY_CATEGORY_TONES[category] ?? "slate"} />;
}

const SENTIMENT_TONES: Record<string, ChipTone> = {
  HOT: "red",
  WARM: "amber",
  NEUTRAL: "slate",
  COLD: "blue",
};

/** Reply sentiment auto-triage badge (recommendation #7) — hot/warm/neutral/cold, so the hottest replies bubble up visually. */
export function SentimentChip({ tier }: { tier: string | null | undefined }) {
  if (!tier) return null;
  return <StatusChip label={tier} tone={SENTIMENT_TONES[tier] ?? "slate"} dot />;
}
