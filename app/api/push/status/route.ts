import { sqlClient as sql } from "@/lib/db/client";
import { pushConfigured } from "@/lib/server/push";

/** Whether this browser is already registered for a topic. Used to show "Alerts on" after a reload. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const endpoint = url.searchParams.get("endpoint") ?? "";
  const topic = url.searchParams.get("topic") ?? "mission";
  if (!endpoint) return Response.json({ configured: pushConfigured, subscribed: false });
  const [row] = await sql`select 1 from push_subscriptions where endpoint = ${endpoint} and topic = ${topic} limit 1`;
  return Response.json({ configured: pushConfigured, subscribed: Boolean(row) });
}
