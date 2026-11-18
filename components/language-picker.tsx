"use client";
import { usePathname, useRouter } from "next/navigation";
import { saveLang } from "@/lib/client/lang";
import { LANGS, type Lang } from "@/lib/core/i18n";

/** Saves the choice for next time and reloads the page in that language. The draft notice shows for every language but English. */
export function LanguagePicker({ lang, label, draft }: { lang: Lang; label: string; draft?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  function pick(code: Lang) {
    // With cookies blocked the choice travels in the address instead.
    if (!saveLang(code)) return router.replace(`${pathname}?lang=${code}`);
    // A ?lang= in the address would override the new choice, so go to the clean address.
    if (window.location.search.includes("lang=")) router.replace(pathname);
    else router.refresh();
  }
  return (
    <div>
      <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
        {LANGS.map((l) => (
          <button key={l.code} type="button" onClick={() => pick(l.code)} aria-pressed={l.code === lang} lang={l.code === "pcm" ? "pcm" : l.code} className={`h-9 rounded-full px-3.5 text-sm font-bold ${l.code === lang ? "bg-fg text-bg" : "bg-raised text-muted hover:text-fg"}`}>
            {l.name}
          </button>
        ))}
      </div>
      {lang !== "en" && draft && <p className="mt-2 text-xs text-amber">{draft}</p>}
    </div>
  );
}
