import "server-only";
import { tamperSms } from "@/lib/core/relocation";
import type { Totals } from "@/lib/core/results";
import { sqlClient as sql } from "@/lib/db/client";
import { siteUrl } from "./alerts";
import { pushToTopic } from "./push";
import { signDemoCollation } from "./simulate";
import { sendSms } from "./sms";
import { getCollationCheck, getPlace, getUnitResults, type UnitResult } from "./views";

const MAX_UNITS = 6;
export type RigUnit = { code: string; name: string; votes: Record<string, number>; signers: string[]; signedAt: string };
export type RigWard = { code: string; name: string; units: RigUnit[] };

const wardOf = (code: string) => code.split("-").slice(0, 3).join("-");
const sealedTotals = (r: UnitResult): Totals => {
  const f = r.best!.figures;
  return { votes: f.votes, accredited: f.accredited, rejected: f.rejected, totalValid: f.totalValid };
};

/** Wards with at least three sealed units: the ones a would-be rigger can try. Same units, in the same order, every time. */
export async function rigWards(limit = 6): Promise<RigWard[]> {
  const national = await getPlace("NG");
  if (!national) return [];
  const results = await getUnitResults(national);
  const byWard = new Map<string, [string, UnitResult][]>();
  for (const entry of results) if (entry[1].best?.trust.status === "sealed") byWard.set(wardOf(entry[0]), [...(byWard.get(wardOf(entry[0])) ?? []), entry]);
  const picked = [...byWard.entries()].filter(([, u]) => u.length >= 3).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])).slice(0, limit);
  const out: RigWard[] = [];
  for (const [wardCode, units] of picked) {
    const ward = await getPlace(wardCode);
    const rows: RigUnit[] = [];
    for (const [code, r] of units.sort((a, b) => a[0].localeCompare(b[0])).slice(0, MAX_UNITS)) {
      const place = await getPlace(code);
      const signers = [...new Set(r.best!.witnesses.filter((w) => w.party).map((w) => w.party!))];
      rows.push({ code, name: place?.name ?? code, votes: r.best!.figures.votes, signers, signedAt: r.best!.occurredAt });
    }
    out.push({ code: wardCode, name: ward?.name ?? wardCode, units: rows });
  }
  return out;
}

export type RigOutcome = {
  caught: boolean;
  ms: number;
  ward: { code: string; name: string };
  mismatches: { code: string; name: string; field: string; announced: number; sealed: number; signers: string[]; signedAt: string }[];
  texted: number;
  smsOff: boolean;
};

/**
 * Announces a ward collation with at most one changed figure, signed by the labelled DEMO collation officer, then runs
 * the same check the public pages run. Followers of a unit whose figures were changed get a text.
 */
export async function rigAttempt(wardCode: string, edit: { unit: string; party: string; votes: number } | null): Promise<RigOutcome> {
  const ward = (await rigWards(50)).find((w) => w.code === wardCode);
  if (!ward) throw new Error("That ward has no sealed results to collate.");
  const wardPlace = (await getPlace(wardCode))!;
  const results = await getUnitResults(wardPlace);
  if (edit && !ward.units.some((u) => u.code === edit.unit && edit.party in u.votes)) throw new Error("That unit or party is not in this ward's sheet.");

  const rows = ward.units.map((u) => {
    const t = sealedTotals(results.get(u.code)!);
    if (!edit || edit.unit !== u.code) return { code: u.code, totals: t };
    // A careful rigger keeps the sheet's arithmetic consistent: total valid votes move with the changed figure.
    const delta = edit.votes - (t.votes[edit.party] ?? 0);
    return { code: u.code, totals: { ...t, votes: { ...t.votes, [edit.party]: edit.votes }, totalValid: Math.max(0, t.totalValid + delta) } };
  });

  const started = performance.now();
  const event = await signDemoCollation(wardCode, rows);
  const check = await getCollationCheck(wardPlace, await getUnitResults(wardPlace));
  const ms = Math.round(performance.now() - started);

  const mismatches = (check?.rows ?? []).filter((r) => r.status === "mismatch").map((r) => {
    const d = r.divergences.find((x) => !["accredited", "rejected", "totalValid"].includes(x.field)) ?? r.divergences[0]!;
    const u = ward.units.find((x) => x.code === r.code)!;
    return { code: r.code, name: r.name, field: d.field, announced: d.announced, sealed: d.computed, signers: u.signers, signedAt: u.signedAt };
  });

  // The demo is more convincing when the tamper arrives as a notification, not only as a page refresh.
  const first = mismatches[0];
  if (first) {
    const payload = {
      title: `Simulated · Tampering suspected: ${ward.name}`,
      body: `${first.name}: ${first.field} announced ${first.announced.toLocaleString("en-US")}, sealed by rival agents ${first.sealed.toLocaleString("en-US")}.`,
      url: `/p/${wardCode}`,
      kind: "red" as const,
      tag: event.contentHash,
    };
    await Promise.all([
      pushToTopic("mission", payload, event.contentHash).catch((e) => console.error("Push alert failed:", e)),
      pushToTopic(`place:${first.code}`, payload, event.contentHash).catch((e) => console.error("Push alert failed:", e)),
    ]);
  }

  let texted = 0;
  let smsOff = false;
  for (const m of mismatches) {
    const subs = await sql<{ id: string; phone: string }[]>`select id, phone from alert_subscriptions where place_code = ${m.code}`;
    const text = tamperSms(m.name, ward.name, m.field, m.announced, m.sealed, `${siteUrl()}/p/${wardCode}`);
    for (const s of subs) {
      const [claimed] = await sql`insert into alert_deliveries (subscription_id, content_hash, message, status) values (${s.id}, ${event.contentHash}, ${text}, 'sending') on conflict do nothing returning id`;
      if (!claimed) continue;
      const r = await sendSms(s.phone, text);
      await sql`update alert_deliveries set status = ${r.status}, detail = ${r.detail ?? null} where id = ${claimed.id}`;
      if (r.status === "sent") texted++;
      if (r.status === "not_configured") smsOff = true;
    }
  }
  return { caught: Boolean(check?.tamperSuspected), ms, ward: { code: ward.code, name: ward.name }, mismatches, texted, smsOff };
}
