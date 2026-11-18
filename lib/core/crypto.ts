/**
 * Isomorphic cryptography used by both the offline client and the server.
 * Ed25519 (noble, audited, pure JS) so signing behaves identically on old
 * Android browsers and on Node. SHA-256 for content and ledger hashes.
 */
import * as ed from "@noble/ed25519";
import { sha256, sha512 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";

ed.hashes.sha512 = sha512;

export type KeyPair = { secretKeyHex: string; publicKeyHex: string };

export function generateKeyPair(): KeyPair {
  const { secretKey, publicKey } = ed.keygen();
  return { secretKeyHex: bytesToHex(secretKey), publicKeyHex: bytesToHex(publicKey) };
}

/** Deterministic keys for labelled DEMO actors only. Real users always use generateKeyPair on their own device. */
export function keyPairFromSeed(seed: Uint8Array): KeyPair {
  const { secretKey, publicKey } = ed.keygen(seed);
  return { secretKeyHex: bytesToHex(secretKey), publicKeyHex: bytesToHex(publicKey) };
}

export function publicKeyFromSecret(secretKeyHex: string): string {
  return bytesToHex(ed.getPublicKey(hexToBytes(secretKeyHex)));
}

export function sha256Hex(input: string | Uint8Array): string {
  return bytesToHex(sha256(typeof input === "string" ? utf8ToBytes(input) : input));
}

/** Signs a hex digest (the content hash). Returns a hex signature. */
export function signHash(hashHex: string, secretKeyHex: string): string {
  return bytesToHex(ed.sign(hexToBytes(hashHex), hexToBytes(secretKeyHex)));
}

export function verifyHash(hashHex: string, signatureHex: string, publicKeyHex: string): boolean {
  try {
    return ed.verify(hexToBytes(signatureHex), hexToBytes(hashHex), hexToBytes(publicKeyHex));
  } catch {
    return false;
  }
}

/**
 * Deterministic JSON: object keys sorted recursively, no whitespace.
 * Two devices must produce byte-identical output for the same data.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new TypeError("Non-finite numbers cannot be canonicalised");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
}

export { bytesToHex, hexToBytes };
