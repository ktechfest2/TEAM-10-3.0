import "server-only";
import raw from "@/lib/data/fct-map.json";
import { sqlClient as sql } from "@/lib/db/client";
import type { Margin } from "@/lib/core/margin";
import type { ResultFigures } from "@/lib/core/events";
import { compareWall } from "@/lib/core/wall";
import { flagsForResults } from "./anomaly-live";
import { getMargin } from "./margin";
import { getUploadFailures } from "./uploads";
import { simulationState } from "./simulate";
import { iso } from "./time";
import { getCollationCheck, getPlace } from "./views";
import { getUnitResults } from "./views";

export type MapGeometry = {
  w: number;
  h: number;
  outline: string;
  lgas: { n: string; d: string; cx: number; cy: number }[];
  cells: { d: string; lga: number; cx: number; cy: number; codes: string[] }[];
};
const geometry = raw as unknown as MapGeometry;

/** Geometry for the browser: no unit codes, they stay on the server. */
export const publicGeometry = {
  w: geometry.w,
  h: geometry.h,
  outline: geometry.outline,
  lgas: geometry.lgas,
  cells: geometry.cells.map(({ d, lga, cx, cy }) => ({ d, lga, cx, cy })),
};

const cellOfCode = new Map<string, number>();
geometry.cells.forEach((c, i) => c.codes.forEach((code) => cellOfCode.set(code, i)));

/** Map cell for a polling unit; several units can share one polling site. */
export const cellIndex = (code: string) => cellOfCode.get(code);
export const cellCount = geometry.cells.length;

/** 0 no result, 1 witnessed, 2 sealed, 3 tampering or dispute */
export type CellStatus = 0 | 1 | 2 | 3;

export type MissionAlert = { kind: "red" | "amber" | "green" | "grey"; k: string; title: string; body: string; at: string; href?: string };

export type Mission = {
  at: string;
  totals: { units: number; reported: number; sealed: number; witnessed: number; unwitnessed: number; tamper: number; flagged: number };
  cells: CellStatus[];
  councils: { name: string; units: number; sealed: number }[];
  alerts: MissionAlert[];
  margin: Margin;
  uploads: { total: number; certified: number; witnessed: number; claimed: number };
  focus: { cell: number; label: string; status: CellStatus } | null;
  simulation: { simulated: number; remaining: number };
};

const joinList = (items: string[]) => (items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);

let memo: { at: number; value: Mission } | null = null;

/** Everything mission control shows, computed from the ledger. Briefly memoised so many viewers share one computation. */
export async function missionSnapshot(): Promise<Mission> {
  if (memo && Date.now() - memo.at < 1500) return memo.value;
  const national = await getPlace("NG");
  if (!national) throw new Error("Places are not seeded");
  const results = await getUnitResults(national);

  const [{ units }] = await sql<{ units: number }[]>`select count(*)::int as units from places where level = 'pu'`;
  const lgaUnits = await sql<{ l: string; n: number }[]>`select split_part(code, '-', 2) as l, count(*)::int as n from places where level = 'pu' group by 1 order by 1`;

  const status = (code: string) => results.get(code)?.best?.trust.status;
  let sealed = 0;
  let witnessed = 0;
  let unwitnessed = 0;
  const councilSealed = new Array<number>(geometry.lgas.length).fill(0);
  for (const [code, r] of results) {
    const s = r.best?.trust.status;
    if (s === "sealed") {
      sealed++;
      const li = Number(code.split("-")[1]) - 1;
      if (li >= 0 && li < councilSealed.length) councilSealed[li]++;
    } else if (s === "witnessed") witnessed++;
    else if (s === "unwitnessed") unwitnessed++;
  }

  // Tampering: any latest collation whose rows differ from what rival agents sealed.
  const alerts: MissionAlert[] = [];
  const tamperCodes = new Set<string>();
  const latest = await sql<{ place_code: string }[]>`select distinct on (place_code) place_code from events where type = 'collation.entered' order by place_code, seq desc`;
  let tamper = 0;
  for (const { place_code } of latest) {
    const place = await getPlace(place_code);
    const check = place ? await getCollationCheck(place, results) : null;
    if (!place || !check) continue;
    if (check.tamperSuspected) {
      tamper++;
      const bad = check.rows.find((r) => r.status === "mismatch");
      check.rows.filter((r) => r.status === "mismatch").forEach((r) => tamperCodes.add(r.code));
      const d = bad?.divergences[0];
      alerts.push({ kind: "red", k: "TAMPERING SUSPECTED", title: `${place.name} ward collation`, body: bad && d ? `${bad.name}: ${d.field} announced ${d.announced.toLocaleString("en-US")}, sealed by rival agents ${d.computed.toLocaleString("en-US")}.` : "Announced totals do not match the sealed results.", at: check.occurredAt, href: `/p/${place.code}` });
    } else {
      alerts.push({ kind: "green", k: "COLLATION MATCHES", title: `${place.name} ward collation`, body: `${check.rows.length} units read out; every one equals its sealed result.`, at: check.occurredAt, href: `/p/${place.code}` });
    }
  }

  const cells: CellStatus[] = geometry.cells.map((c) => {
    if (c.codes.some((code) => tamperCodes.has(code) || status(code) === "disputed")) return 3;
    const ss = c.codes.map(status);
    if (ss.every((s) => s === "sealed")) return 2;
    if (ss.some((s) => s === "sealed" || s === "witnessed")) return 1;
    return 0;
  });

  // Recent results, failed uploads and the latest anchor.
  const recent = await sql<{ place_code: string; occurred_at: Date }[]>`select place_code, occurred_at from events where type = 'result.declared' order by seq desc limit 5`;
  for (const r of recent) {
    const place = await getPlace(r.place_code);
    const best = results.get(r.place_code)?.best;
    if (!place || !best) continue;
    const parties = [...new Set(best.witnesses.filter((w) => w.party).map((w) => w.party as string))];
    const s = best.trust.status;
    alerts.push({
      kind: s === "sealed" ? "green" : s === "disputed" ? "red" : s === "witnessed" ? "amber" : "grey",
      k: s === "sealed" ? "SEALED" : s === "disputed" ? "DISPUTED" : s === "witnessed" ? "WITNESSED" : "RESULT RECORDED",
      title: `Unit ${place.name}`,
      body: s === "sealed" ? `${joinList(parties)} agents signed identical figures.` : s === "witnessed" ? `${parties[0] ?? "One"} agent signed. Waiting for a rival party.` : s === "disputed" ? "Witnesses signed different figures. Every version is kept." : "No agent has signed yet.",
      at: iso(r.occurred_at),
      href: `/p/${place.code}`,
    });
  }
  const uploadFailures = await getUploadFailures(national, 1000);
  const failedRecent = await sql<{ place_code: string; occurred_at: Date }[]>`select place_code, occurred_at from events where type = 'transmission.attempted' and payload->>'outcome' = 'failed' order by seq desc limit 2`;
  for (const f of failedRecent) {
    const place = await getPlace(f.place_code);
    if (!place) continue;
    const u = uploadFailures.units.find((x) => x.code === f.place_code);
    const body = !u ? "The officer signed a record of the failed upload attempt." : u.level === "certified" ? `Certified: ${joinList(u.witnesses)} saw the upload fail.` : u.level === "witnessed" ? `Co-signed by ${joinList(u.witnesses)}. One more independent witness certifies it.` : "Reported by the officer only. No independent witness has signed it.";
    alerts.push({ kind: "amber", k: u?.level === "certified" ? "UPLOAD FAILURE CERTIFIED" : "IREV UPLOAD FAILED", title: `Unit ${place.name}`, body, at: iso(f.occurred_at), href: `/p/${place.code}` });
  }
  // Voters report that officials have not arrived at a unit not marked open: shown only when two different people say so.
  const notOpened = await sql<{ place_code: string; n: number; at: Date }[]>`
    select q.place_code, count(distinct q.author_id)::int as n, max(q.occurred_at) as at from events q
    where q.type = 'pu.queue' and q.payload->>'level' = 'not_opened'
      and not exists (select 1 from events o where o.type = 'pu.opened' and o.place_code = q.place_code)
    group by q.place_code having count(distinct q.author_id) >= 2 order by max(q.occurred_at) desc limit 3`;
  for (const r of notOpened) {
    const place = await getPlace(r.place_code);
    if (place) alerts.push({ kind: "amber", k: "VOTERS REPORT NO OFFICIALS", title: `Unit ${place.name}`, body: `${r.n} voters say the officials have not arrived, and the unit is not recorded as open.`, at: iso(r.at), href: `/p/${place.code}` });
  }
  // A citizen's photo of the wall sheet that reads differently from the signed result. A misreading is as likely as a changed sheet, so it is only a prompt to look.
  const wallRows = await sql<{ place_code: string; at: Date; figures: unknown }[]>`
    select distinct on (e.place_code, e.author_id) e.place_code, e.occurred_at as at, e.payload->'data'->'figures' as figures
    from events e where e.type = 'claim.reported' and e.payload->'data'->>'kind' = 'wall_photo' and e.payload->'data'->'figures' is not null
    order by e.place_code, e.author_id, e.seq desc`;
  const wallDiffs = wallRows.filter((r) => {
    const best = results.get(r.place_code)?.best;
    return best && compareWall(r.figures as ResultFigures, best.figures).state === "differs";
  });
  if (wallDiffs.length > 0) {
    const w = wallDiffs.sort((a, b) => +new Date(b.at) - +new Date(a.at))[0]!;
    const wp = await getPlace(w.place_code);
    if (wp) alerts.push({ kind: "amber", k: "WALL SHEET READS DIFFERENTLY", title: `Unit ${wp.name}`, body: `${wallDiffs.length} citizen photo${wallDiffs.length === 1 ? "" : "s"} of the sheet on the wall read differently from the signed result. This can be a misreading, so it is a prompt to look, not a finding.`, at: iso(w.at), href: `/p/${wp.code}` });
  }
  // The anomaly agent: statistical flags on live results, for review. One summary alert, never a list of accusations.
  const flags = await flagsForResults(results);
  const flaggedCodes = [...new Set(flags.map((f) => f.code))];
  if (flags.length > 0) {
    const top = flags[0]!;
    const topPlace = await getPlace(top.code);
    const latest = flaggedCodes.map((c) => results.get(c)?.best?.occurredAt ?? "").sort().at(-1) ?? new Date().toISOString();
    alerts.push({ kind: "amber", k: "STATISTICAL FLAGS", title: `${flaggedCodes.length.toLocaleString("en-US")} unit${flaggedCodes.length === 1 ? "" : "s"} flagged for review`, body: `${topPlace?.name ?? top.code}: ${top.title.toLowerCase()}. ${top.detail} A flag is not an accusation.`, at: latest, href: `/p/${top.code}` });
  }
  const [anchor] = await sql<{ merkle_root: string; from_seq: number; to_seq: number; status: string; created_at: Date }[]>`select merkle_root, from_seq, to_seq, status, created_at from anchors order by created_at desc limit 1`;
  if (anchor) alerts.push({ kind: "grey", k: anchor.status === "confirmed" ? "ANCHORED ON BITCOIN" : "SUBMITTED TO BITCOIN", title: `Entries ${anchor.from_seq.toLocaleString("en-US")} to ${anchor.to_seq.toLocaleString("en-US")}`, body: `root ${anchor.merkle_root.slice(0, 10)}…${anchor.merkle_root.slice(-6)}`, at: iso(anchor.created_at) });
  alerts.sort((a, b) => b.at.localeCompare(a.at));

  const focusCode = recent[0]?.place_code;
  const focusCell = focusCode !== undefined ? cellOfCode.get(focusCode) : undefined;
  const focusPlace = focusCode ? await getPlace(focusCode) : null;

  const value: Mission = {
    at: new Date().toISOString(),
    totals: { units, reported: results.size, sealed, witnessed, unwitnessed, tamper, flagged: flaggedCodes.length },
    cells,
    councils: geometry.lgas.map((l, i) => ({ name: l.n, units: lgaUnits.find((x) => Number(x.l) === i + 1)?.n ?? 0, sealed: councilSealed[i] })),
    alerts: alerts.slice(0, 10),
    margin: await getMargin(national, results),
    uploads: { total: uploadFailures.total, certified: uploadFailures.certified, witnessed: uploadFailures.witnessed, claimed: uploadFailures.claimed },
    focus: focusCell !== undefined && focusPlace ? { cell: focusCell, label: focusPlace.name, status: cells[focusCell] } : null,
    simulation: await simulationState(),
  };
  memo = { at: Date.now(), value };
  return value;
}
