import "server-only";
import { randomUUID } from "node:crypto";
import { hexToBytes, keyPairFromSeed, sha256Hex, type KeyPair } from "@/lib/core/crypto";
import { cosign, signEvent, type Role } from "@/lib/core/events";
import { sumTotals, type Totals } from "@/lib/core/results";
import { figuresFromReference, planOutcome, SIM_PARTIES } from "@/lib/core/simulation";
import { sqlClient as sql } from "@/lib/db/client";
import { ingest } from "./ledger";
import { getPlace, getUnitResults } from "./views";

export const demoEnabled = () => process.env.DEMO_ENABLED !== "0";

const SEED = process.env.DEMO_SEED ?? "tally-demo-actors";

type DemoActor = { id: string; keys: KeyPair };
type Actors = { officer: DemoActor; collation: DemoActor; agents: Record<string, DemoActor> };
let cache: Actors | null = null;

async function upsert(name: string, role: Exclude<Role, "system">, party: string | null): Promise<DemoActor> {
  const keys = keyPairFromSeed(hexToBytes(sha256Hex(`${SEED}:${name}`)));
  const [row] = await sql<{ id: string }[]>`
    insert into actors (role, party, display_name, public_key, is_demo)
    values (${role}, ${party}, ${name}, ${keys.publicKeyHex}, 1)
    on conflict (public_key) do update set display_name = excluded.display_name
    returning id`;
  return { id: row.id, keys };
}

/** DEMO actors are labelled in their names and flagged is_demo. Their keys derive from a seed, so the simulation can sign. */
async function actors(): Promise<Actors> {
  if (cache) return cache;
  const agents: Record<string, DemoActor> = {};
  for (const p of SIM_PARTIES) agents[p] = await upsert(`DEMO ${p} agent`, "party_agent", p);
  cache = { officer: await upsert("DEMO Presiding officer", "presiding_officer", null), collation: await upsert("DEMO Collation officer", "collation_officer", null), agents };
  return cache;
}

export async function simulationState() {
  const [{ remaining }] = await sql<{ remaining: number }[]>`
    select count(*)::int as remaining from reference_2023 r
    where not exists (select 1 from events e where e.type = 'result.declared' and e.place_code = r.pu_code)`;
  const [{ done }] = await sql<{ done: number }[]>`
    select count(*)::int as done from events e join actors a on a.id = e.author_id
    where e.type = 'result.declared' and a.display_name like 'DEMO %'`;
  return { remaining, simulated: done };
}

/** Signs the next batch of units. Every event goes through the same ingest path as a real phone's sync. */
export async function stepSimulation(count: number) {
  const a = await actors();
  const rows = await sql<{ pu_code: string; votes: Record<string, number>; accredited: number; registered: number }[]>`
    select r.pu_code, r.votes, r.accredited, r.registered from reference_2023 r
    where not exists (select 1 from events e where e.type = 'result.declared' and e.place_code = r.pu_code)
    order by md5(r.pu_code) limit ${count}`;

  let rejected = 0;
  for (const row of rows) {
    const plan = planOutcome(row.pu_code);
    const now = new Date().toISOString();
    const figures = figuresFromReference(row.votes, row.accredited, row.registered);
    const event = signEvent({ id: randomUUID(), type: "result.declared", placeCode: row.pu_code, payload: { figures, readBy: "manual" }, occurredAt: now, authorKey: a.officer.keys.publicKeyHex }, a.officer.keys.secretKeyHex);
    const cosignatures = plan.signers.map((p) => cosign(event.contentHash, a.agents[p].keys.secretKeyHex, a.agents[p].keys.publicKeyHex, now));
    const res = await ingest({ event, cosignatures }, "simulation");
    if (res.status === "rejected") {
      rejected++;
      continue;
    }
    if (plan.failedUpload) {
      const t = signEvent({ id: randomUUID(), type: "transmission.attempted", placeCode: row.pu_code, payload: { outcome: "failed", detail: "BVAS upload failed (simulated)" }, occurredAt: now, authorKey: a.officer.keys.publicKeyHex }, a.officer.keys.secretKeyHex);
      await ingest({ event: t }, "simulation");
    }
  }
  return { processed: rows.length - rejected, rejected, ...(await simulationState()) };
}

/** A ward collation built from the sealed units. Honest, or with one row inflated by 100 APC votes. */
export async function collateWard(mode: "honest" | "tamper") {
  const a = await actors();
  const national = await getPlace("NG");
  if (!national) throw new Error("Places are not seeded");
  const results = await getUnitResults(national);
  const done = new Set((await sql<{ place_code: string }[]>`select distinct place_code from events where type = 'collation.entered'`).map((r) => r.place_code));

  const byWard = new Map<string, { code: string; totals: Totals }[]>();
  for (const [code, r] of results) {
    if (r.best?.trust.status !== "sealed") continue;
    const ward = code.split("-").slice(0, 3).join("-");
    const f = r.best.figures;
    byWard.set(ward, [...(byWard.get(ward) ?? []), { code, totals: { votes: f.votes, accredited: f.accredited, rejected: f.rejected, totalValid: f.totalValid } }]);
  }
  // Prefer a ward with several sealed units but not a huge one; tamper and honest pick different wards.
  const candidates = [...byWard.entries()].filter(([w, rows]) => !done.has(w) && rows.length >= 3).sort((x, y) => Math.abs(x[1].length - 8) - Math.abs(y[1].length - 8));
  if (candidates.length === 0) throw new Error("No ward has enough sealed units yet. Run the simulation first.");
  const [wardCode, rows] = candidates[0];
  const announcedRows = rows.map((r, i) =>
    mode === "tamper" && i === 0 ? { code: r.code, totals: { ...r.totals, votes: { ...r.totals.votes, APC: (r.totals.votes.APC ?? 0) + 100 }, totalValid: r.totals.totalValid + 100, accredited: r.totals.accredited + 100 } } : r,
  );
  const announced = sumTotals(announcedRows.map((r) => r.totals));
  const now = new Date().toISOString();
  const event = signEvent({ id: randomUUID(), type: "collation.entered", placeCode: wardCode, payload: { level: "ward", rows: announcedRows, announced }, occurredAt: now, authorKey: a.collation.keys.publicKeyHex }, a.collation.keys.secretKeyHex);
  const res = await ingest({ event }, "simulation");
  if (res.status === "rejected") throw new Error(res.reason ?? "Collation rejected");
  const ward = await getPlace(wardCode);
  return { ward: ward?.name ?? wardCode, wardCode, rows: rows.length, tampered: mode === "tamper" };
}

/** Wipes the ledger so the demo can start again. Only meant for demo deployments. */
export async function resetDemo() {
  await sql`truncate table events, witnesses, anchors, media restart identity`;
  return { ok: true };
}
