import { describe, expect, it } from "vitest";
import { newRecoveryCode, normaliseRecoveryCode } from "./recovery";

describe("recovery codes", () => {
  it("are 16 characters in four groups, from the unambiguous alphabet", () => {
    const code = newRecoveryCode();
    expect(code).toMatch(/^[A-HJKMNP-Z2-9]{4}(-[A-HJKMNP-Z2-9]{4}){3}$/);
  });
  it("do not repeat", () => {
    const seen = new Set(Array.from({ length: 500 }, newRecoveryCode));
    expect(seen.size).toBe(500);
  });
  it("normalise whatever way a person types them", () => {
    const code = newRecoveryCode();
    const plain = normaliseRecoveryCode(code);
    expect(plain).toHaveLength(16);
    expect(normaliseRecoveryCode(code.toLowerCase())).toBe(plain);
    expect(normaliseRecoveryCode(code.replaceAll("-", " "))).toBe(plain);
    expect(normaliseRecoveryCode(` ${code} `)).toBe(plain);
  });
  it("reject anything that cannot be a code", () => {
    for (const bad of ["", "ABCD", "ABCD-EFGH-JKMN-PQRS-TUVW", "ABCD-EFGH-JKMN-PQR0", "ABCD-EFGH-JKMN-PQRI"]) expect(normaliseRecoveryCode(bad)).toBeNull();
  });
});
