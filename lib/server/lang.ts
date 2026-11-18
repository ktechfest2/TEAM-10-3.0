import "server-only";
import { cookies } from "next/headers";
import { isLang, LANG_COOKIE, type Lang } from "@/lib/core/i18n";

/** A `?lang=` in the link wins (so a shared link opens in the sender's language), then the saved choice, then English. */
export async function getLang(param?: string | string[]): Promise<Lang> {
  const p = Array.isArray(param) ? param[0] : param;
  if (isLang(p)) return p;
  const saved = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(saved) ? saved : "en";
}
