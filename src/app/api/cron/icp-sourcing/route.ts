import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron/auth";
import { runIcpSourcing } from "@/lib/prospecting/icpSourcing";

/**
 * Scheduled entry point for ICP-based account sourcing (recommendation #1).
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://yourapp/api/cron/icp-sourcing
 * See .env.example for APOLLO_API_KEY / CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runIcpSourcing(null);
  return NextResponse.json(result, { status: result.ok ? 200 : 200 });
}
