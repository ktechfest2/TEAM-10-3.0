import { after } from "next/server";
import { z } from "zod";
import { anchorPending } from "@/lib/server/anchor";
import { signedEventSchema } from "@/lib/core/events";
import { parseJson } from "@/lib/server/http";
import { notifyFor } from "@/lib/server/alerts";
import { ingest } from "@/lib/server/ledger";
import { notifyEvent, notifySeal } from "@/lib/server/push-events";

const cosignature = z.object({
  contentHash: z.string().regex(/^[0-9a-f]{64}$/),
  witnessKey: z.string().regex(/^[0-9a-f]{64}$/),
  signature: z.string().regex(/^[0-9a-f]{128}$/),
  signedAt: z.string().datetime(),
});

const schema = z.object({
  items: z
    .array(z.object({ event: signedEventSchema.optional(), cosignatures: z.array(cosignature).max(20).optional() }))
    .min(1)
    .max(50),
});

/**
 * Offline outbox flush. Idempotent: any device that holds a signed event or co-signature
 * (author, agent, or a relaying phone) can submit it; duplicates are acknowledged, not repeated.
 * Events are processed before co-signatures so a batch can carry both.
 */
export async function POST(request: Request) {
  const parsed = await parseJson(request, schema);
  if ("error" in parsed) return parsed.error;
  const results = [];
  const alerts: NonNullable<(typeof parsed.data.items)[number]["event"]>[] = [];
  const pushable: NonNullable<(typeof parsed.data.items)[number]["event"]>[] = [];
  const sealedTargets = new Set<string>();
  for (const item of parsed.data.items) {
    const r = await ingest(item, request.headers.get("x-tally-channel") ?? "app");
    results.push(r);
    if (r.status === "accepted" && item.event) {
      pushable.push(item.event);
      if (item.event.type === "pu.relocated" || item.event.type === "pu.opened") alerts.push(item.event);
    }
    for (const c of item.cosignatures ?? []) {
      if (r.cosignatures.some((x) => x.witnessKey === c.witnessKey && x.status === "accepted")) sealedTargets.add(c.contentHash);
    }
  }
  // Text and notify the people following these units, after responding so a slow provider never delays the phone.
  after(async () => {
    for (const e of alerts) await notifyFor(e).catch((err) => console.error("SMS alert failed:", err));
    for (const e of pushable) await notifyEvent(e).catch((err) => console.error("Push alert failed:", err));
    for (const hash of sealedTargets) await notifySeal(hash).catch((err) => console.error("Seal push failed:", err));
  });
  // Anchor new entries to Bitcoin (via OpenTimestamps) at most every 10 minutes, after responding.
  after(() => anchorPending().catch((e) => console.error("Anchoring failed:", e)));
  return Response.json({ results });
}
