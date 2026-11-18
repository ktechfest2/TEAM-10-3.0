/**
 * Phone-to-phone exchange format for offline co-signing.
 * PO shows an "event" QR → agent verifies + signs → agent shows a "cosignature" QR → PO scans it back.
 */
import { z } from "zod";
import { signedEventSchema, type Cosignature, type SignedEvent } from "./events";

const PREFIX = "TALLY1:";

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

const toBase64Url = (s: string) => btoa(unescape(encodeURIComponent(s))).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
const fromBase64Url = (s: string) => decodeURIComponent(escape(atob(s.replaceAll("-", "+").replaceAll("_", "/"))));

export function encodeEventQr(e: SignedEvent): string {
  return PREFIX + toBase64Url(JSON.stringify({ k: "ev", e }));
}

export function encodeCosignatureQr(c: Cosignature, displayName?: string, party?: string | null): string {
  return PREFIX + toBase64Url(JSON.stringify({ k: "cs", c, n: displayName, p: party ?? null }));
}

export function decodeQr(text: string): QrMessage | null {
  if (!text.startsWith(PREFIX)) return null;
  try {
    const parsed = qrSchema.safeParse(JSON.parse(fromBase64Url(text.slice(PREFIX.length))));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
