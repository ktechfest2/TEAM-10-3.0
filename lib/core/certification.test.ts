import { describe, expect, it } from "vitest";
import { certifyFailure, independentChains } from "./certification";
import { computeMargin } from "./margin";

const agent = (id: string, party: string) => ({ actorId: id, role: "party_agent", party });

describe("upload-failure certification", () => {
  it("is only a claim with no witnesses", () => expect(certifyFailure([])).toBe("claimed"));
  it("is witnessed by one independent chain", () => expect(certifyFailure([agent("a", "APC")])).toBe("witnessed"));
  it("is certified by agents of two different parties", () => expect(certifyFailure([agent("a", "APC"), agent("b", "PDP")])).toBe("certified"));
  it("counts two agents of the same party once", () => {
    expect(certifyFailure([agent("a", "APC"), agent("b", "APC")])).toBe("witnessed");
    expect(independentChains([agent("a", "APC"), agent("b", "APC")])).toHaveLength(1);
  });
  it("counts an observer as an independent chain", () => {
    expect(certifyFailure([agent("a", "APC"), { actorId: "o", role: "observer" }])).toBe("certified");
  });
  it("ignores witnesses who are not independent of the officer", () => {
    expect(certifyFailure([{ actorId: "p", role: "presiding_officer" }, { actorId: "c", role: "citizen" }])).toBe("claimed");
  });
});

describe("margin of lead", () => {
  const votes = { APC: 5000, PDP: 4200, LP: 900 };
  it("has no margin before any unit is sealed", () => expect(computeMargin({ sealedVotes: {}, sealedUnits: 0, unsettledUnits: 10, unsettledRegistered: 5000 }).state).toBe("none"));
  it("is open while the unsettled units could still overturn the lead", () => {
    const m = computeMargin({ sealedVotes: votes, sealedUnits: 40, unsettledUnits: 10, unsettledRegistered: 5000 });
    expect(m).toMatchObject({ state: "open", leader: "APC", runnerUp: "PDP", lead: 800, atStake: 5000 });
  });
  it("is safe when the lead is bigger than anything the unsettled units could add", () => {
    expect(computeMargin({ sealedVotes: votes, sealedUnits: 40, unsettledUnits: 2, unsettledRegistered: 700 }).state).toBe("safe");
  });
  it("is not safe when the lead only equals what is at stake", () => {
    expect(computeMargin({ sealedVotes: votes, sealedUnits: 40, unsettledUnits: 2, unsettledRegistered: 800 }).state).toBe("open");
  });
  it("is settled when every unit is sealed", () => {
    expect(computeMargin({ sealedVotes: votes, sealedUnits: 50, unsettledUnits: 0, unsettledRegistered: 0 }).state).toBe("settled");
  });
});
