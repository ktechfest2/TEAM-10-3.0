import { describe, expect, it } from "vitest";
import { normaliseUsername, passwordProblem, usernameProblem } from "./credentials";

describe("usernames", () => {
  it("ignore case when matched", () => expect(normaliseUsername("  Amaka_O ")).toBe("amaka_o"));
  it("accept short handles", () => {
    for (const n of ["amaka", "Ngozi_B", "chuks.o", "halima-2", "abc"]) expect(usernameProblem(n)).toBeNull();
  });
  it("refuse spaces, too short, too long and odd characters", () => {
    expect(usernameProblem("Amaka Okafor")).not.toBeNull();
    expect(usernameProblem("ab")).not.toBeNull();
    expect(usernameProblem("a".repeat(21))).not.toBeNull();
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
