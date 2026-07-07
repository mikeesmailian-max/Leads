import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron/auth";
import { checkHiringSignalsForAllAccounts } from "@/lib/prospecting/hiringSignals";

/**
 * Scheduled entry point for hiring-signal detection (recommendation #2).
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://yourapp/api/cron/hiring-signals
 * See .env.example for APOLLO_API_KEY / CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await checkHiringSignalsForAllAccounts();
  return NextResponse.json(result, { status: 200 });
}
