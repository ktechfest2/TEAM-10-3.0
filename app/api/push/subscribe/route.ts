import { z } from "zod";
import { sqlClient as sql } from "@/lib/db/client";
import { badRequest, parseJson } from "@/lib/server/http";
import { pushConfigured } from "@/lib/server/push";
import { rateLimited } from "@/lib/server/ratelimit";

const schema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({ p256dh: z.string().min(10).max(500), auth: z.string().min(5).max(500) }),
  topic: z.string().regex(/^(mission|place:[0-9-]{2,32})$/).default("mission"),
});

/** Saves a browser's push subscription. One device can watch the mission board and one place at the same time. */
export async function POST(request: Request) {
  if (!pushConfigured) return badRequest("Push alerts are not configured on this deployment.", 503);
  if (rateLimited(request, "push-sub", 20)) return badRequest("Too many attempts. Wait a minute and try again.", 429);
  const parsed = await parseJson(request, schema);
  if ("error" in parsed) return parsed.error;
  const { endpoint, keys, topic } = parsed.data;
  await sql`
    insert into push_subscriptions (endpoint, p256dh, auth, topic, last_seen_at)
    values (${endpoint}, ${keys.p256dh}, ${keys.auth}, ${topic}, now())
    on conflict (endpoint, topic)
    do update set p256dh = excluded.p256dh, auth = excluded.auth, last_seen_at = now()`;
  return Response.json({ ok: true });
}
