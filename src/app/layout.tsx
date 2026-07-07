import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Mega Fleet Sales Prospecting & RC Intelligence Dashboard",
  description: "Freight-specific sales prospecting and outreach machine for Mega Fleet Corp.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
