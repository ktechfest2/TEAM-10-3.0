import "server-only";
import { detectAnomalies, RULES, type Flag, type FlagKind, type UnitFigures } from "@/lib/core/anomaly";
import { sqlClient as sql } from "@/lib/db/client";
import { cellCount, cellIndex, type CellStatus } from "./mission";

export type ReplayUnit = { code: string; name: string; ward: string; lga: string; registered: number; accredited: number; votes: Record<string, number>; flags: Flag[] };
export type Replay = {
  analysed: number;
  flagged: number;
  byKind: Record<FlagKind, number>;
  impossible: number;
  outliers: number;
  cells: CellStatus[];
  units: ReplayUnit[];
};

type Row = { pu_code: string; votes: Record<string, number>; accredited: number; registered: number; name: string; ward: string | null; lga: string | null; parent_code: string };

// The 2023 figures never change, so the analysis is computed once per server instance.
let memo: Promise<Replay> | null = null;

async function compute(): Promise<Replay> {
  const rows = await sql<Row[]>`
    select r.pu_code, r.votes, r.accredited, r.registered, p.name, p.parent_code, w.name as ward, l.name as lga
    from reference_2023 r
    join places p on p.code = r.pu_code
    left join places w on w.code = p.parent_code
    left join places l on l.code = w.parent_code
    order by r.pu_code`;
  const figures: UnitFigures[] = rows.map((r) => ({ code: r.pu_code, group: r.parent_code, registered: r.registered, accredited: r.accredited, votes: r.votes }));
  const flags = detectAnomalies(figures);

  const byUnit = new Map<string, Flag[]>();
  for (const f of flags) byUnit.set(f.code, [...(byUnit.get(f.code) ?? []), f]);

  const cells = new Array<CellStatus>(cellCount).fill(0);
  const units: ReplayUnit[] = [];
  for (const r of rows) {
    const f = byUnit.get(r.pu_code);
    if (!f) continue;
    const i = cellIndex(r.pu_code);
    // A polling site shows its strangest unit: 3 for impossible figures, 1 for an outlier.
    if (i !== undefined) cells[i] = Math.max(cells[i]!, f.some((x) => x.tier === "impossible") ? 3 : 1) as CellStatus;
    units.push({ code: r.pu_code, name: r.name, ward: r.ward ?? "", lga: r.lga ?? "", registered: r.registered, accredited: r.accredited, votes: r.votes, flags: f });
  }
  units.sort((a, b) => Number(b.flags.some((x) => x.tier === "impossible")) - Number(a.flags.some((x) => x.tier === "impossible")) || b.flags[0]!.weight - a.flags[0]!.weight);

  const byKind = Object.fromEntries(Object.keys(RULES).map((k) => [k, flags.filter((f) => f.kind === k).length])) as Record<FlagKind, number>;
  return {
    analysed: rows.length,
    flagged: units.length,
    byKind,
    impossible: units.filter((u) => u.flags.some((f) => f.tier === "impossible")).length,
    outliers: units.filter((u) => u.flags.every((f) => f.tier === "outlier")).length,
    cells,
    units,
  };
}

export function getReplay(): Promise<Replay> {
  memo ??= compute().catch((e) => {
    memo = null;
    throw e;
  });
  return memo;
}
