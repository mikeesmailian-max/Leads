import { getDashboardData } from "@/lib/dashboard/queries";
import { postToSlack } from "./slack";
import { sendSms } from "./sms";

export interface DailyDigestResult {
  message: string;
  slack: { ok: boolean; error?: string } | null;
  sms: { ok: boolean; error?: string } | null;
}

function composeDigestMessage(data: Awaited<ReturnType<typeof getDashboardData>>): string {
  const { kpis, queues } = data;
  const lines = [
    "*Mega Fleet — Daily Prospecting Digest*",
    `• Follow-ups due today: ${kpis.followUpsDueToday}`,
    `• Replies waiting review: ${kpis.repliesWaitingReview}`,
    `• Drafts ready to send: ${kpis.draftsReady}`,
    `• Uploads awaiting review: ${kpis.uploadsAwaitingReview}`,
    `• Contacts needing verification: ${kpis.contactsNeedingVerification}`,
  ];
  if (queues.repliedInterestedCount > 0) lines.push(`• 🔥 ${queues.repliedInterestedCount} account(s) marked Interested/Quoting`);
  if (queues.followUpDueCount > 0) lines.push(`• ⏰ ${queues.followUpDueCount} follow-up task(s) overdue or due now`);
  return lines.join("\n");
}

function composeSmsMessage(data: Awaited<ReturnType<typeof getDashboardData>>): string {
  const { kpis } = data;
  return `Mega Fleet: ${kpis.followUpsDueToday} follow-ups due, ${kpis.repliesWaitingReview} replies to review, ${kpis.draftsReady} drafts ready to send.`;
}

/**
 * Composes and delivers the daily prospecting digest to whichever channels
 * are configured (Slack webhook and/or Twilio SMS — either, both, or
 * neither is fine; unconfigured channels are simply skipped). Triggered by
 * src/app/api/cron/daily-digest/route.ts on a schedule.
 */
export async function runDailyDigest(): Promise<DailyDigestResult> {
  const data = await getDashboardData();
  const message = composeDigestMessage(data);

  const slack = process.env.SLACK_WEBHOOK_URL ? await postToSlack(message) : null;
  const sms = process.env.TWILIO_ACCOUNT_SID ? await sendSms(composeSmsMessage(data)) : null;

  return { message, slack, sms };
}
