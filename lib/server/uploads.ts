import "server-only";
import { certifyFailure, independentChains, type CertificationLevel, type FailureWitness } from "@/lib/core/certification";
import { sqlClient as sql } from "@/lib/db/client";
import { iso } from "./time";
import type { Place } from "./views";

export type UploadFailure = { code: string; name: string; at: string; level: CertificationLevel; witnesses: string[] };
export type UploadFailures = { total: number; certified: number; witnessed: number; claimed: number; units: UploadFailure[] };

const pattern = (place: Place) => (place.level === "national" ? "%" : place.level === "pu" ? place.code : `${place.code}-%`);

/** Units whose latest upload attempt failed, and how far each failure has been independently certified. */
export async function getUploadFailures(place: Place, limit = 10): Promise<UploadFailures> {
  const latest = await sql<{ place_code: string; name: string; occurred_at: Date; content_hash: string }[]>`
    select distinct on (e.place_code) e.place_code, p.name, e.occurred_at, e.content_hash, e.payload->>'outcome' as outcome
    from events e join places p on p.code = e.place_code
    where e.type = 'transmission.attempted' and e.place_code like ${pattern(place)}
    order by e.place_code, e.seq desc`;
  const failed = latest.filter((r) => (r as unknown as { outcome: string }).outcome === "failed");
  const wit = failed.length
    ? await sql<{ content_hash: string; actor_id: string; role: string; party: string | null }[]>`
        select w.content_hash, a.id as actor_id, a.role, a.party from witnesses w join actors a on a.id = w.actor_id
        where w.content_hash = any(${failed.map((f) => f.content_hash)})`
    : [];
  const units: UploadFailure[] = failed.map((f) => {
    const ws: FailureWitness[] = wit.filter((w) => w.content_hash === f.content_hash).map((w) => ({ actorId: w.actor_id, role: w.role, party: w.party }));
    const chains = independentChains(ws);
    return { code: f.place_code, name: f.name, at: iso(f.occurred_at), level: certifyFailure(ws), witnesses: chains.map((c) => (c.startsWith("party:") ? c.slice(6) : "Observer")) };
  });
  const rank = { certified: 0, witnessed: 1, claimed: 2 } as const;
  units.sort((a, b) => rank[a.level] - rank[b.level] || b.at.localeCompare(a.at));
  const count = (l: CertificationLevel) => units.filter((u) => u.level === l).length;
  return { total: units.length, certified: count("certified"), witnessed: count("witnessed"), claimed: count("claimed"), units: units.slice(0, limit) };
}
