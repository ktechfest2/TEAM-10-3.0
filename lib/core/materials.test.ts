import { describe, expect, it } from "vitest";
import { estimatedKit, plannedReceipt, shortenedKit } from "./materials";
import { compareMaterials, type MaterialItem } from "./materials";
import { ESCALATE_AFTER_MINUTES, helpState, waited } from "./help";

const sent: MaterialItem[] = [
  { kind: "ballot_papers", qty: 500, serialFrom: "100001", serialTo: "100500" },
  { kind: "ballot_boxes", qty: 1 },
  { kind: "result_sheets", qty: 8 },
];

describe("materials", () => {
  it("says nothing when nothing was signed", () => expect(compareMaterials(null, null)).toEqual({ state: "none", lines: [] }));
  it("says dispatched while receipt is awaited", () => {
    const r = compareMaterials(sent, null);
    expect(r.state).toBe("dispatched");
    expect(r.lines.every((l) => l.state === "waiting")).toBe(true);
  });
  it("is ok when every count matches", () => expect(compareMaterials(sent, sent).state).toBe("ok"));
  it("flags a shortfall with the exact difference", () => {
    const got = sent.map((i) => (i.kind === "ballot_papers" ? { ...i, qty: 480 } : i));
    const r = compareMaterials(sent, got);
    expect(r.state).toBe("differs");
    expect(r.lines[0]).toMatchObject({ kind: "ballot_papers", sent: 500, got: 480, diff: -20, state: "short" });
  });
  it("flags more than was sent, and a kind that was never sent", () => {
    expect(compareMaterials(sent, sent.map((i) => (i.kind === "ballot_boxes" ? { ...i, qty: 2 } : i))).lines[1]).toMatchObject({ state: "over", diff: 1 });
    expect(compareMaterials(sent, [...sent, { kind: "bvas", qty: 1 }]).lines.at(-1)).toMatchObject({ kind: "bvas", state: "unexpected" });
  });
  it("treats a kind missing from the receipt as short", () => {
    const r = compareMaterials(sent, sent.filter((i) => i.kind !== "result_sheets"));
    expect(r.lines.find((l) => l.kind === "result_sheets")).toMatchObject({ got: 0, diff: -8, state: "short" });
  });
  it("builds a kit from the registered voters, with a serial range that matches the count", () => {
    const kit = estimatedKit("37-01-01-001", 500);
    const papers = kit[0]!;
    expect(papers.qty).toBe(550);
    expect(Number(papers.serialTo) - Number(papers.serialFrom) + 1).toBe(papers.qty);
    expect(estimatedKit("37-01-01-001", 500)).toEqual(kit);
  });
  it("plans a repeatable mix of outcomes, mostly ok", () => {
    const codes = Array.from({ length: 400 }, (_, i) => `37-01-01-${String(i).padStart(3, "0")}`);
    const out = codes.map(plannedReceipt);
    expect(out.filter((x) => x === "ok").length).toBeGreaterThan(280);
    expect(out.filter((x) => x === "short").length).toBeGreaterThan(15);
    expect(out.filter((x) => x === "none").length).toBeGreaterThan(5);
    expect(codes.map(plannedReceipt)).toEqual(out);
  });
  it("a shortened kit is always short of ballot papers only", () => {
    const kit = estimatedKit("37-01-01-002", 600);
    const r = compareMaterials(kit, shortenedKit("37-01-01-002", kit));
    expect(r.state).toBe("differs");
    expect(r.lines.filter((l) => l.state === "short").map((l) => l.kind)).toEqual(["ballot_papers"]);
  });
});

describe("priority help", () => {
  const t0 = new Date("2027-01-16T08:00:00Z");
  it("is open, then escalated after the limit, and answered whenever it is answered", () => {
    expect(helpState(t0, null, new Date(t0.getTime() + 5 * 60_000))).toBe("open");
    expect(helpState(t0, null, new Date(t0.getTime() + ESCALATE_AFTER_MINUTES * 60_000))).toBe("escalated");
    expect(helpState(t0, new Date(t0.getTime() + 40 * 60_000), new Date(t0.getTime() + 50 * 60_000))).toBe("answered");
  });
  it("says how long someone has waited", () => {
    expect(waited(t0, new Date(t0.getTime() + 20_000))).toBe("just now");
    expect(waited(t0, new Date(t0.getTime() + 7 * 60_000))).toBe("7 min");
    expect(waited(t0, new Date(t0.getTime() + 65 * 60_000))).toBe("1 h 05 min");
  });
});
