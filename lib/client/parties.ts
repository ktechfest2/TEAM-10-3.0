"use client";
/** A witness's party arrives with their signature QR and is remembered on this device. */
const key = (witnessKey: string) => `tally:party:${witnessKey}`;

export function rememberParty(witnessKey: string, party: string | null | undefined) {
  if (!party) return;
  try {
    localStorage.setItem(key(witnessKey), party);
  } catch {
    /* storage unavailable: the server still knows the party */
  }
}

export function rememberName(witnessKey: string, name: string | null | undefined) {
  if (!name) return;
  try {
    localStorage.setItem(`tally:name:${witnessKey}`, name);
  } catch {
    /* optional */
  }
}

export function nameOf(witnessKey: string): string | null {
  try {
    return localStorage.getItem(`tally:name:${witnessKey}`);
  } catch {
    return null;
  }
}

export function partyOf(witnessKey: string): string | null {
  try {
    return localStorage.getItem(key(witnessKey));
  } catch {
    return null;
  }
}
