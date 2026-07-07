import { getSmtpConfig } from "./config";

export interface SendMailInput {
  to: string;
  subject: string;
  body: string; // plain text
  inReplyToMessageId?: string | null;
}

export interface SendMailResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Sends outreach email over SMTP using nodemailer. Works with Gmail (app
 * password), Office 365, or any standard SMTP provider — see .env.example
 * for the exact variables. If SMTP isn't configured, callers should fall
 * back to the v1 manual-copy behavior; this function never throws, it
 * returns { ok: false, error } so the caller can decide what to do.
 */
export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const config = getSmtpConfig();
  if (!config) {
    return { ok: false, error: "SMTP not configured (set SMTP_HOST / EMAIL_USER / EMAIL_PASSWORD in .env)" };
  }

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });

    const headers: Record<string, string> = {};
    if (input.inReplyToMessageId) {
      headers["In-Reply-To"] = input.inReplyToMessageId;
      headers["References"] = input.inReplyToMessageId;
    }

    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromAddress}>`,
      to: input.to,
      subject: input.subject,
      text: input.body,
      headers,
    });

    return { ok: true, messageId: info.messageId };
  } catch (err: any) {
    console.error("sendMail failed:", err);
    return { ok: false, error: err?.message || "Unknown SMTP error" };
  }
}
