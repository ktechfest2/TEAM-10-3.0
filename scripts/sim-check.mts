/**
 * End-to-end check of the labelled simulation and mission control, against a running server:
 * reset → run batches → counts and map statuses come from the ledger → an honest collation matches →
 * an altered collation is flagged → the ledger still verifies → reset.
 *
 * Usage: BASE_URL=http://localhost:3100 npx tsx scripts/sim-check.mts
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- loose JSON from our own API in a check script */
const BASE = process.env.BASE_URL ?? "http://localhost:3100";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL · ${msg}`);
  console.log(`ok · ${msg}`);
}

async function post(path: string, body: unknown = {}) {
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json", "x-ops-code": process.env.OPS_CODE ?? "ops-dev" }, body: JSON.stringify(body) });
  return { status: res.status, json: (await res.json()) as Record<string, any> };
}
const get = async (path: string) => (await fetch(`${BASE}${path}`)).json() as Promise<Record<string, any>>;
// Mission control memoises its snapshot for 1.5 s; wait it out so we read what the last write produced.
const fresh = async () => {
  await new Promise((r) => setTimeout(r, 1700));
  return get("/api/mission");
};

const denied = await fetch(`${BASE}/api/ops/reset`, { method: "POST" });
assert(denied.status === 403, "operator tools refuse requests without the operator code");
assert((await post("/api/ops/reset")).status === 200, "reset clears the ledger");
const empty = await get("/api/mission");
assert(empty.totals.reported === 0 && empty.totals.sealed === 0, "an empty ledger shows zero results, not placeholders");
assert(empty.cells.every((c: number) => c === 0), "every map cell starts as 'no result'");

let remaining = Infinity;
for (let i = 0; i < 3; i++) {
  const r = await post("/api/ops/step", { count: 60 });
  assert(r.status === 200 && r.json.processed > 0, `batch ${i + 1} signed ${r.json.processed} units through the real ledger`);
  remaining = r.json.remaining;
}
assert(remaining <= 2822 - 150, "remaining units shrink as the night goes on");

const mid = await fresh();
assert(mid.totals.reported >= 150, `mission control counts ${mid.totals.reported} reported units from the database`);
assert(mid.totals.sealed > 0 && mid.cells.includes(2), "sealed units appear on the map");
assert(mid.simulation.simulated === mid.totals.reported, "every result is labelled as simulated by DEMO actors");
assert(mid.councils.reduce((a: number, c: any) => a + c.sealed, 0) === mid.totals.sealed, "area-council counts add up to the total");

const honest = await post("/api/ops/collate", { mode: "honest" });
assert(honest.status === 200, `an honest ward collation was entered (${honest.json.ward})`);
let snap = await fresh();
assert(snap.totals.tamper === 0, "an honest collation raises no tampering alert");

const bad = await post("/api/ops/collate", { mode: "tamper" });
assert(bad.status === 200, `an altered ward collation was entered (${bad.json.ward})`);
snap = await fresh();
assert(snap.totals.tamper === 1, "exactly one tampering alert is raised");
assert(snap.cells.includes(3), "the altered unit turns red on the map");
assert(snap.alerts.some((a: any) => a.kind === "red"), "the alert feed names the tampering");

// A forwarded message is judged by the ledger, not by the reader: the altered ward is confirmed, the honest one is not.
const claim = "They changed the figures at the ward collation";
const rumourTamper = await post("/api/rumour", { text: claim, placeCode: bad.json.wardCode });
assert(rumourTamper.json.verdict?.verdict === "confirmed", "a rumour about the altered ward is confirmed from the ledger");
const rumourHonest = await post("/api/rumour", { text: claim, placeCode: honest.json.wardCode });
assert(rumourHonest.json.verdict?.verdict === "false", "the same rumour about the honest ward is called false");
const rumourNothing = await post("/api/rumour", { text: "Thugs are attacking voters at the school gate!!", placeCode: bad.json.wardCode });
assert(rumourNothing.json.verdict?.verdict === "unverified", "a claim the ledger cannot settle stays unverified");

const audit = await get("/api/verify");
assert(audit.intact === true, `ledger intact after the simulation (${audit.entries} entries)`);

assert((await post("/api/ops/reset")).status === 200, "reset returns the ledger to a clean start");
console.log("\nSimulation check passed.");
