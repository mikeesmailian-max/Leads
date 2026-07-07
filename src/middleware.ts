import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  // Protect everything except: NextAuth's own API routes, the login page,
  // static assets, uploaded files, and the /api/cron/* routes (those use
  // their own CRON_SECRET bearer-token check in src/lib/cron/auth.ts since
  // they're called by a scheduler with no logged-in session).
  matcher: [
    "/((?!api/auth|api/cron|login|_next/static|_next/image|favicon.ico|uploads).*)",
  ],
};
