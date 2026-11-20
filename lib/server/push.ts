import "server-only";
import webpush from "web-push";
import { sqlClient as sql } from "@/lib/db/client";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT ?? "mailto:team@tally.local";

/** False until the VAPID keys are set. The app then says push is not configured instead of pretending. */
export const pushConfigured = Boolean(publicKey && privateKey);
if (pushConfigured) webpush.setVapidDetails(subject, publicKey!, privateKey!);

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  kind?: "red" | "amber" | "green" | "grey";
  tag?: string;
};

type SubRow = { id: string; endpoint: string; p256dh: string; auth: string };

async function sendTo(sub: SubRow, payload: PushPayload, eventKey: string): Promise<boolean> {
  if (!pushConfigured) return false;
  // Claim first: a re-synced event must never buzz the same phone twice.
  const [claimed] = await sql<{ id: string }[]>`
    insert into push_deliveries (subscription_id, event_key)
    values (${sub.id}, ${eventKey})
    on conflict do nothing
    returning id`;
  if (!claimed) return false;
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 3600, urgency: payload.kind === "red" ? "high" : "normal" },
    );
    return true;
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    // The browser cleared its data or uninstalled: stop keeping a dead endpoint.
    if (status === 404 || status === 410) await sql`delete from push_subscriptions where id = ${sub.id}`;
    else await sql`delete from push_deliveries where subscription_id = ${sub.id} and event_key = ${eventKey}`;
    console.error("Push failed:", status ?? "", error instanceof Error ? error.message : error);
    return false;
  }
}

/** Sends one alert to every device watching a topic. Returns how many accepted it. */
export async function pushToTopic(topic: string, payload: PushPayload, eventKey: string): Promise<number> {
  if (!pushConfigured) return 0;
  const subs = await sql<SubRow[]>`select id, endpoint, p256dh, auth from push_subscriptions where topic = ${topic}`;
  let sent = 0;
  for (const sub of subs) if (await sendTo(sub, payload, eventKey)) sent++;
  return sent;
}
