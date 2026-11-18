/** Merkle tree over ledger hashes, so one anchored root proves inclusion of every event. */
import { sha256Hex } from "./crypto";

const node = (left: string, right: string) => sha256Hex(`node:${left}${right}`);
const leaf = (value: string) => sha256Hex(`leaf:${value}`);

export function merkleRoot(values: string[]): string {
  if (values.length === 0) throw new Error("Cannot build a Merkle root of nothing");
  let level = values.map(leaf);
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) next.push(node(level[i], level[i + 1] ?? level[i]));
    level = next;
  }
  return level[0];
}

export type ProofStep = { sibling: string; side: "left" | "right" };

export function merkleProof(values: string[], index: number): ProofStep[] {
  if (index < 0 || index >= values.length) throw new RangeError("Index outside tree");
  const proof: ProofStep[] = [];
  let level = values.map(leaf);
  let i = index;
  while (level.length > 1) {
    const isRight = i % 2 === 1;
    const siblingIndex = isRight ? i - 1 : i + 1;
    proof.push({ sibling: level[siblingIndex] ?? level[i], side: isRight ? "left" : "right" });
    const next: string[] = [];
    for (let j = 0; j < level.length; j += 2) next.push(node(level[j], level[j + 1] ?? level[j]));
    level = next;
    i = Math.floor(i / 2);
  }
  return proof;
}

export function verifyMerkleProof(value: string, proof: ProofStep[], root: string): boolean {
  let hash = leaf(value);
  for (const step of proof) hash = step.side === "left" ? node(step.sibling, hash) : node(hash, step.sibling);
  return hash === root;
}
