import "server-only";
import { buildJourney, joinList, type JourneyInput, type JourneyStep } from "@/lib/core/journey";
import { sqlClient as sql } from "@/lib/db/client";
import { iso } from "./time";
import { getCollationCheck, getUnitResults, type Place, type UnitResult } from "./views";

/** What happened at one polling unit, from opening to the final collation, read from the signed ledger. */
export async function getUnitJourney(unit: Place, ancestors: Place[], result: UnitResult | undefined): Promise<JourneyStep[]> {
  const [opened] = await sql<{ occurred_at: Date; display_name: string }[]>`
    select e.occurred_at, a.display_name from events e join actors a on a.id = e.author_id
    where e.type = 'pu.opened' and e.place_code = ${unit.code} order by e.seq desc limit 1`;
  const attempts = await sql<{ occurred_at: Date; outcome: string }[]>`
    select occurred_at, payload->>'outcome' as outcome from events
    where type = 'transmission.attempted' and place_code = ${unit.code} order by seq`;

  const best = result?.best;
  const parties = best ? [...new Set(best.witnesses.filter((w) => w.party).map((w) => w.party as string))] : [];
  const collations: JourneyInput["collations"] = [];

  for (const level of ["ward", "lga", "state"] as const) {
    const ancestor = ancestors.find((a) => a.level === level);
    if (!ancestor) continue;
    const check = await getCollationCheck(ancestor, await getUnitResults(ancestor));
    const row = check?.rows.find((r) => unit.code === r.code || unit.code.startsWith(`${r.code}-`));
    if (!check || !row) {
      collations.push({ level, name: ancestor.name, status: "none" });
      continue;
    }
    const d = row.divergences[0];
    collations.push({
      level,
      name: ancestor.name,
      status: row.status,
      at: check.occurredAt,
      detail: row.status === "mismatch" && d ? `${d.field} announced ${d.announced.toLocaleString("en-US")}, but rival agents sealed ${d.computed.toLocaleString("en-US")}.` : undefined,
    });
  }

  return buildJourney({
    opened: opened ? { at: iso(opened.occurred_at), by: opened.display_name } : null,
    result: best
      ? { status: best.trust.status, parties, at: best.occurredAt, by: best.witnesses.find((w) => w.isAuthor)?.displayName ?? "the officer" }
      : null,
    attempts: attempts.map((a) => ({ outcome: a.outcome === "success" ? "success" : "failed", at: iso(a.occurred_at) })),
    collations,
  });
}

export { joinList };
