import { describe, expect, it } from "vitest";
import { cropRect, fieldKey, normaliseBox } from "./crop";

describe("handwriting crops", () => {
  it("rejects boxes the model got wrong", () => {
    expect(normaliseBox({ x: NaN, y: 0.1, w: 0.1, h: 0.1 })).toBeNull();
    expect(normaliseBox({ x: 0.2, y: 0.2, w: 0, h: 0.1 })).toBeNull();
    expect(normaliseBox({ x: 0.995, y: 0.2, w: 0.1, h: 0.1 })).toBeNull();
  });

  it("clamps a box that spills over the edge", () => {
    expect(normaliseBox({ x: 0.9, y: 0.5, w: 0.3, h: 0.1 })).toEqual({ x: 0.9, y: 0.5, w: expect.closeTo(0.1, 5), h: 0.1 });
  });

  it("keeps the crop inside the image and around the number", () => {
    const box = { x: 0.7, y: 0.9, w: 0.28, h: 0.08 };
    const r = cropRect(box, 800, 1000);
    expect(r.sx).toBeGreaterThanOrEqual(0);
    expect(r.sy).toBeGreaterThanOrEqual(0);
    expect(r.sx + r.sw).toBeLessThanOrEqual(800);
    expect(r.sy + r.sh).toBeLessThanOrEqual(1000);
    const cx = (box.x + box.w / 2) * 800;
    expect(cx).toBeGreaterThan(r.sx);
    expect(cx).toBeLessThan(r.sx + r.sw);
  });

  it("never blows up a tiny box into an unreadable sliver", () => {
    const r = cropRect({ x: 0.4, y: 0.4, w: 0.02, h: 0.02 }, 1000, 1000);
    expect(r.sw).toBeGreaterThanOrEqual(220);
    expect(r.sh).toBeGreaterThan(50);
  });

  it("maps model field names to figure keys", () => {
    expect(fieldKey("Total valid votes")).toBe("totalValid");
    expect(fieldKey("Rejected ballots")).toBe("rejected");
    expect(fieldKey("Accredited voters")).toBe("accredited");
    expect(fieldKey("apc")).toBe("APC");
  });
});
