import { describe, expect, it } from "vitest";
import { figuresFromReference, planOutcome, unitRandom } from "./simulation";

describe("simulation planning", () => {
  it("is deterministic per unit", () => {
    expect(planOutcome("37-01-01-001")).toEqual(planOutcome("37-01-01-001"));
    expect(unitRandom("37-01-01-001", "x")).toBe(unitRandom("37-01-01-001", "x"));
  });

  it("sealed units always get at least two distinct signing parties", () => {
    for (let i = 0; i < 400; i++) {
      const p = planOutcome(`37-02-03-${String(i).padStart(3, "0")}`);
      if (p.outcome === "sealed") expect(new Set(p.signers).size).toBeGreaterThanOrEqual(2);
      if (p.outcome === "witnessed") expect(p.signers).toHaveLength(1);
      if (p.outcome === "unwitnessed") expect(p.signers).toHaveLength(0);
    }
  });

  it("produces roughly the intended mix", () => {
    const counts = { sealed: 0, witnessed: 0, unwitnessed: 0 };
    for (let i = 0; i < 2000; i++) counts[planOutcome(`u${i}`).outcome]++;
    expect(counts.sealed / 2000).toBeGreaterThan(0.64);
    expect(counts.sealed / 2000).toBeLessThan(0.76);
    expect(counts.witnessed / 2000).toBeGreaterThan(0.1);
    expect(counts.unwitnessed / 2000).toBeGreaterThan(0.1);
  });

  it("builds figures that add up to the sum of party votes", () => {
    const f = figuresFromReference({ APC: 112, PDP: 65, LP: 12, NNPP: 1 }, 191, 750);
    expect(f.totalValid).toBe(190);
    expect(f.rejected).toBe(0);
  });
});
