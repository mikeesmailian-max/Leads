import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron/auth";
import { pollInbox } from "@/lib/email/imapClient";

/**
 * Scheduled entry point for email inbox ingestion. Call this on a timer
 * (every 5-15 minutes is reasonable) from Vercel Cron, an OS crontab, or
 * any external scheduler:
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://yourapp/api/cron/poll-inbox
 *
 * See .env.example for IMAP_HOST / EMAIL_USER / EMAIL_PASSWORD / CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await pollInbox();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
