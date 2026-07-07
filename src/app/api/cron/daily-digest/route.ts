import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron/auth";
import { runDailyDigest } from "@/lib/alerts/dailyDigest";

/**
 * Scheduled entry point for the daily Slack/SMS digest. Call once a day,
 * e.g. weekday mornings:
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://yourapp/api/cron/daily-digest
 *
 * See .env.example for SLACK_WEBHOOK_URL / TWILIO_* / CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runDailyDigest();
  return NextResponse.json(result);
}
