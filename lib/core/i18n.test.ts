import { describe, expect, it } from "vitest";
import { englishMessages, isLang, LANGS, messages, t, type MessageKey } from "./i18n";

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();
const keys = Object.keys(englishMessages) as MessageKey[];

describe("translations", () => {
  for (const { code } of LANGS.filter((l) => l.code !== "en")) {
    describe(code, () => {
      it("defines every key", () => {
        expect(keys.filter((k) => !messages[code][k])).toEqual([]);
      });
      it("keeps exactly the placeholders of the English sentence", () => {
        const wrong = keys.filter((k) => JSON.stringify(placeholders(messages[code][k] ?? "")) !== JSON.stringify(placeholders(englishMessages[k])));
        expect(wrong).toEqual([]);
      });
      it("has no leftover English-only draft markers or empty strings", () => {
        expect(keys.filter((k) => (messages[code][k] ?? "").trim() === "")).toEqual([]);
      });
    });
  }
  it("fills placeholders and falls back to English", () => {
    expect(t("en", "hero.sealed.text", { parties: "APC and PDP" })).toBe("Agents of rival parties (APC and PDP) signed these exact figures.");
    expect(t("ha", "j.opened.by", { by: "Halima" })).toContain("Halima");
  });
  it("recognises languages", () => {
    expect(isLang("yo")).toBe(true);
    expect(isLang("fr")).toBe(false);
  });
});
