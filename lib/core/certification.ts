/**
 * Upload-failure certification. The Electoral Act keeps paper as the record "when transmission fails" but does not
 * say who certifies a failure. Tally's answer mirrors the seal: a failure the officer reports stays a claim until
 * independent witnesses, who saw it, co-sign the same record.
 *   claimed   - only the officer says so
 *   witnessed - one independent party agent or observer co-signed
 *   certified - two or more independent witnesses co-signed
 * Independence: two agents of the same party count once; an observer counts as their own chain.
 */
export type CertificationLevel = "claimed" | "witnessed" | "certified";
export type FailureWitness = { actorId: string; role: string; party?: string | null };

const INDEPENDENT_ROLES = new Set(["party_agent", "observer", "community_leader"]);

export function independentChains(witnesses: FailureWitness[]): string[] {
  const chains = new Set<string>();
  for (const w of witnesses) {
    if (!INDEPENDENT_ROLES.has(w.role)) continue;
    chains.add(w.role === "party_agent" && w.party ? `party:${w.party}` : `actor:${w.actorId}`);
  }
  return [...chains];
}

export function certifyFailure(witnesses: FailureWitness[]): CertificationLevel {
  const n = independentChains(witnesses).length;
  return n >= 2 ? "certified" : n === 1 ? "witnessed" : "claimed";
}
