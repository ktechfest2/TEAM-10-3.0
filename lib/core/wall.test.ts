import { describe, expect, it } from "vitest";
import type { ResultFigures } from "./events";
import { compareWall } from "./wall";

const f = (apc: number, o: Partial<ResultFigures> = {}): ResultFigures => ({ votes: { APC: apc, PDP: 65 }, accredited: 191, rejected: 1, totalValid: apc + 65, ...o });

describe("wall photo comparison", () => {
  it("matches identical figures", () => expect(compareWall(f(112), f(112))).toEqual({ state: "match", fields: [] }));
  it("names every figure that differs", () => {
    expect(compareWall(f(202), f(112))).toEqual({ state: "differs", fields: ["APC", "totalValid"] });
    expect(compareWall(f(112, { accredited: 200 }), f(112)).fields).toEqual(["accredited"]);
  });
  it("treats a party missing on one side as zero, not as a difference of nothing", () => {
    const read = { ...f(112), votes: { APC: 112, PDP: 65, LP: 0 } };
    expect(compareWall(read, f(112)).state).toBe("match");
  });
  it("cannot compare an unread photo or a unit with no signed result", () => {
    expect(compareWall(null, f(112)).state).toBe("unread");
    expect(compareWall(f(112), null).state).toBe("no_result");
  });
});
