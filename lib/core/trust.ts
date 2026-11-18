/**
 * One trust engine for everything. AI reads; this transparent math decides.
 * Ideas carried over from the team's Stage 1 screening work (rewritten here):
 * independent chains (copies are not new witnesses), firsthand > hearsay,
 * Beta source reliability, time decay, and an inspectable evidence trace.
 */

export const WITNESS_WEIGHTS = {
  signed_rival_agent: 2.5,
  signed_observer: 2.0,
  external_match: 1.5,
  signed_official: 1.2,
  firsthand: 1.0,
  signed_same_party: 0.8,
  secondhand: 0.48,
  forwarded: 0.25,
  system_check: 2.0,
} as const;
export type WitnessKind = keyof typeof WITNESS_WEIGHTS;

export type Evidence = {
  id: string;
  label: string;
  direction: "support" | "oppose";
  kind: WitnessKind;
  /** Source reliability in [0, 1]. Defaults to 0.75 for signed, accountable actors. */
  reliability?: number;
  /** Independence group. Evidence in the same chain gets diminishing returns. */
  chain: string;
  minutesAgo?: number;
  /** Half-life for time decay. Omit for permanent evidence such as signatures on a result. */
  halfLifeMinutes?: number;
  severity?: number;
};

export type TraceLine = { id: string; label: string; effect: number; detail: string };
export type TrustScore = { probability: number; logOdds: number; trace: TraceLine[]; independentChains: number };

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const logit = (p: number) => Math.log(p / (1 - p));

export function betaReliability(alpha: number, beta: number): number {
  return alpha / (alpha + beta);
}

function strength(e: Evidence): number {
  const decay =
    e.halfLifeMinutes && e.minutesAgo !== undefined
      ? Math.exp((-Math.LN2 * Math.max(0, e.minutesAgo)) / e.halfLifeMinutes)
      : 1;
  return WITNESS_WEIGHTS[e.kind] * (e.reliability ?? 0.75) * (e.severity ?? 1) * decay;
}

export function scoreEvidence(prior: number, evidence: Evidence[]): TrustScore {
  let logOdds = logit(Math.min(0.99, Math.max(0.01, prior)));
  const trace: TraceLine[] = [];
  const chains = new Map<string, Evidence[]>();
  for (const e of evidence) chains.set(e.chain, [...(chains.get(e.chain) ?? []), e]);

  for (const items of chains.values()) {
    const sorted = [...items].sort((a, b) => strength(b) - strength(a));
    sorted.forEach((e, index) => {
      const effect = (e.direction === "support" ? 1 : -1) * strength(e) * (1 / (index + 1));
      logOdds += effect;
      trace.push({
        id: e.id,
        label: e.label,
        effect,
        detail: index === 0 ? e.kind.replaceAll("_", " ") : `${e.kind.replaceAll("_", " ")} · same chain, discounted`,
      });
    });
  }

  trace.sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect));
  return { probability: sigmoid(logOdds), logOdds, trace, independentChains: chains.size };
}

/* ------------------------------------------------------------------------ */
/* Results                                                                   */
/* ------------------------------------------------------------------------ */

export type ResultWitness = {
  actorId: string;
  role: "presiding_officer" | "party_agent" | "observer" | "community_leader" | "citizen";
  party?: string | null;
  reliability?: number;
  isAuthor?: boolean;
};

export type ResultStatus = "sealed" | "witnessed" | "unwitnessed" | "disputed";

export type ResultTrustInput = {
  witnesses: ResultWitness[];
  arithmeticIssues: { code: string; message: string }[];
  /** Other signed versions of this unit's result with different figures. */
  conflictingVersions: { contentHash: string; parties: string[] }[];
  /** Independent figures (e.g. IReV/public data) compared with these figures. */
  externalMatch?: { source: string; matches: boolean } | null;
};

export type ResultTrust = TrustScore & {
  status: ResultStatus;
  sealingParties: string[];
  verdict: string;
};

export function scoreResult(input: ResultTrustInput): ResultTrust {
  const evidence: Evidence[] = [];
  const parties = new Set<string>();

  for (const w of input.witnesses) {
    if (w.role === "presiding_officer") {
      evidence.push({ id: w.actorId, label: "Presiding officer signed", direction: "support", kind: "signed_official", chain: "official", reliability: w.reliability });
    } else if (w.role === "party_agent" && w.party) {
      const isNewParty = !parties.has(w.party);
      parties.add(w.party);
      evidence.push({
        id: w.actorId,
        label: `${w.party} agent co-signed`,
        direction: "support",
        kind: isNewParty ? "signed_rival_agent" : "signed_same_party",
        chain: `party:${w.party}`,
        reliability: w.reliability,
      });
    } else if (w.role === "observer") {
      evidence.push({ id: w.actorId, label: "Observer co-signed", direction: "support", kind: "signed_observer", chain: `observer:${w.actorId}`, reliability: w.reliability });
    } else {
      evidence.push({ id: w.actorId, label: `${w.role.replace("_", " ")} photo matches`, direction: "support", kind: "firsthand", chain: `citizen:${w.actorId}`, reliability: w.reliability ?? 0.5 });
    }
  }

  for (const issue of input.arithmeticIssues) {
    evidence.push({ id: issue.code, label: issue.message, direction: "oppose", kind: "system_check", chain: `check:${issue.code}`, reliability: 1 });
  }
  for (const c of input.conflictingVersions) {
    evidence.push({
      id: c.contentHash,
      label: `A different version was signed by ${c.parties.join(", ") || "another witness"}`,
      direction: "oppose",
      kind: c.parties.length > 0 ? "signed_rival_agent" : "signed_official",
      chain: `conflict:${c.contentHash}`,
      reliability: 0.75,
    });
  }
  if (input.externalMatch) {
    evidence.push({
      id: `external:${input.externalMatch.source}`,
      label: input.externalMatch.matches ? `Matches ${input.externalMatch.source}` : `Differs from ${input.externalMatch.source}`,
      direction: input.externalMatch.matches ? "support" : "oppose",
      kind: "external_match",
      chain: `external:${input.externalMatch.source}`,
      reliability: 0.8,
    });
  }

  const score = scoreEvidence(0.5, evidence);
  const sealingParties = [...parties].sort();
  const disputed = input.conflictingVersions.some((c) => c.parties.length > 0);
  const status: ResultStatus = disputed
    ? "disputed"
    : sealingParties.length >= 2
      ? "sealed"
      : sealingParties.length === 1 || input.witnesses.some((w) => w.role === "observer")
        ? "witnessed"
        : "unwitnessed";

  const verdict =
    status === "disputed"
      ? "Disputed: witnesses signed different figures."
      : status === "sealed"
        ? `Sealed by ${sealingParties.length} rival parties (${sealingParties.join(", ")}).`
        : status === "witnessed"
          ? "Witnessed, but not yet sealed by two rival parties."
          : "Not yet witnessed by any agent or observer.";

  return { ...score, status, sealingParties, verdict };
}
