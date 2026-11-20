import "server-only";
import { compareMaterials, type MaterialItem, type MaterialLine, type MaterialsState } from "@/lib/core/materials";
import { sqlClient as sql } from "@/lib/db/client";
import { iso } from "./time";

export type Signed<T> = { items: MaterialItem[]; at: string; by: string; role: string; note?: string; contentHash: string; witnesses: { name: string; party: string | null }[]; demo: boolean } & T;
export type UnitMaterials = { dispatched: Signed<object> | null; received: Signed<object> | null; state: MaterialsState; lines: MaterialLine[] };

type Row = { place_code: string; type: string; payload: { items: MaterialItem[]; text?: string }; occurred_at: Date; display_name: string; role: string; is_demo: number; content_hash: string };

/** The newest dispatch and the newest receipt for each unit, with who signed them. */
async function latest(codePattern: string): Promise<Row[]> {
  return sql<Row[]>`
    select distinct on (e.place_code, e.type) e.place_code, e.type, e.payload, e.occurred_at, a.display_name, a.role, a.is_demo, e.content_hash
    from events e join actors a on a.id = e.author_id
    where e.type in ('material.dispatched', 'material.received') and e.place_code like ${codePattern}
    order by e.place_code, e.type, e.seq desc`;
}

async function witnessesOf(hashes: string[]): Promise<Map<string, { name: string; party: string | null }[]>> {
  const out = new Map<string, { name: string; party: string | null }[]>();
  if (hashes.length === 0) return out;
  const rows = await sql<{ content_hash: string; display_name: string; party: string | null }[]>`
    select w.content_hash, a.display_name, a.party from witnesses w join actors a on a.id = w.actor_id where w.content_hash in ${sql(hashes)}`;
  for (const r of rows) out.set(r.content_hash, [...(out.get(r.content_hash) ?? []), { name: r.display_name, party: r.party }]);
  return out;
}

const signed = (r: Row, w: Map<string, { name: string; party: string | null }[]>): Signed<object> => ({ items: r.payload.items, at: iso(r.occurred_at), by: r.display_name, role: r.role, note: r.payload.text, contentHash: r.content_hash, witnesses: w.get(r.content_hash) ?? [], demo: r.is_demo === 1 });

export async function getUnitMaterials(code: string): Promise<UnitMaterials> {
  const rows = await latest(code);
  const w = await witnessesOf(rows.map((r) => r.content_hash));
  const d = rows.find((r) => r.type === "material.dispatched");
  const g = rows.find((r) => r.type === "material.received");
  const cmp = compareMaterials(d?.payload.items ?? null, g?.payload.items ?? null);
  return { dispatched: d ? signed(d, w) : null, received: g ? signed(g, w) : null, ...cmp };
}

export type MaterialsOverview = {
  dispatched: number;
  received: number;
  differs: number;
  awaiting: number;
  problems: { code: string; name: string; kind: "differs" | "awaiting"; line: string; at: string }[];
  simulated: boolean;
};

/** Counts for mission control, from the signed dispatches and receipts. */
export async function getMaterialsOverview(): Promise<MaterialsOverview> {
  const rows = await latest("%");
  const byUnit = new Map<string, { d?: Row; g?: Row }>();
  for (const r of rows) {
    const e = byUnit.get(r.place_code) ?? {};
    if (r.type === "material.dispatched") e.d = r;
    else e.g = r;
    byUnit.set(r.place_code, e);
  }
  const out: MaterialsOverview = { dispatched: 0, received: 0, differs: 0, awaiting: 0, problems: [], simulated: false };
  const probs: { code: string; kind: "differs" | "awaiting"; line: string; at: string }[] = [];
  for (const [code, { d, g }] of byUnit) {
    if (d) out.dispatched++;
    if (g) out.received++;
    if (d?.is_demo === 1 || g?.is_demo === 1) out.simulated = true;
    const cmp = compareMaterials(d?.payload.items ?? null, g?.payload.items ?? null);
    if (cmp.state === "differs") {
      out.differs++;
      const bad = cmp.lines.find((l) => l.state !== "ok")!;
      probs.push({ code, kind: "differs", line: `${bad.label}: ${bad.got} received, ${bad.sent ?? 0} sent`, at: iso(g!.occurred_at) });
    } else if (cmp.state === "dispatched") {
      out.awaiting++;
      probs.push({ code, kind: "awaiting", line: "Sent, but no officer has signed for it", at: iso(d!.occurred_at) });
    }
  }
  probs.sort((a, b) => (a.kind === b.kind ? b.at.localeCompare(a.at) : a.kind === "differs" ? -1 : 1));
  const top = probs.slice(0, 6);
  const names = top.length ? await sql<{ code: string; name: string }[]>`select code, name from places where code in ${sql(top.map((p) => p.code))}` : [];
  out.problems = top.map((p) => ({ ...p, name: names.find((n) => n.code === p.code)?.name ?? p.code }));
  return out;
}
