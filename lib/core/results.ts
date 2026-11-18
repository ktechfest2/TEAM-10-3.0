/** Arithmetic rules for an EC8A result and collation reconciliation. Deterministic — no AI. */
import type { ResultFigures } from "./events";

export type Issue = { code: string; message: string };

export function checkResultArithmetic(f: ResultFigures): Issue[] {
  const issues: Issue[] = [];
  const sum = Object.values(f.votes).reduce((a, b) => a + b, 0);
  if (sum !== f.totalValid) {
    issues.push({ code: "VALID_SUM", message: `Party votes add up to ${sum}, but total valid votes is ${f.totalValid}.` });
  }
  if (f.totalValid + f.rejected > f.accredited) {
    issues.push({
      code: "OVERVOTING",
      message: `Valid (${f.totalValid}) + rejected (${f.rejected}) = ${f.totalValid + f.rejected}, more than accredited voters (${f.accredited}).`,
    });
  }
  if (f.registered !== undefined && f.accredited > f.registered) {
    issues.push({ code: "ACCREDITED_GT_REGISTERED", message: `Accredited (${f.accredited}) exceeds registered voters (${f.registered}).` });
  }
  return issues;
}

/** Stable comparison key for "identical figures". */
export function figuresKey(f: Pick<ResultFigures, "votes" | "accredited" | "rejected" | "totalValid">): string {
  const votes = Object.keys(f.votes)
    .sort()
    .map((p) => `${p}=${f.votes[p]}`)
    .join(",");
  return `${votes}|acc=${f.accredited}|rej=${f.rejected}|valid=${f.totalValid}`;
}

export type Totals = { votes: Record<string, number>; accredited: number; rejected: number; totalValid: number };

export function sumTotals(items: Totals[]): Totals {
  const out: Totals = { votes: {}, accredited: 0, rejected: 0, totalValid: 0 };
  for (const item of items) {
    for (const [party, n] of Object.entries(item.votes)) out.votes[party] = (out.votes[party] ?? 0) + n;
    out.accredited += item.accredited;
    out.rejected += item.rejected;
    out.totalValid += item.totalValid;
  }
  return out;
}

export type Divergence = { field: string; announced: number; computed: number };

/** Compare announced collation totals with the sum of sealed children. */
export function reconcile(announced: Totals, computed: Totals): Divergence[] {
  const out: Divergence[] = [];
  const parties = new Set([...Object.keys(announced.votes), ...Object.keys(computed.votes)]);
  for (const p of [...parties].sort()) {
    const a = announced.votes[p] ?? 0;
    const c = computed.votes[p] ?? 0;
    if (a !== c) out.push({ field: p, announced: a, computed: c });
  }
  for (const field of ["accredited", "rejected", "totalValid"] as const) {
    if (announced[field] !== computed[field]) out.push({ field, announced: announced[field], computed: computed[field] });
  }
  return out;
}

/**
 * Margin-of-lead principle: if voters registered in cancelled/not-held units
 * could change the outcome, a supplementary election is required.
 */
export function marginOfLead(votes: Record<string, number>, registeredInCancelledUnits: number) {
  const ranked = Object.entries(votes).sort(([, a], [, b]) => b - a);
  const lead = ranked.length < 2 ? (ranked[0]?.[1] ?? 0) : ranked[0][1] - ranked[1][1];
  return {
    leader: ranked[0]?.[0] ?? null,
    runnerUp: ranked[1]?.[0] ?? null,
    margin: lead,
    cancelledRegistered: registeredInCancelledUnits,
    supplementaryRequired: registeredInCancelledUnits >= lead,
  };
}
