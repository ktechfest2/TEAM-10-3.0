import { sha256Hex } from "./crypto";

export type UnitSite = { code: string; name: string; ward: string; lat: number; lng: number };
export type PlannedMove = { from: UnitSite; to: UnitSite; distanceKm: number; reason: string };

/** Reasons polling units are moved in practice (INEC relocation notices). */
export const MOVE_REASONS = [
  "The building is under renovation",
  "The site floods in the rainy season",
  "Moved out of a private compound to a public building",
  "The site was too small for the number of voters",
  "Access dispute with the owner of the site",
  "Merged into a nearby site to reduce the walk for most voters",
] as const;

const R_KM = 6371;
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.sqrt(h));
}

const usable = (u: UnitSite) => Number.isFinite(u.lat) && Number.isFinite(u.lng) && !(u.lat === 0 && u.lng === 0);
const score = (code: string) => parseInt(sha256Hex(`relocate:${code}`).slice(0, 8), 16) / 0xffffffff;

/**
 * Estimated relocations for testing alerts, not announced moves. Deterministic: the same units are picked every run.
 * A picked unit moves to the nearest different site in its own ward, between 0.3 and 6 km away, which is how real
 * relocations usually look. Units without a location, or with no suitable neighbour, are never picked.
 */
export function planRelocations(units: UnitSite[], share = 0.015): PlannedMove[] {
  const byWard = new Map<string, UnitSite[]>();
  for (const u of units.filter(usable)) byWard.set(u.ward, [...(byWard.get(u.ward) ?? []), u]);
  const moves: PlannedMove[] = [];
  for (const u of units.filter(usable)) {
    if (score(u.code) >= share) continue;
    const near = (byWard.get(u.ward) ?? [])
      .filter((v) => v.code !== u.code && v.name !== u.name)
      .map((v) => ({ v, d: distanceKm(u, v) }))
      .filter((x) => x.d >= 0.3 && x.d <= 6)
      .sort((a, b) => a.d - b.d)[0];
    if (!near) continue;
    const reason = MOVE_REASONS[Math.floor(score(`${u.code}:why`) * MOVE_REASONS.length)]!;
    moves.push({ from: u, to: near.v, distanceKm: Math.round(near.d * 10) / 10, reason });
  }
  return moves;
}

/** The text message a subscriber gets. Kept to about two SMS pages. */
export function relocationSms(unitName: string, toName: string, distanceKm: number | undefined, link: string): string {
  const far = distanceKm !== undefined ? ` (${distanceKm} km away)` : "";
  return `Tally: your polling unit ${unitName} has MOVED to ${toName}${far}. Directions and details: ${link}`;
}

export function openedSms(unitName: string, link: string): string {
  return `Tally: voting has started at ${unitName}. The officer signed that it is open. ${link}`;
}

export function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function tamperSms(unitName: string, wardName: string, field: string, announced: number, sealed: number, link: string): string {
  return `Tally ALERT: at ${wardName} collation, ${unitName} was announced with ${field} ${announced}, but party agents signed ${sealed} at the unit. Proof: ${link}`;
}
