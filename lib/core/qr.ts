/**
 * Phone-to-phone exchange format for offline co-signing.
 * PO shows an "event" QR → agent verifies + signs → agent shows a "cosignature" QR → PO scans it back.
 *
 * A QR code a camera must read off another phone's screen has to stay small. TALLY2 carries only what cannot be recomputed:
 * the content hash is dropped (the receiver recomputes it from the fields, so any change still fails the signature check),
 * keys and signatures travel as base64 instead of hex, and fields are positional. TALLY1 (the first, larger format) still decodes.
 */
import { z } from "zod";
import { contentHashOf, EVENT_TYPES, signedEventSchema, type Cosignature, type SignedEvent } from "./events";

const PREFIX_V1 = "TALLY1:";
const PREFIX_V2 = "TALLY2:";

const cosignatureSchema = z.object({
  contentHash: z.string().regex(/^[0-9a-f]{64}$/),
  witnessKey: z.string().regex(/^[0-9a-f]{64}$/),
  signature: z.string().regex(/^[0-9a-f]{128}$/),
  signedAt: z.string().datetime(),
});

const qrSchema = z.discriminatedUnion("k", [
  z.object({ k: z.literal("ev"), e: signedEventSchema }),
  z.object({ k: z.literal("cs"), c: cosignatureSchema, n: z.string().max(60).optional(), p: z.string().max(8).nullable().optional() }),
]);
export type QrMessage = z.infer<typeof qrSchema>;

const hexToB64u = (hex: string) => {
  let bin = "";
  for (let i = 0; i < hex.length; i += 2) bin += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
};
const b64uToHex = (b64: string) =>
  [...atob(b64.replaceAll("-", "+").replaceAll("_", "/"))].map((c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");

const fromBase64Url = (s: string) => decodeURIComponent(escape(atob(s.replaceAll("-", "+").replaceAll("_", "/"))));

/** Event: ["e", id, typeIndex, placeCode, ms, authorKey, signature, payload] */
export function encodeEventQr(e: SignedEvent): string {
  const type = EVENT_TYPES.indexOf(e.type);
  return PREFIX_V2 + JSON.stringify(["e", e.id, type, e.placeCode, Date.parse(e.occurredAt), hexToB64u(e.authorKey), hexToB64u(e.signature), e.payload]);
}

/** Co-signature: ["c", contentHash, witnessKey, signature, ms, name, party] */
export function encodeCosignatureQr(c: Cosignature, displayName?: string, party?: string | null): string {
  return PREFIX_V2 + JSON.stringify(["c", hexToB64u(c.contentHash), hexToB64u(c.witnessKey), hexToB64u(c.signature), Date.parse(c.signedAt), displayName ?? null, party ?? null]);
}

function decodeV2(body: string): QrMessage | null {
  const a: unknown = JSON.parse(body);
  if (!Array.isArray(a)) return null;
  if (a[0] === "e" && a.length === 8) {
    const [, id, typeIndex, placeCode, ms, authorB64, sigB64, payload] = a as [string, string, number, string, number, string, string, unknown];
    const type = EVENT_TYPES[typeIndex];
    if (!type || !Number.isFinite(ms)) return null;
    const authorKey = b64uToHex(authorB64);
    const occurredAt = new Date(ms).toISOString();
    // The hash is recomputed here, never trusted from the sender: a changed field gives a hash the signature does not match.
    const candidate = { id, type, placeCode, payload, occurredAt, authorKey, contentHash: contentHashOf({ type, placeCode, payload, occurredAt, authorKey }), signature: b64uToHex(sigB64) };
    const parsed = qrSchema.safeParse({ k: "ev", e: candidate });
    return parsed.success ? parsed.data : null;
  }
  if (a[0] === "c" && a.length === 7) {
    const [, hashB64, keyB64, sigB64, ms, name, party] = a as [string, string, string, string, number, string | null, string | null];
    const parsed = qrSchema.safeParse({ k: "cs", c: { contentHash: b64uToHex(hashB64), witnessKey: b64uToHex(keyB64), signature: b64uToHex(sigB64), signedAt: new Date(ms).toISOString() }, n: name ?? undefined, p: party });
    return parsed.success ? parsed.data : null;
  }
  return null;
}

export function decodeQr(text: string): QrMessage | null {
  try {
    if (text.startsWith(PREFIX_V2)) return decodeV2(text.slice(PREFIX_V2.length));
    if (text.startsWith(PREFIX_V1)) {
      const parsed = qrSchema.safeParse(JSON.parse(fromBase64Url(text.slice(PREFIX_V1.length))));
      return parsed.success ? parsed.data : null;
    }
    return null;
  } catch {
    return null;
  }
}
