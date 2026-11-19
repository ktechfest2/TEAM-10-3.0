import { describe, expect, it } from "vitest";
import { distanceKm, planRelocations, relocationSms, type UnitSite } from "./relocation";

const grid: UnitSite[] = [];
for (let w = 0; w < 4; w++) for (let i = 0; i < 300; i++) grid.push({ code: `37-01-0${w}-${String(i).padStart(3, "0")}`, name: `Site ${w}-${i}`, ward: `37-01-0${w}`, lat: 9 + w * 0.5 + (i % 20) * 0.004, lng: 7 + Math.floor(i / 20) * 0.004 });

describe("estimated relocations", () => {
  it("measures distance on the earth", () => expect(distanceKm({ lat: 9, lng: 7 }, { lat: 9.009, lng: 7 })).toBeCloseTo(1.0, 1));
  it("pick a small, repeatable share of units", () => {
    const a = planRelocations(grid);
    expect(a.length).toBeGreaterThan(5);
    expect(a.length).toBeLessThan(60);
    expect(planRelocations(grid).map((m) => m.from.code)).toEqual(a.map((m) => m.from.code));
  });
  it("move each unit to a different site in its own ward, a walkable distance away", () => {
    for (const m of planRelocations(grid)) {
      expect(m.to.ward).toBe(m.from.ward);
      expect(m.to.code).not.toBe(m.from.code);
      expect(m.distanceKm).toBeGreaterThanOrEqual(0.3);
      expect(m.distanceKm).toBeLessThanOrEqual(6);
    }
  });
  it("never pick a unit without a location", () => {
    const noLoc = grid.map((u) => ({ ...u, lat: 0, lng: 0 }));
    expect(planRelocations(noLoc)).toEqual([]);
  });
  it("writes an SMS that says where to go", () => {
    const s = relocationSms("Ebagi Primary School", "Gurdi Primary School", 1.4, "https://tally-election.vercel.app/p/37-01-05-001");
    expect(s).toContain("MOVED to Gurdi Primary School (1.4 km away)");
    expect(s.length).toBeLessThan(306);
  });
});
