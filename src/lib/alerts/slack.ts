export async function postToSlack(text: string): Promise<{ ok: boolean; error?: string }> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return { ok: false, error: "SLACK_WEBHOOK_URL not configured" };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return { ok: false, error: `Slack webhook returned ${res.status}` };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Unknown Slack error" };
  }
}
