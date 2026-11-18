import "server-only";
import { detectAnomalies, type Flag, type UnitFigures } from "@/lib/core/anomaly";
import { sqlClient as sql } from "@/lib/db/client";
import type { UnitResult } from "./views";

/** Runs the anomaly agent over the results on the ledger. Peers are the other reported units in the same ward. */
export async function flagsForResults(results: Map<string, UnitResult>): Promise<Flag[]> {
  const codes = [...results.entries()].filter(([, r]) => r.best).map(([code]) => code);
  if (codes.length === 0) return [];
  const places = await sql<{ code: string; parent_code: string; registered: number | null }[]>`select code, parent_code, registered from places where code = any(${codes})`;
  const meta = new Map(places.map((p) => [p.code, p]));
  const units: UnitFigures[] = [];
  for (const code of codes) {
    const best = results.get(code)!.best!;
    const m = meta.get(code);
    if (!m) continue;
    units.push({ code, group: m.parent_code, registered: m.registered ?? 0, accredited: best.figures.accredited, votes: best.figures.votes });
  }
  return detectAnomalies(units);
}
