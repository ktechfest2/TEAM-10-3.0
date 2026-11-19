import { describe, expect, it } from "vitest";
import { maskPhone, normaliseNigerianPhone } from "./phone";

describe("Nigerian phone numbers", () => {
  it("accept the usual ways of writing one", () => {
    for (const n of ["08031234567", "0803 123 4567", "+2348031234567", "234-803-123-4567", "8031234567", "(0803) 123-4567", "09061234567", "07011234567"]) {
      expect(normaliseNigerianPhone(n), n).toMatch(/^\+234[789][01]\d{8}$/);
    }
    expect(normaliseNigerianPhone("0803 123 4567")).toBe("+2348031234567");
  });
  it("refuse landlines, short, long and non-numbers", () => {
    for (const n of ["0803123456", "080312345678", "0123456789", "hello", "+1 415 555 0100", "", "06031234567"]) expect(normaliseNigerianPhone(n), n).toBeNull();
  });
  it("mask the middle digits", () => expect(maskPhone("+2348031234567")).toBe("+234 803 ••• 4567"));
});
