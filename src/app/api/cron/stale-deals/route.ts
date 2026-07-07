import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron/auth";
import { escalateStaleAccounts } from "@/lib/tasks/staleDeals";

/**
 * Scheduled entry point for stale-deal auto-escalation (recommendation #6).
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://yourapp/api/cron/stale-deals
 * See .env.example for CRON_SECRET. No external API needed — pure internal logic.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await escalateStaleAccounts();
  return NextResponse.json(result, { status: 200 });
}
