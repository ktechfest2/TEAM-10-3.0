import { t, type Lang, type MessageKey } from "./i18n";
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
  /** The signed results behind the verdict come from the labelled simulation. */
  simulated?: boolean;
  place?: { code: string; name: string; level: "national" | "state" | "lga" | "ward" | "pu" };
  unit?: { status: "sealed" | "witnessed" | "unwitnessed" | "disputed" | null; votes?: Record<string, number>; parties?: string[] };
  collation?: { name: string; level: string; tamperSuspected: boolean; mismatchedUnits: number; matchedUnits: number; unverifiedUnits: number; unitRow?: "match" | "mismatch" | "unverified" };
};

export type VerdictKind = "confirmed" | "false" | "unverified";
export type Verdict = { verdict: VerdictKind; headline: string; reasons: string[]; simulated?: boolean };

export const KNOWN_PARTIES = ["APC", "PDP", "LP", "NNPP", "APGA", "ADC", "SDP", "YPP", "ZLP", "AA", "AAC", "ADP", "APM", "APP", "BP", "NRM", "PRP"];
const UNIT_CODE = /\b\d{2}-\d{2}-\d{2}-\d{3}\b/;
const CHANGE_WORDS = /\b(chang\w*|alter\w*|tamper\w*|manipulat\w*|rigg\w*|swap\w*|inflat\w*|doctor\w*|falsif\w*|fake\w*|cook\w*|cheat\w*|steal\w*|stole\w*|thumbprint\w*)\b/i;

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

const n = (v: number) => v.toLocaleString("en-US");

export function judgeClaim(claim: Claim, ev: Evidence, lang: Lang = "en"): Verdict {
  const v = judge(claim, ev, lang);
  return ev.simulated ? { ...v, simulated: true } : v;
}

function judge(claim: Claim, ev: Evidence, lang: Lang): Verdict {
  const T = (key: MessageKey, vars?: Record<string, string | number>) => t(lang, key, vars);
  const mk = (verdict: VerdictKind, h: MessageKey, r: MessageKey, vars: Record<string, string | number> = {}, hVars: Record<string, string | number> = vars): Verdict => ({ verdict, headline: T(h, hVars), reasons: [T(r, vars)] });

  if (claim.kind === "other") return mk("unverified", "r.other.h", "r.other.r");
  if (!ev.place) return mk("unverified", "r.noplace.h", "r.noplace.r");
  const place = ev.place.name;

  if (claim.kind === "result_figures") {
    if (ev.place.level !== "pu") return mk("unverified", "r.notpu.h", "r.notpu.r", { place });
    if (!claim.party || claim.votes === undefined) return mk("unverified", "r.nofig.h", "r.nofig.r");
    const u = ev.unit;
    if (!u || u.status === null) return mk("unverified", "r.noresult.h", "r.noresult.r", { place });
    const signed = u.votes?.[claim.party] ?? 0;
    const who = u.parties?.length ? T("r.by", { signers: joinList(u.parties, lang) }) : T("r.officerOnly");
    const vars = { place, party: claim.party, n: n(signed), who };
    if (u.status === "sealed") {
      return signed === claim.votes ? mk("confirmed", "r.fig.true.h", "r.fig.true.r", vars) : mk("false", "r.fig.false.h", "r.fig.false.r", vars, { claimed: n(claim.votes) });
    }
    if (u.status === "disputed") return mk("unverified", "r.disputed.h", "r.disputed.r", { place });
    return mk("unverified", "r.unsealed.h", "r.unsealed.r", vars);
  }

  const c = ev.collation;
  if (!c) return mk("unverified", "r.nocol.h", "r.nocol.r", { place });
  const where = T("r.where", { level: T(c.level === "lga" ? "l.lga" : c.level === "ward" ? "l.ward" : "l.state"), name: c.name });
  const vars = { place, where };
  if (c.unitRow === "mismatch") return mk("confirmed", "r.col.changed.h", "r.col.changed.r", vars);
  if (c.unitRow === "match") return mk("false", "r.col.carried.h", "r.col.carried.r", vars);
  if (c.unitRow === "unverified") return mk("unverified", "r.col.unitunver.h", "r.col.unitunver.r", vars);
  if (c.tamperSuspected) return mk("confirmed", "r.col.tamper.h", c.mismatchedUnits === 1 ? "r.col.tamper.one" : "r.col.tamper.many", { n: n(c.mismatchedUnits), where });
  if (c.unverifiedUnits === 0) return mk("false", "r.col.allmatch.h", "r.col.allmatch.r", { n: n(c.matchedUnits), where });
  return mk("unverified", "r.col.partial.h", "r.col.partial.r", { n: n(c.matchedUnits), m: n(c.unverifiedUnits) });
}

/** The party a message is about, if it names exactly one known party. */
export function partyMentioned(text: string): string | undefined {
  const found = KNOWN_PARTIES.filter((p) => new RegExp(`\\b${p}\\b`, "i").test(text));
  return found.length === 1 ? found[0] : undefined;
}
