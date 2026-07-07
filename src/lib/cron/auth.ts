import { NextRequest } from "next/server";

/**
 * Simple bearer-token check for the /api/cron/* routes. Set CRON_SECRET in
 * .env and have your scheduler (Vercel Cron, an OS crontab + curl, GitHub
 * Actions, etc.) call the route with `Authorization: Bearer <CRON_SECRET>`.
 * Returns true if the request is authorized.
 */
export function isAuthorizedCronRequest(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // never allow an unprotected cron route
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}
