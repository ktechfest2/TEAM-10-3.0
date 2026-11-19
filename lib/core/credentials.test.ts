import { describe, expect, it } from "vitest";
import { normaliseUsername, passwordProblem, usernameProblem } from "./credentials";

describe("names used to log in", () => {
  it("ignore case, outer spaces and repeated spaces", () => expect(normaliseUsername("  Amaka   Okafor ")).toBe("amaka okafor"));
  it("accept ordinary names, including accents and apostrophes", () => {
    for (const n of ["Amaka Okafor", "Ngozi Adeyemi-Bello", "Chukwuemeka O'Neil", "Ọláwálé Adébáyọ̀", "Halima 2", "Mama Ngozi"]) expect(usernameProblem(n)).toBeNull();
  });
  it("refuse too short, too long and odd characters", () => {
    expect(usernameProblem("A")).not.toBeNull();
    expect(usernameProblem("a".repeat(61))).not.toBeNull();
    expect(usernameProblem("amaka@home")).not.toBeNull();
    expect(usernameProblem("<script>")).not.toBeNull();
  });
});

describe("passwords", () => {
  it("need six characters and nothing else", () => {
    expect(passwordProblem("12345")).not.toBeNull();
    expect(passwordProblem("abcdef")).toBeNull();
    expect(passwordProblem("123456")).toBeNull();
    expect(passwordProblem("      ")).toBeNull();
  });
});
