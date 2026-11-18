import { describe, expect, it } from "vitest";
import { detectAnomalies, median, robustZ, type UnitFigures } from "./anomaly";

const unit = (code: string, o: Partial<UnitFigures> = {}): UnitFigures => ({ code, group: "w1", registered: 500, accredited: 150, votes: { APC: 70, PDP: 50, LP: 20, NNPP: 5 }, ...o });
/** A ward of ordinary units with a little natural variation. */
const ward = (n = 10) => Array.from({ length: n }, (_, i) => unit(`w1-${i}`, { accredited: 160 + i * 2, votes: { APC: 68 + i, PDP: 50 - i, LP: 20, NNPP: 5 } }));

describe("statistics", () => {
  it("median handles odd and even sets", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });
  it("robust z ignores one wild value when judging the spread", () => {
    expect(Math.abs(robustZ(0.3, [0.3, 0.31, 0.29, 0.3, 0.32, 0.9]).z)).toBeLessThan(1);
    expect(robustZ(0.95, [0.3, 0.31, 0.29, 0.3, 0.32, 0.28]).z).toBeGreaterThan(4);
  });
});

describe("impossible figures", () => {
  it("flags more accredited than registered", () => {
    const f = detectAnomalies([unit("a", { registered: 100, accredited: 150, votes: { APC: 10 } })]);
    expect(f.map((x) => x.kind)).toContain("accredited_over_registered");
    expect(f[0]!.tier).toBe("impossible");
  });
  it("flags more votes than accredited", () => {
    const f = detectAnomalies([unit("a", { accredited: 100, votes: { APC: 90, PDP: 30 } })]);
    expect(f.map((x) => x.kind)).toEqual(["votes_over_accredited"]);
  });
  it("does not flag an ordinary unit", () => expect(detectAnomalies(ward())).toEqual([]));
  it("treats a unit with no figures as missing data, not as an anomaly", () => {
    expect(detectAnomalies([unit("a", { accredited: 0, votes: {} })])).toEqual([]);
  });
  it("does not flag registered = 0 as accredited over registered", () => {
    expect(detectAnomalies([unit("a", { registered: 0, accredited: 50, votes: { APC: 40 } })])).toEqual([]);
  });
});

describe("outliers against the ward", () => {
  it("flags a turnout far from its peers", () => {
    const peers = ward();
    const odd = unit("odd", { accredited: 470, votes: { APC: 300, PDP: 150, LP: 15, NNPP: 5 } });
    const f = detectAnomalies([...peers, odd]);
    expect(f.find((x) => x.code === "odd" && x.kind === "turnout_outlier")).toBeTruthy();
  });
  it("flags a party share far from its peers", () => {
    const odd = unit("odd", { votes: { APC: 5, PDP: 135, LP: 5, NNPP: 5 } });
    const f = detectAnomalies([...ward(), odd]);
    const hit = f.find((x) => x.code === "odd" && x.kind === "share_outlier");
    expect(hit?.detail).toContain("PDP");
  });
  it("needs enough peers to say anything", () => {
    const odd = unit("odd", { accredited: 480, votes: { APC: 300, PDP: 150, LP: 25, NNPP: 5 } });
    expect(detectAnomalies([...ward(4), odd]).filter((x) => x.tier === "outlier")).toEqual([]);
  });
  it("ranks impossible figures before outliers", () => {
    const f = detectAnomalies([...ward(), unit("odd", { accredited: 470, votes: { APC: 300, PDP: 150, LP: 15, NNPP: 5 } }), unit("bad", { registered: 10, accredited: 150, votes: { APC: 10 } })]);
    expect(f[0]!.tier).toBe("impossible");
  });
});
