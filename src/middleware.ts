import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  // Protect everything except auth API routes, login page, static assets, and uploads.
  matcher: [
    "/((?!api/auth|login|_next/static|_next/image|favicon.ico|uploads).*)",
  ],
};
