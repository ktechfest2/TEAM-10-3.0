"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Identity } from "@/lib/client/store";
import { Icon } from "@/components/icons";
import { StatusBadge, timeAgo, type Status } from "@/components/ui";
import { LanguagePicker } from "@/components/language-picker";
import { t, type Lang } from "@/lib/core/i18n";
import { PlaceSearch } from "./place-search";
import { VoterReport } from "./voter-report";
import { WallPhoto } from "./wall-photo";

type Followed = { code: string; name: string };
type Live = { level: string; status: Status; line: string; key: string; at?: string } | "error";

/** What the place summary API says, reduced to the one line a voter wants. */
function summarise(data: {
  place: { level: string };
  coverage: { units: number; sealed: number; disputed: number };
  result: { best: { trust: { status: Status }; occurredAt: string } | null } | null;
}): Live {
  if (data.place.level === "pu") {
    const best = data.result?.best;
    return best ? { level: "pu", status: best.trust.status, line: "Result", key: `${best.trust.status}`, at: best.occurredAt } : { level: "pu", status: null, line: "Waiting for the result", key: "none" };
  }
  const c = data.coverage;
  return { level: data.place.level, status: c.disputed ? "disputed" : null, key: `${c.sealed}/${c.disputed}`, line: `${c.sealed.toLocaleString("en-US")} of ${c.units.toLocaleString("en-US")} units sealed${c.disputed ? ` · ${c.disputed} disputed` : ""}` };
}

export function CitizenHome({ identity, lang = "en" }: { identity: Identity; lang?: Lang }) {
  const router = useRouter();
  // Rendered only on the client (after the device identity loads), so reading storage here is safe.
  const [followed, setFollowed] = useState<Followed[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("tally:followed") ?? "[]") as Followed[];
    } catch {
      return [];
    }
  });
  const [panel, setPanel] = useState<"queue" | "photo" | null>(null);
  const [live, setLive] = useState<Record<string, Live>>({});
  // What this device last saw for each place. A place whose status differs from it is shown as changed.
  const [seen, setSeen] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem("tally:seen") ?? "{}") as Record<string, string>;
    } catch {
      return {};
    }
  });
  const markSeen = (code: string, key: string) => setSeen((prev) => ({ ...prev, [code]: key }));
  // Saved on every change, including the first baseline, so a change between two visits is never lost.
  useEffect(() => {
    try {
      localStorage.setItem("tally:seen", JSON.stringify(seen));
    } catch {
      /* storage unavailable: changes will simply show again next time */
    }
  }, [seen]);
  const [tick, setTick] = useState(0);

  // Each followed place is read from the ledger; refreshed every 30 s while the screen is open.
  useEffect(() => {
    let alive = true;
    for (const f of followed) {
      fetch(`/api/places/${f.code}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((d) => {
          if (!alive) return;
          const l = summarise(d);
          setLive((prev) => ({ ...prev, [f.code]: l }));
          // The first time a place is followed, what it shows now is the baseline: nothing has "changed" yet.
          if (l !== "error") setSeen((prev) => (prev[f.code] === undefined ? { ...prev, [f.code]: l.key } : prev));
        })
        .catch(() => alive && setLive((prev) => ({ ...prev, [f.code]: "error" })));
    }
    const timer = setTimeout(() => setTick((t) => t + 1), 30_000);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [followed, tick]);

  function save(next: Followed[]) {
    setFollowed(next);
    try {
      localStorage.setItem("tally:followed", JSON.stringify(next));
    } catch {
      /* storage unavailable: following is a convenience only */
    }
  }
  const follow = (f: Followed) => save([f, ...followed.filter((x) => x.code !== f.code)].slice(0, 5));

  const TILES = [
    { key: "queue" as const, label: t(lang, "tile.queue"), icon: "people" as const, tone: "border-orange/40 bg-orange-wash text-orange" },
    { key: "photo" as const, label: t(lang, "tile.photo"), icon: "camera" as const, tone: "border-pink/40 bg-pink-wash text-pink" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">{t(lang, "home.hello")} <b className="text-fg">{identity.displayName.split(" ")[0]}</b></p>
        <LanguagePicker lang={lang} label={t(lang, "language")} draft={t(lang, "draft")} />
      </div>

      <section className="rounded-3xl border border-line bg-surface p-5" style={{ backgroundImage: "radial-gradient(ellipse at 0% 0%, rgba(106,169,255,0.16), transparent 60%), radial-gradient(ellipse at 100% 0%, rgba(255,99,174,0.12), transparent 55%)" }}>
        <h2 className="font-display text-2xl leading-tight font-extrabold">{t(lang, "home.find")}</h2>
        <div className="mt-3">
          <PlaceSearch
            onPick={(h) => {
              follow({ code: h.code, name: h.name });
              router.push(`/p/${h.code}`);
            }}
          />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        {TILES.map((tile) => (
          <button key={tile.key} type="button" onClick={() => setPanel((p) => (p === tile.key ? null : tile.key))} aria-expanded={panel === tile.key} className={`flex min-h-28 flex-col justify-between rounded-2xl border p-4 text-left transition-[filter] hover:brightness-125 ${tile.tone} ${panel === tile.key ? "ring-2 ring-current" : ""}`}>
            <Icon name={tile.icon} size={28} />
            <span className="mt-3 text-base leading-tight font-bold text-fg">{tile.label}</span>
          </button>
        ))}
        <Link href="/check" className="flex min-h-28 flex-col justify-between rounded-2xl border border-cyan/40 bg-cyan-wash p-4 text-cyan transition-[filter] hover:brightness-125">
          <Icon name="chat" size={28} />
          <span className="mt-3 text-base leading-tight font-bold text-fg">{t(lang, "tile.check")}</span>
        </Link>
        <Link href="/mission" className="flex min-h-28 flex-col justify-between rounded-2xl border border-blue/40 bg-blue-wash p-4 text-blue transition-[filter] hover:brightness-125">
          <Icon name="map" size={28} />
          <span className="mt-3 text-base leading-tight font-bold text-fg">{t(lang, "tile.watch")}</span>
        </Link>
      </div>

      {panel === "queue" && <VoterReport identity={identity} lang={lang} followed={followed} />}
      {panel === "photo" && <WallPhoto identity={identity} lang={lang} followed={followed} />}

      {followed.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-bold tracking-[0.14em] text-muted uppercase">{t(lang, "home.places")}</h3>
          <ul className="space-y-2">
            {followed.map((f) => {
              const l = live[f.code];
              const changed = l && l !== "error" && seen[f.code] !== undefined && seen[f.code] !== l.key;
              return (
                <li key={f.code} className="flex items-center gap-1 rounded-2xl border border-line bg-surface pr-1">
                  <Link href={`/p/${f.code}`} onClick={() => l && l !== "error" && markSeen(f.code, l.key)} className="flex min-w-0 flex-1 items-center gap-3 p-3">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${l && l !== "error" && l.status === "sealed" ? "bg-sealed-wash text-sealed" : l && l !== "error" && l.status === "disputed" ? "bg-alarm-wash text-alarm" : "bg-raised text-muted"}`}>
                      <Icon name={l && l !== "error" && l.status === "sealed" ? "check" : "pin"} size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{f.name}</span>
                      <span className="block truncate text-xs text-muted">
                        {!l ? "Checking…" : l === "error" ? "Could not load. Your last view is kept offline." : l.line}
                        {l && l !== "error" && l.at ? ` · ${timeAgo(l.at)}` : ""}
                      </span>
                      {changed && <span className="block text-xs font-bold text-amber">Changed since you last looked</span>}
                    </span>
                    {l && l !== "error" && l.level === "pu" && <StatusBadge status={l.status} />}
                  </Link>
                  <button type="button" onClick={() => save(followed.filter((x) => x.code !== f.code))} aria-label={`Stop following ${f.name}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted hover:bg-raised hover:text-fg">
                    <Icon name="close" size={18} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
