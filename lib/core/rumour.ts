import { joinList } from "./journey";

/**
 * Rumour check, pure part. A forwarded message becomes a Claim; the ledger's evidence decides the verdict.
 * The AI (or the rules fallback) only reads the message. It never decides whether it is true.
 * "unverified" is the default: a claim is confirmed or called false only when signed evidence settles it.
 */
export type ClaimKind = "result_figures" | "collation_changed" | "other";
export type Claim = {
  kind: ClaimKind;
  unitCode?: string;
  placeName?: string;
  party?: string;
  votes?: number;
  summary: string;
  by: "ai" | "rules";
};

export type Evidence = {
  place?: { code: string; name: string; level: "national" | "state" | "lga" | "ward" | "pu" };
  unit?: { status: "sealed" | "witnessed" | "unwitnessed" | "disputed" | null; votes?: Record<string, number>; parties?: string[] };
  collation?: { name: string; level: string; tamperSuspected: boolean; mismatchedUnits: number; matchedUnits: number; unverifiedUnits: number; unitRow?: "match" | "mismatch" | "unverified" };
};

export type VerdictKind = "confirmed" | "false" | "unverified";
export type Verdict = { verdict: VerdictKind; headline: string; reasons: string[] };

export const KNOWN_PARTIES = ["APC", "PDP", "LP", "NNPP", "APGA", "ADC", "SDP", "YPP", "ZLP", "AA", "AAC", "ADP", "APM", "APP", "BP", "NRM", "PRP"];
const UNIT_CODE = /\b\d{2}-\d{2}-\d{2}-\d{3}\b/;
const CHANGE_WORDS = /\b(chang\w*|alter\w*|tamper\w*|manipulat\w*|rigg\w*|swap\w*|inflat\w*|doctor\w*|falsif\w*|fake\w*|cook\w*)\b/i;

/** Deterministic reading, used when the AI is unavailable. Finds a unit code, a party figure and change words. */
export function extractByRules(text: string): Claim {
  const unitCode = text.match(UNIT_CODE)?.[0];
  const party = KNOWN_PARTIES.find((p) => new RegExp(`\\b${p}\\b[^\\d\\n]{0,24}?(\\d{1,6})\\b`, "i").test(text));
  const votes = party ? Number(text.match(new RegExp(`\\b${party}\\b[^\\d\\n]{0,24}?(\\d{1,6})\\b`, "i"))![1]) : undefined;
  const summary = text.replace(/\s+/g, " ").trim().slice(0, 160);
  // A stated figure can be checked directly against the sealed one, so it wins over loose words like "rigged".
  if (party && votes !== undefined) return { kind: "result_figures", unitCode, party, votes, summary, by: "rules" };
  if (CHANGE_WORDS.test(text)) return { kind: "collation_changed", unitCode, summary, by: "rules" };
  return { kind: "other", unitCode, summary, by: "rules" };
}

const unverified = (headline: string, ...reasons: string[]): Verdict => ({ verdict: "unverified", headline, reasons });
const n = (v: number) => v.toLocaleString("en-US");

export function judgeClaim(claim: Claim, ev: Evidence): Verdict {
  if (claim.kind === "other") {
    return unverified("Tally cannot check this one", "It does not make a claim about a recorded result or a collation. Claims about violence or vote buying need someone at the scene: an observer can report it in the app.");
  }
  if (!ev.place) return unverified("Tell us which place this is about", "Search for the polling unit or ward the message mentions, then check again.");

  if (claim.kind === "result_figures") {
    if (ev.place.level !== "pu") return unverified("Pick the polling unit", `The message gives a figure, and figures are signed per polling unit. ${ev.place.name} is not one.`);
    if (!claim.party || claim.votes === undefined) return unverified("Which figure?", "The message does not say which party's votes it claims.");
    const u = ev.unit;
    if (!u || u.status === null) return unverified("No signed result yet", `${ev.place.name} has no result on the ledger, so the figure can be neither confirmed nor denied.`);
    const signed = u.votes?.[claim.party] ?? 0;
    const who = u.parties?.length ? ` by ${joinList(u.parties)}` : "";
    if (u.status === "sealed") {
      return signed === claim.votes
        ? { verdict: "confirmed", headline: `Confirmed: ${claim.party} ${n(signed)}`, reasons: [`Rival parties signed ${claim.party} ${n(signed)} at ${ev.place.name}${who}.`] }
        : { verdict: "false", headline: `Not what was sealed: the message says ${n(claim.votes)}`, reasons: [`The result sealed${who} at ${ev.place.name} gives ${claim.party} ${n(signed)}.`] };
    }
    if (u.status === "disputed") return unverified("The result is disputed", `Witnesses signed different figures at ${ev.place.name}. No single figure is sealed, so Tally does not call this one.`);
    return unverified("Not sealed yet", `${ev.place.name} shows ${claim.party} ${n(signed)}, signed${who || " by the officer only"}. A rival party's signature seals it.`);
  }

  const c = ev.collation;
  if (!c) return unverified("No collation recorded yet", `Nobody has entered a collation covering ${ev.place.name}, so there is nothing to compare with the sealed polling-unit results.`);
  const where = `${c.level === "lga" ? "area council" : c.level} collation at ${c.name}`;
  if (c.unitRow === "mismatch") return { verdict: "confirmed", headline: "Confirmed: the figures were changed", reasons: [`The ${where} announced different figures for ${ev.place.name} than the rival agents sealed. Open the unit to see both.`] };
  if (c.unitRow === "match") return { verdict: "false", headline: "No: the sealed figures were carried unchanged", reasons: [`The ${where} matches what rival agents sealed at ${ev.place.name}.`] };
  if (c.unitRow === "unverified") return unverified("Cannot check this unit", `${ev.place.name} has no sealed result, so the ${where} cannot be compared with it.`);
  if (c.tamperSuspected) return { verdict: "confirmed", headline: "Confirmed: the collation does not match", reasons: [`${n(c.mismatchedUnits)} row${c.mismatchedUnits === 1 ? "" : "s"} in the ${where} were announced with figures that differ from what rival agents sealed.`] };
  if (c.unverifiedUnits === 0) return { verdict: "false", headline: "No: the collation matches every sealed result", reasons: [`All ${n(c.matchedUnits)} rows in the ${where} equal what rival agents sealed.`] };
  return unverified("No difference found, but not everything can be checked", `${n(c.matchedUnits)} rows match. ${n(c.unverifiedUnits)} have no sealed result yet, so they cannot be compared.`);
}
