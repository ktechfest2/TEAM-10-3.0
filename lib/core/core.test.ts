import { describe, expect, it } from "vitest";
import { generateKeyPair } from "./crypto";
import {
  cosign,
  findChainBreak,
  GENESIS_HASH,
  ledgerHashOf,
  signEvent,
  verifyCosignature,
  verifySignedEvent,
  type LedgerEntry,
  type UnsignedEvent,
} from "./events";
import { merkleProof, merkleRoot, verifyMerkleProof } from "./merkle";
import { checkResultArithmetic, marginOfLead, reconcile, sumTotals } from "./results";
import { scoreEvidence, scoreResult } from "./trust";

const po = generateKeyPair();
const figures = { votes: { APC: 213, PDP: 180, LP: 95 }, accredited: 500, rejected: 7, totalValid: 488 };
const base: UnsignedEvent = {
  id: "7f9c1c1e-6b8e-4a3e-9a5e-0c3c3f1f2b11",
  type: "result.declared",
  placeCode: "37-06-01-007",
  payload: { figures, readBy: "manual" },
  occurredAt: "2027-01-16T17:42:00.000Z",
  authorKey: po.publicKeyHex,
};

describe("signed events", () => {
  it("verifies an untouched event", () => {
    expect(verifySignedEvent(signEvent(base, po.secretKeyHex))).toEqual({ ok: true });
  });

  it("detects a changed figure after signing", () => {
    const signed = signEvent(base, po.secretKeyHex);
    const tampered = { ...signed, payload: { figures: { ...figures, votes: { ...figures.votes, APC: 312 } }, readBy: "manual" } };
    expect(verifySignedEvent(tampered)).toMatchObject({ ok: false, reason: "content hash does not match content" });
  });

  it("rejects a signature from a different key", () => {
    const other = generateKeyPair();
    const forged = { ...signEvent(base, other.secretKeyHex), authorKey: po.publicKeyHex };
    expect(verifySignedEvent(forged).ok).toBe(false);
  });

  it("is independent of object key order (two devices, same content)", () => {
    const reordered = { ...base, payload: { readBy: "manual", figures: { totalValid: 488, rejected: 7, accredited: 500, votes: { LP: 95, PDP: 180, APC: 213 } } } };
    expect(signEvent(reordered, po.secretKeyHex).contentHash).toBe(signEvent(base, po.secretKeyHex).contentHash);
  });

  it("accepts a rival agent co-signature and rejects a forged one", () => {
    const signed = signEvent(base, po.secretKeyHex);
    const agent = generateKeyPair();
    const c = cosign(signed.contentHash, agent.secretKeyHex, agent.publicKeyHex, base.occurredAt);
    expect(verifyCosignature(c)).toBe(true);
    expect(verifyCosignature({ ...c, witnessKey: generateKeyPair().publicKeyHex })).toBe(false);
  });

  it("rejects an invalid payload for the event type", () => {
    const bad = signEvent({ ...base, payload: { figures: { ...figures, accredited: -1 }, readBy: "manual" } }, po.secretKeyHex);
    expect(verifySignedEvent(bad).ok).toBe(false);
  });
});

describe("ledger chain", () => {
  function chain(hashes: string[]): LedgerEntry[] {
    let prev = GENESIS_HASH;
    return hashes.map((contentHash, i) => {
      const ledgerHash = ledgerHashOf(prev, contentHash);
      const entry = { seq: i + 1, contentHash, prevHash: prev, ledgerHash };
      prev = ledgerHash;
      return entry;
    });
  }
  const hashes = ["a", "b", "c", "d"].map((x) => x.repeat(64));

  it("passes when intact", () => expect(findChainBreak(chain(hashes))).toBeNull());

  it("finds the exact entry that was edited", () => {
    const entries = chain(hashes);
    entries[2] = { ...entries[2], contentHash: "e".repeat(64) };
    expect(findChainBreak(entries)).toBe(3);
  });
});

describe("merkle anchoring", () => {
  const leaves = Array.from({ length: 7 }, (_, i) => `${i}`.repeat(64).slice(0, 64));
  it("proves inclusion of every leaf", () => {
    const root = merkleRoot(leaves);
    leaves.forEach((leaf, i) => expect(verifyMerkleProof(leaf, merkleProof(leaves, i), root)).toBe(true));
  });
  it("rejects a leaf that was not anchored", () => {
    const root = merkleRoot(leaves);
    expect(verifyMerkleProof("f".repeat(64), merkleProof(leaves, 0), root)).toBe(false);
  });
});

describe("result arithmetic", () => {
  it("accepts consistent figures", () => expect(checkResultArithmetic(figures)).toEqual([]));
  it("flags party votes that do not add up", () => {
    expect(checkResultArithmetic({ ...figures, totalValid: 500 }).map((i) => i.code)).toContain("VALID_SUM");
  });
  it("flags over-voting", () => {
    expect(checkResultArithmetic({ ...figures, accredited: 300 }).map((i) => i.code)).toContain("OVERVOTING");
  });
});

describe("collation", () => {
  const units = [
    { votes: { APC: 213, PDP: 180 }, accredited: 400, rejected: 2, totalValid: 393 },
    { votes: { APC: 100, PDP: 150 }, accredited: 260, rejected: 3, totalValid: 250 },
  ];
  it("finds no divergence when announced equals the sealed sum", () => {
    expect(reconcile(sumTotals(units), sumTotals(units))).toEqual([]);
  });
  it("pinpoints an inflated party total", () => {
    const announced = { ...sumTotals(units), votes: { APC: 412, PDP: 330 } };
    expect(reconcile(announced, sumTotals(units))).toEqual([{ field: "APC", announced: 412, computed: 313 }]);
  });
  it("requires a supplementary election when cancelled voters exceed the margin", () => {
    expect(marginOfLead({ APC: 1000, PDP: 950 }, 60).supplementaryRequired).toBe(true);
    expect(marginOfLead({ APC: 1000, PDP: 900 }, 60).supplementaryRequired).toBe(false);
  });
});

describe("trust engine", () => {
  it("seals only with two rival parties", () => {
    const one = scoreResult({ witnesses: [{ actorId: "po", role: "presiding_officer" }, { actorId: "a1", role: "party_agent", party: "APC" }], arithmeticIssues: [], conflictingVersions: [] });
    const two = scoreResult({ witnesses: [{ actorId: "po", role: "presiding_officer" }, { actorId: "a1", role: "party_agent", party: "APC" }, { actorId: "a2", role: "party_agent", party: "PDP" }], arithmeticIssues: [], conflictingVersions: [] });
    expect(one.status).toBe("witnessed");
    expect(two.status).toBe("sealed");
    expect(two.probability).toBeGreaterThan(one.probability);
  });

  it("does not treat two agents of the same party as independent", () => {
    const same = scoreResult({ witnesses: [{ actorId: "a1", role: "party_agent", party: "APC" }, { actorId: "a2", role: "party_agent", party: "APC" }], arithmeticIssues: [], conflictingVersions: [] });
    expect(same.status).toBe("witnessed");
    expect(same.independentChains).toBe(1);
  });

  it("marks a result disputed when a rival signed different figures", () => {
    const r = scoreResult({
      witnesses: [{ actorId: "a1", role: "party_agent", party: "APC" }, { actorId: "a2", role: "party_agent", party: "PDP" }],
      arithmeticIssues: [],
      conflictingVersions: [{ contentHash: "x".repeat(64), parties: ["LP"] }],
    });
    expect(r.status).toBe("disputed");
  });

  it("forwarded copies are one chain with diminishing returns", () => {
    const forwards = Array.from({ length: 5 }, (_, i) => ({ id: `f${i}`, label: "forward", direction: "support" as const, kind: "forwarded" as const, chain: "rumour-1" }));
    const fiveForwards = scoreEvidence(0.2, forwards);
    const oneFirsthand = scoreEvidence(0.2, [{ id: "w", label: "eyewitness", direction: "support", kind: "firsthand", chain: "w" }]);
    expect(fiveForwards.independentChains).toBe(1);
    expect(oneFirsthand.probability).toBeGreaterThan(fiveForwards.probability);
  });
});
