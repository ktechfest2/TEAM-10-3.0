/**
 * Recovery codes: how a person logs back in on a new phone. 16 characters from a 32-letter alphabet (80 bits), shown once at
 * sign-up as XXXX-XXXX-XXXX-XXXX. No 0, O, 1, I or L, so a code read off paper or a screenshot is hard to mistype.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const LENGTH = 16;

export function newRecoveryCode(): string {
  const bytes = new Uint8Array(LENGTH);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]!).join("");
  return chars.match(/.{4}/g)!.join("-");
}

/** Accepts the code as typed (any case, spaces or dashes) and returns it in one canonical form, or null if it cannot be a code. */
export function normaliseRecoveryCode(input: string): string | null {
  const s = input.toUpperCase().replace(/[\s-]/g, "");
  return s.length === LENGTH && [...s].every((c) => ALPHABET.includes(c)) ? s : null;
}
