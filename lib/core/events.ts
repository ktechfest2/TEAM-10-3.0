/**
 * The one primitive: an Event — "something happened, at this place, at this time" —
 * authored and signed by an actor, then co-signed by witnesses.
 */
import { z } from "zod";
import { canonicalJson, sha256Hex, signHash, verifyHash } from "./crypto";

export const ROLES = [
  "presiding_officer",
  "party_agent",
  "observer",
  "community_leader",
  "collation_officer",
  "logistics",
  "citizen",
  "system",
] as const;
export type Role = (typeof ROLES)[number];

export const EVENT_TYPES = [
  "material.dispatched",
  "material.received",
  "staff.checked_in",
  "pu.opened",
  "pu.queue",
  "pu.closed",
  "result.declared",
  "transmission.attempted",
  "cancellation.recorded",
  "collation.entered",
  "incident.reported",
  "claim.reported",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** Which roles may author which event types. Enforced server-side. */
export const AUTHOR_ROLES: Record<EventType, readonly Role[]> = {
  "material.dispatched": ["logistics", "presiding_officer"],
  "material.received": ["logistics", "presiding_officer"],
  "staff.checked_in": ["presiding_officer", "logistics"],
  "pu.opened": ["presiding_officer"],
  "pu.queue": ["presiding_officer", "citizen", "observer", "party_agent", "community_leader"],
  "pu.closed": ["presiding_officer"],
  "result.declared": ["presiding_officer"],
  "transmission.attempted": ["presiding_officer"],
  "cancellation.recorded": ["presiding_officer", "collation_officer"],
  "collation.entered": ["collation_officer"],
  "incident.reported": ["citizen", "observer", "party_agent", "community_leader", "presiding_officer"],
  "claim.reported": ["citizen", "observer", "party_agent", "community_leader", "system"],
};

export const resultFiguresSchema = z.object({
  votes: z.record(z.string().regex(/^[A-Z0-9]{2,8}$/), z.number().int().min(0).max(100_000)),
  accredited: z.number().int().min(0).max(100_000),
  registered: z.number().int().min(0).max(100_000).optional(),
  rejected: z.number().int().min(0).max(100_000),
  totalValid: z.number().int().min(0).max(1_000_000),
});
export type ResultFigures = z.infer<typeof resultFiguresSchema>;

export const resultDeclaredPayload = z.object({
  figures: resultFiguresSchema,
  photoSha256: z.string().regex(/^[0-9a-f]{64}$/).optional(),
  readBy: z.enum(["model", "manual"]),
});

export const totalsSchema = resultFiguresSchema.omit({ registered: true });

/**
 * Mirrors the real collation forms (EC8B/C/D/E): one row per child unit as read out,
 * plus the announced total. Rows let Tally pinpoint exactly which child diverged.
 */
export const collationEnteredPayload = z.object({
  level: z.enum(["ward", "lga", "state", "national"]),
  rows: z.array(z.object({ code: z.string().min(2), totals: totalsSchema })).min(1),
  announced: totalsSchema,
});

export const transmissionPayload = z.object({
  outcome: z.enum(["success", "failed"]),
  detail: z.string().max(280).optional(),
});

export const freeTextPayload = z.object({
  text: z.string().min(1).max(2000),
  data: z.record(z.string(), z.unknown()).optional(),
});

export const PAYLOAD_SCHEMAS: Record<EventType, z.ZodType> = {
  "material.dispatched": freeTextPayload,
  "material.received": freeTextPayload,
  "staff.checked_in": freeTextPayload,
  "pu.opened": freeTextPayload,
  "pu.queue": z.object({ level: z.enum(["short", "medium", "long"]) }),
  "pu.closed": freeTextPayload,
  "result.declared": resultDeclaredPayload,
  "transmission.attempted": transmissionPayload,
  "cancellation.recorded": freeTextPayload.extend({ registeredAffected: z.number().int().min(0) }),
  "collation.entered": collationEnteredPayload,
  "incident.reported": freeTextPayload,
  "claim.reported": freeTextPayload,
};

/** The signed, portable form of an event. Created offline, verifiable anywhere. */
export const signedEventSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(EVENT_TYPES),
  placeCode: z.string().min(2).max(32),
  payload: z.unknown(),
  occurredAt: z.string().datetime(),
  authorKey: z.string().regex(/^[0-9a-f]{64}$/),
  contentHash: z.string().regex(/^[0-9a-f]{64}$/),
  signature: z.string().regex(/^[0-9a-f]{128}$/),
});
export type SignedEvent = z.infer<typeof signedEventSchema>;

export type UnsignedEvent = Omit<SignedEvent, "contentHash" | "signature">;

/** The exact bytes every signer commits to. `id` is excluded so content, not transport, is signed. */
export function contentHashOf(e: Pick<UnsignedEvent, "type" | "placeCode" | "payload" | "occurredAt" | "authorKey">): string {
  return sha256Hex(
    canonicalJson({
      v: 1,
      type: e.type,
      placeCode: e.placeCode,
      payload: e.payload,
      occurredAt: e.occurredAt,
      authorKey: e.authorKey,
    }),
  );
}

export function signEvent(e: UnsignedEvent, secretKeyHex: string): SignedEvent {
  const contentHash = contentHashOf(e);
  return { ...e, contentHash, signature: signHash(contentHash, secretKeyHex) };
}

export type EventCheck = { ok: true } | { ok: false; reason: string };

/** Full integrity check: hash matches content, signature matches author, payload matches type. */
export function verifySignedEvent(e: SignedEvent): EventCheck {
  if (contentHashOf(e) !== e.contentHash) return { ok: false, reason: "content hash does not match content" };
  if (!verifyHash(e.contentHash, e.signature, e.authorKey)) return { ok: false, reason: "author signature invalid" };
  const parsed = PAYLOAD_SCHEMAS[e.type].safeParse(e.payload);
  if (!parsed.success) return { ok: false, reason: `invalid payload: ${parsed.error.issues[0]?.message ?? "unknown"}` };
  return { ok: true };
}

/** A witness co-signature over an event's content hash. */
export type Cosignature = { contentHash: string; witnessKey: string; signature: string; signedAt: string };

export function cosign(contentHash: string, witnessSecretHex: string, witnessKey: string, signedAt: string): Cosignature {
  return { contentHash, witnessKey, signature: signHash(contentHash, witnessSecretHex), signedAt };
}

export function verifyCosignature(c: Cosignature): boolean {
  return verifyHash(c.contentHash, c.signature, c.witnessKey);
}

/** Ledger link: each accepted event extends the chain. */
export function ledgerHashOf(prevLedgerHash: string, contentHash: string): string {
  return sha256Hex(`${prevLedgerHash}:${contentHash}`);
}

export const GENESIS_HASH = "0".repeat(64);

export type LedgerEntry = { seq: number; contentHash: string; prevHash: string; ledgerHash: string };

/** Re-walks the chain. Returns the first broken seq, or null if intact. */
export function findChainBreak(entries: LedgerEntry[]): number | null {
  let prev = GENESIS_HASH;
  for (const entry of [...entries].sort((a, b) => a.seq - b.seq)) {
    if (entry.prevHash !== prev || ledgerHashOf(prev, entry.contentHash) !== entry.ledgerHash) return entry.seq;
    prev = entry.ledgerHash;
  }
  return null;
}
