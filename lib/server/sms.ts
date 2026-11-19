import "server-only";

export type SmsOutcome = { status: "sent" | "failed" | "not_configured"; detail?: string };

/** True when an SMS provider is configured. Without one, alerts are still recorded and shown in the app, and the app says SMS is off. */
export function smsConfigured(): boolean {
  return Boolean(process.env.AT_USERNAME && process.env.AT_API_KEY);
}

/**
 * Sends one SMS through Africa's Talking. The username "sandbox" uses their free sandbox, where messages appear in
 * their online phone simulator instead of on real phones. A live username sends real SMS (paid per message).
 */
export async function sendSms(to: string, message: string): Promise<SmsOutcome> {
  const username = process.env.AT_USERNAME;
  const apiKey = process.env.AT_API_KEY;
  if (!username || !apiKey) return { status: "not_configured" };
  const host = username === "sandbox" ? "https://api.sandbox.africastalking.com" : "https://api.africastalking.com";
  const body = new URLSearchParams({ username, to, message });
  if (process.env.AT_SENDER_ID) body.set("from", process.env.AT_SENDER_ID);
  try {
    const res = await fetch(`${host}/version1/messaging`, {
      method: "POST",
      headers: { apiKey, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    const text = await res.text();
    if (!res.ok) return { status: "failed", detail: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    const data = JSON.parse(text) as { SMSMessageData?: { Recipients?: { status?: string; statusCode?: number }[]; Message?: string } };
    const r = data.SMSMessageData?.Recipients?.[0];
    // 100 Processed, 101 Sent, 102 Queued are successes in Africa's Talking's codes.
    if (r && r.statusCode !== undefined && r.statusCode >= 100 && r.statusCode <= 102) return { status: "sent", detail: r.status };
    return { status: "failed", detail: r?.status ?? data.SMSMessageData?.Message ?? "No recipient in the reply" };
  } catch (e) {
    return { status: "failed", detail: e instanceof Error ? e.message : "Request failed" };
  }
}
