import "server-only";
import { ESCALATE_AFTER_MINUTES, helpState, HELP_KINDS, type HelpKind, type HelpState } from "@/lib/core/help";
import { sqlClient as sql } from "@/lib/db/client";
import { iso } from "./time";

export type HelpItem = { id: string; placeCode: string; placeName: string; kind: HelpKind; createdAt: string; answeredAt: string | null; answeredBy: string | null; state: HelpState };

type Row = { id: string; place_code: string; place_name: string; kind: string; created_at: Date; answered_at: Date | null; answered_by: string | null };

const isKind = (k: string): k is HelpKind => (HELP_KINDS as readonly string[]).includes(k);

/** Requests under a place (a unit, or a ward or area council), newest first, each with the signed answer if there is one. */
export async function listHelp(place: string, limit = 50): Promise<HelpItem[]> {
  const pattern = `${place}%`;
  const rows = await sql<Row[]>`
    select h.id, h.place_code, p.name as place_name, h.kind, h.created_at,
           r.occurred_at as answered_at, r.display_name as answered_by
    from help_requests h
    join places p on p.code = h.place_code
    left join lateral (
      select e.occurred_at, a.display_name from events e join actors a on a.id = e.author_id
      where e.type = 'help.responded' and e.payload->>'requestId' = h.id::text order by e.seq limit 1
    ) r on true
    where h.place_code like ${pattern}
    order by h.created_at desc limit ${limit}`;
  const now = new Date();
  return rows.filter((r) => isKind(r.kind)).map((r) => ({
    id: r.id,
    placeCode: r.place_code,
    placeName: r.place_name,
    kind: r.kind as HelpKind,
    createdAt: iso(r.created_at),
    answeredAt: r.answered_at ? iso(r.answered_at) : null,
    answeredBy: r.answered_by,
    state: helpState(r.created_at, r.answered_at, now),
  }));
}

export async function createHelp(placeCode: string, kind: HelpKind): Promise<{ id: string }> {
  const [place] = await sql`select 1 from places where code = ${placeCode} and level = 'pu'`;
  if (!place) throw new Error("Unknown polling unit");
  // The same kind of request at the same unit is one request until it is answered, so a double tap does not raise a second alarm.
  const [dup] = await sql<{ id: string }[]>`
    select h.id from help_requests h where h.place_code = ${placeCode} and h.kind = ${kind} and h.created_at > now() - make_interval(mins => 30)
      and not exists (select 1 from events e where e.type = 'help.responded' and e.payload->>'requestId' = h.id::text) limit 1`;
  if (dup) return dup;
  const [row] = await sql<{ id: string }[]>`insert into help_requests (place_code, kind) values (${placeCode}, ${kind}) returning id`;
  return row!;
}

export type HelpOverview = { open: number; answered: number; escalated: number; worst: { code: string; name: string; kind: HelpKind; createdAt: string }[] };

/** Counts for mission control. A request waiting longer than the limit is escalated. */
export async function getHelpOverview(): Promise<HelpOverview> {
  const items = await listHelp("", 2000);
  const escalated = items.filter((i) => i.state === "escalated");
  return {
    open: items.filter((i) => i.state === "open").length,
    answered: items.filter((i) => i.state === "answered").length,
    escalated: escalated.length,
    worst: escalated.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(0, 4).map((i) => ({ code: i.placeCode, name: i.placeName, kind: i.kind, createdAt: i.createdAt })),
  };
}

export { ESCALATE_AFTER_MINUTES };
