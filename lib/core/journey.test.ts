import { describe, expect, it } from "vitest";
import { buildJourney, joinList } from "./journey";

const base = { attempts: [], collations: [] };

describe("unit journey", () => {
  it("starts with everything waiting", () => {
    const steps = buildJourney(base);
    expect(steps.map((s) => s.key)).toEqual(["opened", "result", "upload", "ward", "lga", "state"]);
    expect(steps.every((s) => s.state === "pending")).toBe(true);
  });

  it("a sealed result with a matching ward collation reads as unchanged", () => {
    const steps = buildJourney({
      opened: { at: "t1", by: "Halima Bello" },
      result: { status: "sealed", parties: ["APC", "PDP", "LP"], at: "t2", by: "Halima Bello" },
      attempts: [{ outcome: "success", at: "t3" }],
      collations: [{ level: "ward", name: "Abaji Central", status: "match", at: "t4" }],
    });
    expect(steps.find((s) => s.key === "result")).toMatchObject({ state: "done", detail: "Sealed by APC, PDP and LP" });
    expect(steps.find((s) => s.key === "ward")).toMatchObject({ state: "done", title: "Ward collation · Abaji Central" });
    expect(steps.find((s) => s.key === "lga")?.state).toBe("pending");
  });

  it("a changed collation number is flagged with the detail", () => {
    const steps = buildJourney({
      result: { status: "sealed", parties: ["APC", "PDP"], at: "t2", by: "x" },
      attempts: [],
      collations: [{ level: "ward", name: "W", status: "mismatch", detail: "APC announced 212, sealed by rival agents 112." }],
    });
    expect(steps.find((s) => s.key === "ward")).toMatchObject({ state: "bad", detail: "APC announced 212, sealed by rival agents 112." });
  });

  it("distinguishes half-signed, unsigned and disputed results", () => {
    const one = buildJourney({ ...base, result: { status: "witnessed", parties: ["APC"], at: "t", by: "x" } });
    const none = buildJourney({ ...base, result: { status: "unwitnessed", parties: [], at: "t", by: "x" } });
    const bad = buildJourney({ ...base, result: { status: "disputed", parties: ["APC", "PDP"], at: "t", by: "x" } });
    expect(one.find((s) => s.key === "result")?.state).toBe("active");
    expect(none.find((s) => s.key === "result")?.state).toBe("active");
    expect(bad.find((s) => s.key === "result")?.state).toBe("bad");
  });

  it("a failed upload is a warning, and a later success counts the failures", () => {
    const failed = buildJourney({ ...base, attempts: [{ outcome: "failed", at: "a" }] });
    expect(failed.find((s) => s.key === "upload")?.state).toBe("warn");
    const later = buildJourney({ ...base, attempts: [{ outcome: "failed", at: "a" }, { outcome: "success", at: "b" }] });
    expect(later.find((s) => s.key === "upload")).toMatchObject({ state: "done", detail: "Uploaded after 1 failed attempt" });
  });

  it("joins lists in plain English", () => {
    expect(joinList(["APC"])).toBe("APC");
    expect(joinList(["APC", "PDP"])).toBe("APC and PDP");
    expect(joinList(["APC", "PDP", "LP"])).toBe("APC, PDP and LP");
  });
});
