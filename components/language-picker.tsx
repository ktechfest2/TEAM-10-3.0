"use client";
import { usePathname, useRouter } from "next/navigation";
import { useRef } from "react";
import { Icon } from "@/components/icons";
import { saveLang } from "@/lib/client/lang";
import { LANGS, type Lang } from "@/lib/core/i18n";

/** One small button that shows the current language and opens the other four. A notice shows for every language but English. */
export function LanguagePicker({ lang, label, draft }: { lang: Lang; label: string; draft?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  const current = LANGS.find((l) => l.code === lang)?.name ?? "English";

  function pick(code: Lang) {
    if (menu.current) menu.current.open = false;
    // With cookies blocked the choice travels in the address instead.
    if (!saveLang(code)) return router.replace(`${pathname}?lang=${code}`);
    // A ?lang= in the address would override the new choice, so go to the clean address.
    if (window.location.search.includes("lang=")) router.replace(pathname);
    else router.refresh();
  }

  return (
    <div className="relative inline-block">
      <details ref={menu}>
        <summary aria-label={label} className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-full bg-raised px-3.5 text-sm font-bold hover:brightness-125 [&::-webkit-details-marker]:hidden">
          <Icon name="globe" size={18} />
          {current}
        </summary>
        <ul role="listbox" aria-label={label} className="absolute left-0 z-20 mt-2 w-44 overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_18px_40px_rgba(0,0,0,0.6)]">
          {LANGS.map((l) => (
            <li key={l.code}>
              <button type="button" role="option" aria-selected={l.code === lang} onClick={() => pick(l.code)} className={`flex min-h-11 w-full items-center justify-between px-4 text-left text-sm font-bold hover:bg-raised ${l.code === lang ? "text-sealed" : ""}`}>
                {l.name}
                {l.code === lang && <Icon name="check" size={16} />}
              </button>
            </li>
          ))}
        </ul>
      </details>
      {lang !== "en" && draft && <p className="mt-2 max-w-xs text-xs text-amber">{draft}</p>}
    </div>
  );
}
