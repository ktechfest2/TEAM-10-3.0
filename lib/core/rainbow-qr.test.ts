import { describe, expect, it } from "vitest";
import { contrastWithWhite, RAINBOW_STOPS, rainbowQrSvg } from "./rainbow-qr";

describe("rainbow QR", () => {
  it("only uses colours a scanner reads as dark (contrast against white 4.5:1 or more)", () => {
    for (const c of RAINBOW_STOPS) expect(contrastWithWhite(c), c).toBeGreaterThanOrEqual(4.5);
  });
  it("draws a gradient over a white sheet with a four-module quiet zone", () => {
    const svg = rainbowQrSvg("https://tally-election.vercel.app/p/37-01-01-001");
    expect(svg).toContain("linearGradient");
    expect(svg).toContain('fill="#ffffff"');
    expect(svg).toMatch(/viewBox="0 0 41 41"/); // a version 4 code: 33 modules + 2 x 4 quiet zone
  });
  it("rejects nothing it should draw: a longer link still works", () => {
    expect(rainbowQrSvg("https://tally-election.vercel.app/p/37-01-01-001?lang=ha").length).toBeGreaterThan(1000);
  });
});
