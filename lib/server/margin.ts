import "server-only";
import { computeMargin, type Margin } from "@/lib/core/margin";
import { sqlClient as sql } from "@/lib/db/client";
import type { Place, UnitResult } from "./views";

const pattern = (place: Place) => (place.level === "national" ? "%" : place.level === "pu" ? place.code : `${place.code}-%`);

/** Lead among sealed results against what the unsettled units could still change. See lib/core/margin.ts. */
export async function getMargin(place: Place, results: Map<string, UnitResult>): Promise<Margin> {
  // A unit with no registered figure in the source would understate what is at stake, so it is bounded by the largest
  // registration in its ward instead. That can only make the verdict more cautious.
  const units = await sql<{ code: string; registered: number }[]>`
    select code, case when coalesce(registered, 0) > 0 then registered else coalesce(max(registered) over (partition by parent_code), 0) end as registered
    from places where level = 'pu' and code like ${pattern(place)}`;
  const sealedVotes: Record<string, number> = {};
  let sealedUnits = 0;
  let unsettledUnits = 0;
  let unsettledRegistered = 0;
  for (const u of units) {
    const best = results.get(u.code)?.best;
    if (best?.trust.status === "sealed") {
      sealedUnits++;
      for (const [party, v] of Object.entries(best.figures.votes)) sealedVotes[party] = (sealedVotes[party] ?? 0) + v;
    } else {
      unsettledUnits++;
      unsettledRegistered += u.registered;
    }
  }
  return computeMargin({ sealedVotes, sealedUnits, unsettledUnits, unsettledRegistered });
}
