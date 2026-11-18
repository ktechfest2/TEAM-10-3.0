import "server-only";
import type { Lang } from "@/lib/core/i18n";
import { certifyFailure, independentChains, type FailureWitness } from "@/lib/core/certification";
import { buildJourney, joinList, type JourneyInput, type JourneyStep } from "@/lib/core/journey";
import { sqlClient as sql } from "@/lib/db/client";
import { iso } from "./time";
import { getCollationCheck, getUnitResults, type Place, type UnitResult } from "./views";

/** What happened at one polling unit, from opening to the final collation, read from the signed ledger. */
export async function getUnitJourney(unit: Place, ancestors: Place[], result: UnitResult | undefined, lang: Lang = "en"): Promise<JourneyStep[]> {
  const [opened] = await sql<{ occurred_at: Date; display_name: string }[]>`
    select e.occurred_at, a.display_name from events e join actors a on a.id = e.author_id
    where e.type = 'pu.opened' and e.place_code = ${unit.code} order by e.seq desc limit 1`;
  const attempts = await sql<{ occurred_at: Date; outcome: string; content_hash: string }[]>`
    select occurred_at, payload->>'outcome' as outcome, content_hash from events
    where type = 'transmission.attempted' and place_code = ${unit.code} order by seq`;
  const wit = attempts.length
    ? await sql<{ content_hash: string; actor_id: string; role: string; party: string | null }[]>`
        select w.content_hash, a.id as actor_id, a.role, a.party from witnesses w join actors a on a.id = w.actor_id
        where w.content_hash = any(${attempts.map((a) => a.content_hash)})`
    : [];
  const witnessesOf = (hash: string): FailureWitness[] => wit.filter((w) => w.content_hash === hash).map((w) => ({ actorId: w.actor_id, role: w.role, party: w.party }));
  const label = (w: FailureWitness) => (w.role === "party_agent" && w.party ? w.party : "an observer");

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
      diff: row.status === "mismatch" && d ? { field: d.field, announced: d.announced, sealed: d.computed } : undefined,
    });
  }

  return buildJourney({
    opened: opened ? { at: iso(opened.occurred_at), by: opened.display_name } : null,
    result: best
      ? { status: best.trust.status, parties, at: best.occurredAt, by: best.witnesses.find((w) => w.isAuthor)?.displayName ?? "the officer" }
      : null,
    attempts: attempts.map((a) => {
      const ws = witnessesOf(a.content_hash);
      const chains = independentChains(ws);
      return { outcome: a.outcome === "success" ? ("success" as const) : ("failed" as const), at: iso(a.occurred_at), certification: certifyFailure(ws), witnesses: chains.length ? [...new Set(ws.filter((w) => chains.includes(w.role === "party_agent" && w.party ? `party:${w.party}` : `actor:${w.actorId}`)).map(label))] : [] };
    }),
    collations,
  }, lang);
}

export { joinList };
