import "server-only";
import { iso } from "./time";
import { sqlClient as sql } from "@/lib/db/client";
import type { ResultFigures } from "@/lib/core/events";
import { checkResultArithmetic, figuresKey, reconcile, sumTotals, type Divergence, type Totals } from "@/lib/core/results";
import { betaReliability, scoreResult, type ResultStatus, type ResultTrust, type ResultWitness } from "@/lib/core/trust";

export type Place = {
  code: string;
  level: "national" | "state" | "lga" | "ward" | "pu";
  parentCode: string | null;
  name: string;
  lat: number | null;
  lng: number | null;
  registered: number | null;
};

type PlaceRow = { code: string; level: Place["level"]; parent_code: string | null; name: string; lat: number | null; lng: number | null; registered: number | null };
const toPlace = (r: PlaceRow): Place => ({ code: r.code, level: r.level, parentCode: r.parent_code, name: r.name, lat: r.lat, lng: r.lng, registered: r.registered });

export async function getPlace(code: string): Promise<Place | null> {
  const [row] = await sql<PlaceRow[]>`select * from places where code = ${code}`;
  return row ? toPlace(row) : null;
}

export async function getBreadcrumb(place: Place): Promise<Place[]> {
  const out: Place[] = [];
  let parent = place.parentCode;
  while (parent) {
    const p = await getPlace(parent);
    if (!p) break;
    out.unshift(p);
    parent = p.parentCode;
  }
  return out;
}

export async function getChildren(code: string): Promise<Place[]> {
  const rows = await sql<PlaceRow[]>`select * from places where parent_code = ${code} order by code`;
  return rows.map(toPlace);
}

export async function searchPlaces(q: string, limit = 12): Promise<(Place & { path: string })[]> {
  const term = `%${q.trim()}%`;
  const rows = await sql<(PlaceRow & { path: string })[]>`
    select p.*, concat_ws(' · ', w.name, l.name) as path
    from places p
    left join places w on w.code = p.parent_code
    left join places l on l.code = w.parent_code
    where p.level in ('pu', 'ward', 'lga') and (p.name ilike ${term} or p.code ilike ${term})
    order by case p.level when 'lga' then 0 when 'ward' then 1 else 2 end, p.name
    limit ${limit}`;
  return rows.map((r) => ({ ...toPlace(r), path: r.path }));
}

/** Polling-unit codes are hierarchical, so a prefix selects everything beneath a place. */
const descendantPattern = (place: Place) => (place.level === "national" ? "%" : place.level === "pu" ? place.code : `${place.code}-%`);

export type ResultVersion = {
  contentHash: string;
  eventId: string;
  seq: number;
  occurredAt: string;
  figures: ResultFigures;
  readBy: "model" | "manual";
  photoSha256?: string;
  witnesses: (ResultWitness & { displayName: string; signedAt: string })[];
  trust: ResultTrust;
};

export type UnitResult = { puCode: string; best: ResultVersion | null; versions: ResultVersion[] };

type ResultRow = { seq: number; id: string; place_code: string; content_hash: string; payload: { figures: ResultFigures; readBy: "model" | "manual"; photoSha256?: string }; occurred_at: Date; author_id: string };
type WitnessRow = { content_hash: string; actor_id: string; role: ResultWitness["role"]; party: string | null; display_name: string; rel_alpha: number; rel_beta: number; signed_at: Date };

const STATUS_RANK: Record<ResultStatus, number> = { sealed: 3, witnessed: 2, unwitnessed: 1, disputed: 0 };

/** Loads every declared result under a place, with witnesses, and scores each version. */
export async function getUnitResults(place: Place): Promise<Map<string, UnitResult>> {
  const pattern = descendantPattern(place);
  const results = await sql<ResultRow[]>`
    select seq, id, place_code, content_hash, payload, occurred_at, author_id
    from events where type = 'result.declared' and place_code like ${pattern} order by seq`;
  if (results.length === 0) return new Map();

  const hashes = results.map((r) => r.content_hash);
  const authorIds = [...new Set(results.map((r) => r.author_id))];
  const witnessRows = await sql<WitnessRow[]>`
    select w.content_hash, w.actor_id, a.role, a.party, a.display_name, a.rel_alpha, a.rel_beta, w.signed_at
    from witnesses w join actors a on a.id = w.actor_id where w.content_hash in ${sql(hashes)}`;
  const authors = await sql<Omit<WitnessRow, "content_hash" | "signed_at">[]>`
    select id as actor_id, role, party, display_name, rel_alpha, rel_beta from actors where id in ${sql(authorIds)}`;
  const authorById = new Map(authors.map((a) => [a.actor_id, a]));

  const byUnit = new Map<string, ResultRow[]>();
  for (const r of results) byUnit.set(r.place_code, [...(byUnit.get(r.place_code) ?? []), r]);

  const out = new Map<string, UnitResult>();
  for (const [puCode, rows] of byUnit) {
    const witnessesFor = (r: ResultRow) => {
      const author = authorById.get(r.author_id);
      const list: ResultVersion["witnesses"] = [];
      if (author) {
        list.push({ actorId: author.actor_id, role: author.role, party: author.party, displayName: author.display_name, reliability: betaReliability(author.rel_alpha, author.rel_beta), isAuthor: true, signedAt: iso(r.occurred_at) });
      }
      for (const w of witnessRows.filter((x) => x.content_hash === r.content_hash)) {
        list.push({ actorId: w.actor_id, role: w.role, party: w.party, displayName: w.display_name, reliability: betaReliability(w.rel_alpha, w.rel_beta), signedAt: iso(w.signed_at) });
      }
      return list;
    };

    // Versions with identical figures are the same claim; different figures conflict.
    const versions: ResultVersion[] = rows.map((r) => {
      const witnesses = witnessesFor(r);
      const key = figuresKey(r.payload.figures);
      const conflictingVersions = rows
        .filter((o) => figuresKey(o.payload.figures) !== key)
        .map((o) => ({
          contentHash: o.content_hash,
          parties: [...new Set(witnessesFor(o).filter((w) => w.role === "party_agent" && w.party).map((w) => w.party as string))],
        }));
      const trust = scoreResult({ witnesses, arithmeticIssues: checkResultArithmetic(r.payload.figures), conflictingVersions, externalMatch: null });
      return {
        contentHash: r.content_hash,
        eventId: r.id,
        seq: Number(r.seq),
        occurredAt: iso(r.occurred_at),
        figures: r.payload.figures,
        readBy: r.payload.readBy,
        photoSha256: r.payload.photoSha256,
        witnesses,
        trust,
      };
    });
    const best = [...versions].sort((a, b) => STATUS_RANK[b.trust.status] - STATUS_RANK[a.trust.status] || b.trust.probability - a.trust.probability)[0] ?? null;
    out.set(puCode, { puCode, best, versions });
  }
  return out;
}

export type Coverage = { units: number; reported: number; sealed: number; witnessed: number; disputed: number };

export async function getCoverage(place: Place, results: Map<string, UnitResult>): Promise<Coverage> {
  const [{ count }] = await sql<{ count: number }[]>`select count(*)::int as count from places where level = 'pu' and code like ${descendantPattern(place)}`;
  const cov: Coverage = { units: count, reported: results.size, sealed: 0, witnessed: 0, disputed: 0 };
  for (const r of results.values()) {
    const s = r.best?.trust.status;
    if (s === "sealed") cov.sealed++;
    else if (s === "witnessed") cov.witnessed++;
    else if (s === "disputed") cov.disputed++;
  }
  return cov;
}

const totalsOf = (f: ResultFigures): Totals => ({ votes: f.votes, accredited: f.accredited, rejected: f.rejected, totalValid: f.totalValid });

/** Sum of the best *sealed* results under a child place — the independent truth collation is checked against. */
function sealedTotalsUnder(childCode: string, results: Map<string, UnitResult>): { totals: Totals; sealedUnits: number } {
  const picked: Totals[] = [];
  for (const [pu, r] of results) {
    if ((pu === childCode || pu.startsWith(`${childCode}-`)) && r.best?.trust.status === "sealed") picked.push(totalsOf(r.best.figures));
  }
  return { totals: sumTotals(picked), sealedUnits: picked.length };
}

export type CollationRowCheck = {
  code: string;
  name: string;
  announced: Totals;
  sealed: Totals | null;
  sealedUnits: number;
  status: "match" | "mismatch" | "unverified";
  divergences: Divergence[];
};

export type CollationCheck = {
  eventId: string;
  seq: number;
  occurredAt: string;
  officer: string;
  level: string;
  announced: Totals;
  rowSum: Totals;
  arithmetic: Divergence[];
  rows: CollationRowCheck[];
  tamperSuspected: boolean;
};

export async function getCollationCheck(place: Place, results: Map<string, UnitResult>): Promise<CollationCheck | null> {
  const [row] = await sql<{ id: string; seq: number; occurred_at: Date; payload: { level: string; rows: { code: string; totals: Totals }[]; announced: Totals }; display_name: string }[]>`
    select e.id, e.seq, e.occurred_at, e.payload, a.display_name
    from events e join actors a on a.id = e.author_id
    where e.type = 'collation.entered' and e.place_code = ${place.code}
    order by e.seq desc limit 1`;
  if (!row) return null;

  const names = new Map((await getChildren(place.code)).map((c) => [c.code, c.name]));
  const rows: CollationRowCheck[] = row.payload.rows.map((r) => {
    const { totals, sealedUnits } = sealedTotalsUnder(r.code, results);
    if (sealedUnits === 0) return { code: r.code, name: names.get(r.code) ?? r.code, announced: r.totals, sealed: null, sealedUnits, status: "unverified", divergences: [] };
    const divergences = reconcile(r.totals, totals);
    return { code: r.code, name: names.get(r.code) ?? r.code, announced: r.totals, sealed: totals, sealedUnits, status: divergences.length ? "mismatch" : "match", divergences };
  });
  const rowSum = sumTotals(row.payload.rows.map((r) => r.totals));
  const arithmetic = reconcile(row.payload.announced, rowSum);
  return {
    eventId: row.id,
    seq: Number(row.seq),
    occurredAt: iso(row.occurred_at),
    officer: row.display_name,
    level: row.payload.level,
    announced: row.payload.announced,
    rowSum,
    arithmetic,
    rows,
    tamperSuspected: arithmetic.length > 0 || rows.some((r) => r.status === "mismatch"),
  };
}

export type TimelineItem = { seq: number; id: string; type: string; occurredAt: string; receivedAt: string; author: string; role: string; party: string | null; payload: unknown; witnesses: number; contentHash: string; ledgerHash: string };

export async function getTimeline(place: Place, limit = 50): Promise<TimelineItem[]> {
  const rows = await sql<{ seq: number; id: string; type: string; occurred_at: Date; received_at: Date; display_name: string; role: string; party: string | null; payload: unknown; witnesses: number; content_hash: string; ledger_hash: string }[]>`
    select e.seq, e.id, e.type, e.occurred_at, e.received_at, a.display_name, a.role, a.party, e.payload, e.content_hash, e.ledger_hash,
           (select count(*)::int from witnesses w where w.content_hash = e.content_hash) as witnesses
    from events e join actors a on a.id = e.author_id
    where e.place_code = ${place.code}
    order by e.occurred_at desc, e.seq desc limit ${limit}`;
  return rows.map((r) => ({
    seq: Number(r.seq),
    id: r.id,
    type: r.type,
    occurredAt: iso(r.occurred_at),
    receivedAt: iso(r.received_at),
    author: r.display_name,
    role: r.role,
    party: r.party,
    payload: r.payload,
    witnesses: r.witnesses,
    contentHash: r.content_hash,
    ledgerHash: r.ledger_hash,
  }));
}

/** Aggregated sealed totals per child, for drill-down tables and the map. */
export function childSummaries(children: Place[], results: Map<string, UnitResult>) {
  return children.map((child) => {
    const units = [...results.entries()].filter(([pu]) => pu === child.code || pu.startsWith(`${child.code}-`));
    const sealed = units.filter(([, r]) => r.best?.trust.status === "sealed");
    const disputed = units.filter(([, r]) => r.best?.trust.status === "disputed").length;
    return {
      place: child,
      reported: units.length,
      sealed: sealed.length,
      disputed,
      totals: sumTotals(sealed.map(([, r]) => totalsOf(r.best!.figures))),
      status: child.level === "pu" ? (units[0]?.[1].best?.trust.status ?? null) : null,
    };
  });
}
