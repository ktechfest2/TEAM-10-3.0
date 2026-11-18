import { describe, expect, it } from "vitest";
import { extractByRules, judgeClaim, type Claim, type Evidence } from "./rumour";

const pu = { code: "37-01-02-019", name: "Abaji North East Pry School", level: "pu" as const };
const figs = (claimed: number): Claim => ({ kind: "result_figures", party: "APC", votes: claimed, summary: "", by: "rules" });
const sealed = (apc: number): Evidence => ({ place: pu, unit: { status: "sealed", votes: { APC: apc, PDP: 7 }, parties: ["PDP", "NNPP"] } });

describe("rules extraction", () => {
  it("reads a unit code and a party figure", () => {
    const c = extractByRules("APC got 202 votes at 37-01-02-019 oo");
    expect(c).toMatchObject({ kind: "result_figures", unitCode: "37-01-02-019", party: "APC", votes: 202 });
  });
  it("prefers a stated figure over loose change words", () => {
    expect(extractByRules("APC got 202 at 37-01-02-019, rigged!").kind).toBe("result_figures");
  });
  it("reads change words as a collation claim", () => {
    expect(extractByRules("They changed the figures at the ward").kind).toBe("collation_changed");
  });
  it("leaves everything else as other", () => {
    expect(extractByRules("Thugs are at the school gate!!").kind).toBe("other");
  });
});

describe("figure claims", () => {
  it("confirms a figure equal to the sealed one", () => expect(judgeClaim(figs(15), sealed(15)).verdict).toBe("confirmed"));
  it("names three signing parties in plain English", () => {
    const ev: Evidence = { place: pu, unit: { status: "sealed", votes: { APC: 15 }, parties: ["APC", "PDP", "LP"] } };
    expect(judgeClaim(figs(15), ev).reasons[0]).toContain("by APC, PDP and LP");
  });
  it("calls a different figure false and shows the sealed one", () => {
    const v = judgeClaim(figs(202), sealed(15));
    expect(v.verdict).toBe("false");
    expect(v.reasons[0]).toContain("APC 15");
  });
  it("never calls an unsealed result true or false", () => {
    const ev: Evidence = { place: pu, unit: { status: "witnessed", votes: { APC: 15 }, parties: ["PDP"] } };
    expect(judgeClaim(figs(15), ev).verdict).toBe("unverified");
    expect(judgeClaim(figs(202), ev).verdict).toBe("unverified");
  });
  it("does not rule on a disputed result or a missing one", () => {
    expect(judgeClaim(figs(15), { place: pu, unit: { status: "disputed", votes: { APC: 15 } } }).verdict).toBe("unverified");
    expect(judgeClaim(figs(15), { place: pu, unit: { status: null } }).verdict).toBe("unverified");
  });
  it("needs a polling unit, not a ward", () => {
    expect(judgeClaim(figs(15), { place: { code: "37-01-02", name: "Abaji", level: "ward" } }).verdict).toBe("unverified");
  });
});

describe("collation claims", () => {
  const claim: Claim = { kind: "collation_changed", summary: "", by: "ai" };
  const ward = { code: "37-05-03", name: "Pai", level: "ward" as const };
  const col = (o: Partial<NonNullable<Evidence["collation"]>>): Evidence => ({ place: ward, collation: { name: "Pai", level: "ward", tamperSuspected: false, mismatchedUnits: 0, matchedUnits: 10, unverifiedUnits: 0, ...o } });

  it("confirms when rows differ from sealed results", () => expect(judgeClaim(claim, col({ tamperSuspected: true, mismatchedUnits: 1 })).verdict).toBe("confirmed"));
  it("calls it false only when everything matches and everything was checkable", () => expect(judgeClaim(claim, col({})).verdict).toBe("false"));
  it("stays unverified when some rows cannot be checked", () => expect(judgeClaim(claim, col({ unverifiedUnits: 3 })).verdict).toBe("unverified"));
  it("is unverified with no collation at all", () => expect(judgeClaim(claim, { place: ward }).verdict).toBe("unverified"));
  it("uses the unit's own row when the message is about a unit", () => {
    expect(judgeClaim(claim, { place: pu, collation: { ...col({}).collation!, unitRow: "mismatch" } }).verdict).toBe("confirmed");
    expect(judgeClaim(claim, { place: pu, collation: { ...col({}).collation!, unitRow: "match" } }).verdict).toBe("false");
  });
});

describe("other claims", () => {
  it("are unverified, and say why", () => {
    const v = judgeClaim({ kind: "other", summary: "", by: "rules" }, { place: pu });
    expect(v.verdict).toBe("unverified");
    expect(v.reasons[0]).toMatch(/observer/i);
  });
});
