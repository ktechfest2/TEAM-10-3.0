import "server-only";
import { openedSms, relocationSms } from "@/lib/core/relocation";
import type { SignedEvent } from "@/lib/core/events";
import { sqlClient as sql } from "@/lib/db/client";
import { sendSms, type SmsOutcome } from "./sms";

/** The public address used in text messages. Vercel sets the production host; PUBLIC_URL overrides it. */
export function siteUrl(): string {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

export type Relocation = { toName: string; toCode?: string; lat: number; lng: number; distanceKm?: number; reason: string; estimated: boolean; at: string; demo: boolean };

/** The latest move of a polling unit, if it has moved. */
export async function getRelocation(code: string): Promise<Relocation | null> {
  const [row] = await sql<{ payload: Omit<Relocation, "at" | "demo" | "estimated"> & { estimated?: boolean }; occurred_at: Date; is_demo: number }[]>`
    select e.payload, e.occurred_at, a.is_demo from events e join actors a on a.id = e.author_id
    where e.type = 'pu.relocated' and e.place_code = ${code} order by e.seq desc limit 1`;
  if (!row) return null;
  return { ...row.payload, estimated: Boolean(row.payload.estimated), at: new Date(row.occurred_at).toISOString(), demo: row.is_demo === 1 };
}

async function deliver(subscriptionId: string, phone: string, contentHash: string, message: string): Promise<SmsOutcome | null> {
  // Claim the delivery first: if this event already went to this person, do nothing.
  const [claimed] = await sql`insert into alert_deliveries (subscription_id, content_hash, message, status)
    values (${subscriptionId}, ${contentHash}, ${message}, 'sending') on conflict do nothing returning id`;
  if (!claimed) return null;
  const outcome = await sendSms(phone, message);
  await sql`update alert_deliveries set status = ${outcome.status}, detail = ${outcome.detail ?? null} where id = ${claimed.id}`;
  return outcome;
}

/** Texts everyone following the unit about an event that changes their day: a move, or voting starting. Idempotent. */
export async function notifyFor(event: Pick<SignedEvent, "type" | "placeCode" | "payload" | "contentHash">): Promise<{ sent: number; failed: number; off: number }> {
  const tally = { sent: 0, failed: 0, off: 0 };
  if (event.type !== "pu.relocated" && event.type !== "pu.opened") return tally;
  const [place] = await sql<{ name: string }[]>`select name from places where code = ${event.placeCode}`;
  if (!place) return tally;
  const link = `${siteUrl()}/p/${event.placeCode}`;
  const p = event.payload as { toName?: string; distanceKm?: number };
  const message = event.type === "pu.relocated" ? relocationSms(place.name, p.toName ?? "a new site", p.distanceKm, link) : openedSms(place.name, link);
  const subs = await sql<{ id: string; phone: string }[]>`select id, phone from alert_subscriptions where place_code = ${event.placeCode}`;
  for (const s of subs) {
    const r = await deliver(s.id, s.phone, event.contentHash, message);
    if (!r) continue;
    if (r.status === "sent") tally.sent++;
    else if (r.status === "failed") tally.failed++;
    else tally.off++;
  }
  return tally;
}

/** Follows a unit by SMS. Sends a confirmation, and the current move if the unit has already moved. */
export async function subscribe(placeCode: string, phone: string): Promise<{ created: boolean; confirmation: SmsOutcome; relocation: Relocation | null }> {
  const [place] = await sql<{ name: string }[]>`select name from places where code = ${placeCode} and level = 'pu'`;
  if (!place) throw new Error("Unknown polling unit");
  const [row] = await sql<{ id: string }[]>`insert into alert_subscriptions (place_code, phone) values (${placeCode}, ${phone})
    on conflict (place_code, phone) do update set place_code = excluded.place_code returning id, (xmax = 0) as created`;
  const created = Boolean((row as unknown as { created: boolean }).created);
  const relocation = await getRelocation(placeCode);
  const link = `${siteUrl()}/p/${placeCode}`;
  const text = relocation
    ? relocationSms(place.name, relocation.toName, relocation.distanceKm, link)
    : `Tally: you will get a text if ${place.name} moves, and when voting starts there. ${link}`;
  // Signing up again never texts the number again, so the form cannot be used to flood someone's phone.
  let confirmation = await deliver(row!.id, phone, "welcome", text);
  if (!confirmation) {
    const [prev] = await sql<{ status: SmsOutcome["status"] }[]>`select status from alert_deliveries where subscription_id = ${row!.id} and content_hash = 'welcome'`;
    confirmation = { status: prev?.status ?? "sent" };
  }
  return { created, confirmation, relocation };
}

export async function unsubscribe(placeCode: string, phone: string): Promise<boolean> {
  const rows = await sql`delete from alert_subscriptions where place_code = ${placeCode} and phone = ${phone} returning id`;
  return rows.length > 0;
}

export async function followerCount(placeCode: string): Promise<number> {
  const [r] = await sql<{ n: number }[]>`select count(*)::int as n from alert_subscriptions where place_code = ${placeCode}`;
  return r?.n ?? 0;
}
