/**
 * Pure planning for the labelled election-night simulation. The simulation signs real 2023 figures
 * through the real ledger with DEMO actors; this module only decides who signs what, deterministically.
 */
import { sha256Hex } from "./crypto";
import type { ResultFigures } from "./events";

export const SIM_PARTIES = ["APC", "PDP", "LP", "NNPP"] as const;

/** Stable pseudo-random number in [0, 1) for a unit and a purpose. */
export function unitRandom(unitCode: string, purpose: string): number {
  return parseInt(sha256Hex(`${purpose}:${unitCode}`).slice(0, 8), 16) / 0x1_0000_0000;
}

export type SimOutcome = "sealed" | "witnessed" | "unwitnessed";

/** About 70% of units end the night sealed, 15% witnessed by one party, 15% not witnessed. */
export function planOutcome(unitCode: string): { outcome: SimOutcome; signers: string[]; failedUpload: boolean; failureWitnesses: string[] } {
  const r = unitRandom(unitCode, "outcome");
  const order = [...SIM_PARTIES].sort((a, b) => unitRandom(unitCode, a) - unitRandom(unitCode, b));
  const outcome: SimOutcome = r < 0.7 ? "sealed" : r < 0.85 ? "witnessed" : "unwitnessed";
  const signers = outcome === "sealed" ? order.slice(0, unitRandom(unitCode, "extra") < 0.3 ? 3 : 2) : outcome === "witnessed" ? order.slice(0, 1) : [];
  // Of the failed uploads, about half are seen and signed by agents of two parties, a quarter by one, a quarter only the officer reports.
  const seen = unitRandom(unitCode, "certify");
  return { outcome, signers, failedUpload: unitRandom(unitCode, "upload") < 0.04, failureWitnesses: seen < 0.5 ? order.slice(0, 2) : seen < 0.75 ? order.slice(0, 1) : [] };
}

/**
 * Figures as read from the 2023 IReV sheet. Rejected ballots are not in the public source, so they are
 * simulated as 0; where the source itself has more valid votes than accredited voters, the real arithmetic check flags it.
 */
export function figuresFromReference(votes: Record<string, number>, accredited: number, registered: number): ResultFigures {
  const totalValid = Object.values(votes).reduce((a, b) => a + b, 0);
  return { votes, accredited, registered, rejected: 0, totalValid };
}

export type QueueLevel = "none" | "short" | "medium" | "long" | "not_opened";

/** About 8% of units get one to three simulated voter reports; a very few have officials who "have not arrived". Deterministic per unit. */
export function planVoterReports(unitCode: string): QueueLevel[] {
  if (unitRandom(unitCode, "voters") >= 0.08) return [];
  const n = 1 + Math.floor(unitRandom(unitCode, "voters-n") * 3);
  const stuck = unitRandom(unitCode, "voters-stuck") < 0.12;
  return Array.from({ length: n }, (_, i) => {
    if (stuck) return "not_opened";
    const r = unitRandom(unitCode, `voters-level-${i}`);
    return r < 0.3 ? "none" : r < 0.6 ? "short" : r < 0.8 ? "medium" : "long";
  });
}
