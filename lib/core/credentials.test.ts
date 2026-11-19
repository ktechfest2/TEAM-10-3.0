import { describe, expect, it } from "vitest";
import { normaliseUsername, passwordProblem, usernameProblem } from "./credentials";

describe("usernames", () => {
  it("ignore case and surrounding spaces", () => expect(normaliseUsername("  Amaka.O ")).toBe("amaka.o"));
  it("accept letters, numbers, dot, dash and underscore", () => expect(usernameProblem("amaka_o-1.x")).toBeNull());
  it("refuse too short, too long and odd characters", () => {
    expect(usernameProblem("ab")).not.toBeNull();
    expect(usernameProblem("a".repeat(31))).not.toBeNull();
    expect(usernameProblem("amaka o")).not.toBeNull();
    expect(usernameProblem("amaka@home")).not.toBeNull();
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
