/** SMTP/IMAP env-var config + "is this configured" checks. */

export function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;
  if (!host || !user || !pass) return null;
  return {
    host,
    port: Number(port) || 587,
    secure: Number(port) === 465,
    auth: { user, pass },
    fromName: process.env.EMAIL_FROM_NAME || "Mega Fleet Corp",
    fromAddress: process.env.EMAIL_FROM_ADDRESS || user,
  };
}

export function getImapConfig() {
  const host = process.env.IMAP_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;
  if (!host || !user || !pass) return null;
  return {
    host,
    port: Number(process.env.IMAP_PORT) || 993,
    secure: true,
    auth: { user, pass },
    mailbox: process.env.IMAP_MAILBOX || "INBOX",
  };
}

export function isSmtpConfigured() {
  return getSmtpConfig() !== null;
}

export function isImapConfigured() {
  return getImapConfig() !== null;
}
