export async function sendSms(body: string): Promise<{ ok: boolean; error?: string }> {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, ALERT_PHONE_NUMBER } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER || !ALERT_PHONE_NUMBER) {
    return { ok: false, error: "Twilio env vars not fully configured" };
  }

  try {
    const twilio = (await import("twilio")).default;
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    // SMS bodies are kept short (~150 chars) since carriers split/charge per segment.
    await client.messages.create({ to: ALERT_PHONE_NUMBER, from: TWILIO_FROM_NUMBER, body: body.slice(0, 300) });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Unknown Twilio error" };
  }
}


/**
 * Multi-channel outreach (recommendation #9) — sends an SMS to a specific
 * contact's phone number, unlike sendSms() above which always targets the
 * fixed ALERT_PHONE_NUMBER for the internal daily digest. Same Twilio
 * config, different recipient.
 */
export async function sendSmsToContact(to: string, body: string): Promise<{ ok: boolean; error?: string; sid?: string }> {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    return { ok: false, error: "Twilio env vars not fully configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER)" };
  }
  if (!to) return { ok: false, error: "Contact has no phone number on file" };

  try {
    const twilio = (await import("twilio")).default;
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    const message = await client.messages.create({ to, from: TWILIO_FROM_NUMBER, body: body.slice(0, 300) });
    return { ok: true, sid: message.sid };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Unknown Twilio error" };
  }
}
