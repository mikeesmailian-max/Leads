import { isSmtpConfigured, isImapConfigured } from "@/lib/email/config";

/**
 * Single source of truth for "is integration X configured", used by the
 * Settings page status cards so Mike can see what's live without grepping
 * through .env. Each of these is a pure env-var presence check — no
 * network calls, safe to run on every Settings page load.
 */
export function getIntegrationStatus() {
  return {
    ocrTextract: Boolean(process.env.OCR_PROVIDER === "aws-textract" && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
    emailInbox: isImapConfigured(),
    emailSend: isSmtpConfigured(),
    apolloEnrichment: Boolean(process.env.APOLLO_API_KEY),
    slackAlerts: Boolean(process.env.SLACK_WEBHOOK_URL),
    smsAlerts: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER && process.env.ALERT_PHONE_NUMBER),
    cronProtected: Boolean(process.env.CRON_SECRET),
  };
}
