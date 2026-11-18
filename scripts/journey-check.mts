/**
 * End-to-end check of the core result journey against a running server:
 * register actors → PO signs EC8A results → rival agents co-sign → ward collation
 * with one tampered row → Tally must flag exactly that unit → ledger must verify.
 *
 * Usage: BASE_URL=http://localhost:3100 npx tsx scripts/journey-check.mts
 */
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { generateKeyPair, type KeyPair } from "../lib/core/crypto";
import { cosign, signEvent, type EventType, type SignedEvent } from "../lib/core/events";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const WARD = process.env.WARD ?? "37-01-01";
const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL · ${msg}`);
  console.log(`ok · ${msg}`);
}

async function post(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) throw new Error(`${path} ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

async function register(role: string, displayName: string, party?: string, placeCode?: string): Promise<KeyPair> {
  const keys = generateKeyPair();
  await post("/api/actors", { role, displayName, party: party ?? null, publicKey: keys.publicKeyHex, placeCode: placeCode ?? null, inviteCode: process.env.TALLY_INVITE_CODE ?? "TALLY-DEV" });
  return keys;
}

function makeEvent(keys: KeyPair, type: EventType, placeCode: string, payload: unknown, occurredAt = new Date().toISOString()): SignedEvent {
  return signEvent({ id: randomUUID(), type, placeCode, payload, occurredAt, authorKey: keys.publicKeyHex }, keys.secretKeyHex);
}

const units = await sql<{ pu_code: string; votes: Record<string, number>; accredited: number; registered: number }[]>`
  select r.pu_code, r.votes, r.accredited, r.registered from reference_2023 r where r.pu_code like ${`${WARD}-%`} order by r.pu_code limit 5`;
assert(units.length >= 3, `ward ${WARD} has reference units`);

const po = await register("presiding_officer", "PO (journey check)");
const apc = await register("party_agent", "APC agent (check)", "APC");
const pdp = await register("party_agent", "PDP agent (check)", "PDP");
const lp = await register("party_agent", "LP agent (check)", "LP");
const officer = await register("collation_officer", "Ward collation officer (check)");

const declared: { code: string; totals: { votes: Record<string, number>; accredited: number; rejected: number; totalValid: number } }[] = [];
for (const [i, u] of units.entries()) {
  const totalValid = Object.values(u.votes).reduce((a, b) => a + b, 0);
  const figures = { votes: u.votes, accredited: u.accredited, registered: u.registered, rejected: 0, totalValid };
  const ev = makeEvent(po, "result.declared", u.pu_code, { figures, readBy: "manual" });
  const signers = i === units.length - 1 ? [apc] : [apc, pdp, lp]; // last unit: only one party → not sealed
  const cosigs = signers.map((k) => cosign(ev.contentHash, k.secretKeyHex, k.publicKeyHex, new Date().toISOString()));
  const { results } = await post("/api/sync", { items: [{ event: ev, cosignatures: cosigs }] });
  assert(results[0].status === "accepted" && results[0].cosignatures.every((c: { status: string }) => c.status === "accepted"), `result for ${u.pu_code} accepted with ${signers.length} co-signature(s)`);
  declared.push({ code: u.pu_code, totals: { votes: u.votes, accredited: u.accredited, rejected: 0, totalValid } });
}

// Re-sync the same item (a relaying phone): must be idempotent.
const replay = makeEvent(po, "pu.opened", units[0].pu_code, { text: "Opened" });
const first = await post("/api/sync", { items: [{ event: replay }] });
const second = await post("/api/sync", { items: [{ event: replay }] });
assert(first.results[0].status === "accepted" && second.results[0].status === "duplicate", "re-syncing the same event is idempotent");

// Forged event: author signs, then a figure is changed in transit.
const forged = makeEvent(po, "result.declared", units[0].pu_code, { figures: { ...declared[0].totals, registered: 1 }, readBy: "manual" });
const tamperedInTransit = { ...forged, payload: { figures: { ...declared[0].totals, votes: { ...declared[0].totals.votes, APC: 999 } }, readBy: "manual" } };
const forgedRes = await post("/api/sync", { items: [{ event: tamperedInTransit }] });
assert(forgedRes.results[0].status === "rejected", "an event altered after signing is rejected");

// Role enforcement: an agent cannot declare results.
const agentDeclares = makeEvent(apc, "result.declared", units[0].pu_code, { figures: { ...declared[0].totals }, readBy: "manual" });
const roleRes = await post("/api/sync", { items: [{ event: agentDeclares }] });
assert(roleRes.results[0].status === "rejected", "a party agent cannot record a result");

// Ward collation: officer inflates APC in unit #2.
const target = declared[1];
const rows = declared.map((d) =>
  d.code === target.code ? { code: d.code, totals: { ...d.totals, votes: { ...d.totals.votes, APC: (d.totals.votes.APC ?? 0) + 100 }, totalValid: d.totals.totalValid + 100, accredited: d.totals.accredited + 100 } } : d,
);
const announced = rows.reduce(
  (acc, r) => {
    for (const [p, n] of Object.entries(r.totals.votes)) acc.votes[p] = (acc.votes[p] ?? 0) + n;
    acc.accredited += r.totals.accredited;
    acc.rejected += r.totals.rejected;
    acc.totalValid += r.totals.totalValid;
    return acc;
  },
  { votes: {} as Record<string, number>, accredited: 0, rejected: 0, totalValid: 0 },
);
const collation = makeEvent(officer, "collation.entered", WARD, { level: "ward", rows, announced });
const colRes = await post("/api/sync", { items: [{ event: collation }] });
assert(colRes.results[0].status === "accepted", "ward collation accepted onto the ledger");

const view = await (await fetch(`${BASE}/api/places/${WARD}`)).json();
const mismatches = view.collation.rows.filter((r: { status: string }) => r.status === "mismatch");
assert(view.collation.tamperSuspected === true, "collation flagged as tamper suspected");
assert(mismatches.length === 1 && mismatches[0].code === target.code, `exactly the altered unit (${target.code}) is pinpointed`);
assert(view.collation.rows.some((r: { status: string }) => r.status === "unverified"), "a unit sealed by only one party is 'unverified', not trusted");

const unitView = await (await fetch(`${BASE}/api/places/${units[0].pu_code}`)).json();
assert(unitView.result.best.trust.status === "sealed", "a unit co-signed by APC, PDP and LP is Sealed");

const audit = await (await fetch(`${BASE}/api/verify`)).json();
assert(audit.intact === true, `ledger intact (${audit.entries} entries)`);

await sql.end();
console.log("\nJourney check passed.");
