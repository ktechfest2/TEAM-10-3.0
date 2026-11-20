import { describe, expect, it } from "vitest";
import { youtubeId } from "./video";

describe("youtubeId", () => {
  it("reads every usual form of a YouTube link", () => {
    for (const u of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ?si=abc",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=30s",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://www.youtube.com/live/dQw4w9WgXcQ?feature=share",
    ]) expect(youtubeId(u), u).toBe("dQw4w9WgXcQ");
  });
  it("refuses anything else", () => {
    for (const u of ["", "not a link", "https://vimeo.com/123456789", "https://www.youtube.com/watch?v=short", "https://evil.com/watch?v=dQw4w9WgXcQ", "javascript:alert(1)"]) expect(youtubeId(u), u).toBeNull();
    expect(youtubeId(undefined)).toBeNull();
  });
});
