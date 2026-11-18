import { LANG_COOKIE, type Lang } from "@/lib/core/i18n";

/** Remembers the chosen language for a year. Returns false when cookies are blocked. */
export function saveLang(code: Lang): boolean {
  try {
    document.cookie = `${LANG_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
    return true;
  } catch {
    return false;
  }
}
