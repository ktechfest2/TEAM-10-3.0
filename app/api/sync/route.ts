import { after } from "next/server";
import { z } from "zod";
import { anchorPending } from "@/lib/server/anchor";
import { signedEventSchema } from "@/lib/core/events";
import { parseJson } from "@/lib/server/http";
import { ingest } from "@/lib/server/ledger";

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
  for (const item of parsed.data.items) {
    results.push(await ingest(item, request.headers.get("x-tally-channel") ?? "app"));
  }
  // Anchor new entries to Bitcoin (via OpenTimestamps) at most every 10 minutes, after responding.
  after(() => anchorPending().catch((e) => console.error("Anchoring failed:", e)));
  return Response.json({ results });
}
