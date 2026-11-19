/**
 * End-to-end check of the core result journey against a running server:
 * register actors → PO signs EC8A results → rival agents co-sign → ward collation
 * with one tampered row → Tally must flag exactly that unit → ledger must verify.
 *
 * Usage: BASE_URL=http://localhost:3100 npx tsx scripts/journey-check.mts
 */
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { generateKeyPair, sha256Hex, type KeyPair } from "../lib/core/crypto";
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

// Citizens: voters report what they see, and photograph the sheet on the wall. Each is a signed event from its own account.
const c1 = await register("citizen", "Voter one (check)");
const c2 = await register("citizen", "Voter two (check)");
const c3 = await register("citizen", "Voter three (check)");
const sync = async (ev: SignedEvent) => { const r = (await post("/api/sync", { items: [{ event: ev }] })).results[0]; if (process.env.DEBUG_SYNC) console.log("sync:", JSON.stringify(r)); return r; };
const reportUnit = units[0].pu_code;
assert((await sync(makeEvent(c1, "pu.queue", reportUnit, { level: "not_opened" }))).status === "accepted", "a voter's queue report is accepted");
assert((await sync(makeEvent(c2, "pu.queue", reportUnit, { level: "not_opened" }))).status === "accepted", "a second voter's report is accepted");
assert((await sync(makeEvent(c3, "pu.queue", reportUnit, { level: "long" }))).status === "accepted", "a third voter's report is accepted");
// An alert needs two different voters saying officials have not arrived at a unit that is not recorded as open.
const [{ code: quietUnit }] = await sql<{ code: string }[]>`select code from places where level = 'pu' and code like ${`${WARD}-%`} and code not in ${sql(units.map((u) => u.pu_code))} order by code desc limit 1`;
assert((await sync(makeEvent(c1, "pu.queue", quietUnit, { level: "not_opened" }))).status === "accepted" && (await sync(makeEvent(c2, "pu.queue", quietUnit, { level: "not_opened" }))).status === "accepted", `two voters report no officials at ${quietUnit}, which is not recorded as open`);
assert((await sync(makeEvent(c3, "pu.queue", reportUnit, { level: "huge" }))).status === "rejected", "an unknown queue level is refused");
assert((await sync(makeEvent(c1, "result.declared", reportUnit, { figures: { votes: { APC: 1 }, accredited: 1, rejected: 0, totalValid: 1 }, readBy: "manual" }))).status === "rejected", "a voter cannot record a result");

const sealedFigures = { votes: units[0].votes, accredited: units[0].accredited, rejected: 0, totalValid: Object.values(units[0].votes).reduce((a, b) => a + b, 0) };
const wrongFigures = { ...sealedFigures, votes: { ...units[0].votes, APC: (units[0].votes.APC ?? 0) + 90 } };
const photo = (n: number) => sha256Hex(new TextEncoder().encode(`wall photo ${n}`));
assert((await sync(makeEvent(c1, "claim.reported", reportUnit, { text: "Photographed the result sheet on the wall", data: { kind: "wall_photo", photoSha256: photo(1), figures: sealedFigures } }))).status === "accepted", "a wall photo that matches is accepted");
assert((await sync(makeEvent(c2, "claim.reported", reportUnit, { text: "Photographed the result sheet on the wall", data: { kind: "wall_photo", photoSha256: photo(2), figures: wrongFigures } }))).status === "accepted", "a wall photo that differs is accepted");
assert((await sync(makeEvent(c3, "claim.reported", reportUnit, { text: "Photographed the result sheet on the wall", data: { kind: "wall_photo", photoSha256: photo(3) } }))).status === "accepted", "a wall photo that could not be read is accepted");

const page = await (await fetch(`${BASE}/p/${reportUnit}`)).text();
assert(page.includes("What voters report") && page.includes("Officials have not arrived") && page.includes("2 voters"), "the unit page shows what voters report, one count per person");
assert(page.includes("3 photographed the sheet on the wall: 1 show the signed figures, 1 show different figures"), "the unit page compares each wall photo with the signed result");
await new Promise((r) => setTimeout(r, 1700));
const mission = await (await fetch(`${BASE}/api/mission`)).json();
assert(mission.alerts.some((a: { k: string }) => a.k === "VOTERS REPORT NO OFFICIALS"), "two voters saying officials have not arrived raises an alert");
assert(mission.alerts.some((a: { k: string }) => a.k === "WALL SHEET READS DIFFERENTLY"), "a wall photo that reads differently raises a neutral alert");

// Accounts: a username and password log a person in on a new phone; a lost phone can be signed out; guessing is locked out.
const user = `check_${Date.now().toString(36)}`;
const regAs = async (keys: KeyPair, name: string, password: string | undefined) =>
  fetch(`${BASE}/api/actors`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "citizen", displayName: name, party: null, publicKey: keys.publicKeyHex, placeCode: null, password }) });
const phoneA = generateKeyPair();
assert((await regAs(phoneA, user, "123")).status === 400, "a password under six characters is refused");
assert((await regAs(generateKeyPair(), "<b>x</b>", "123456")).status === 400, "a username with odd characters is refused");
assert((await regAs(phoneA, user, "abc123")).status === 200, "sign-up with a name and a plain six-character password works");
assert((await regAs(generateKeyPair(), `  ${user.toUpperCase()}  `, "abc123")).status === 409, "a name that is taken is refused, in any case");
const login = (username: string, password: string, keys: KeyPair, signOutOthers = false) =>
  fetch(`${BASE}/api/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password, publicKey: keys.publicKeyHex, signOutOthers }) });
assert((await login(user, "wrong-pass", generateKeyPair())).status === 403, "a wrong password is refused");
assert((await login("Nobody Here", "abc123", generateKeyPair())).status === 403, "an unknown name gets the same refusal");
const phoneB = generateKeyPair();
const okLogin = await login(`  ${user.toUpperCase()} `, "abc123", phoneB);
assert(okLogin.status === 200 && (await okLogin.json()).displayName === user, "the right password logs in on a new phone, whatever the case of the name");
const sendQueue = async (keys: KeyPair) => (await sync(makeEvent(keys, "pu.queue", reportUnit, { level: "short" }))).status;
assert((await sendQueue(phoneB)) === "accepted" && (await sendQueue(phoneA)) === "accepted", "both phones can sign for the same account");
const phoneC = generateKeyPair();
assert((await login(user, "abc123", phoneC, true)).status === 200, "logging in with 'my other phone is lost' succeeds");
assert((await sendQueue(phoneA)) === "rejected" && (await sendQueue(phoneB)) === "rejected", "signed-out phones can no longer sign anything");
assert((await sendQueue(phoneC)) === "accepted", "the phone just logged in still can");
const statuses: number[] = [];
for (let i = 0; i < 5; i++) statuses.push((await login(user, `guess-${i}`, generateKeyPair())).status);
assert(statuses.every((s) => s === 403 || s === 429), `five wrong guesses are refused (got ${statuses.join(",")})`);
const locked = await login(user, "abc123", generateKeyPair());
assert(locked.status === 429, "after five wrong guesses the account is locked, even for the right password");

const audit = await (await fetch(`${BASE}/api/verify`)).json();
assert(audit.intact === true, `ledger intact (${audit.entries} entries)`);

await sql.end();
console.log("\nJourney check passed.");
