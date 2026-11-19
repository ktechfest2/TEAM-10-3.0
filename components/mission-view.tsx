"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Mission } from "@/lib/server/mission";
import { Card, Chip, Eyebrow } from "@/components/ui";
import { MarginCard } from "@/components/margin-card";
import { COUNCIL_COLORS, TerritoryMap, type Geometry } from "@/components/territory-map";
import { Logo } from "@/components/logo";
import { Icon, type IconName } from "@/components/icons";

const n = (v: number) => v.toLocaleString("en-US");

const KIND_TEXT: Record<string, string> = { red: "text-alarm", green: "text-sealed", amber: "text-amber", grey: "text-muted" };
const KIND_BG: Record<string, string> = { red: "bg-alarm-wash text-alarm", green: "bg-sealed-wash text-sealed", amber: "bg-amber-wash text-amber", grey: "bg-raised text-muted" };
const KIND_ICON: Record<string, IconName> = { red: "alert", green: "check", amber: "eye", grey: "lock" };
const FILTERS = [
  { key: "all", label: "All" },
  { key: "red", label: "Tampering" },
  { key: "amber", label: "Needs a look" },
  { key: "green", label: "Sealed" },
  { key: "grey", label: "Records" },
] as const;
const RANK: Record<string, number> = { red: 0, amber: 1, green: 2, grey: 3 };

function Alerts({ alerts }: { alerts: Mission["alerts"] }) {
  const [filter, setFilter] = useState<string>("all");
  const [all, setAll] = useState(false);
  const count = (k: string) => (k === "all" ? alerts.length : alerts.filter((a) => a.kind === k).length);
  const shown = alerts.filter((a) => filter === "all" || a.kind === filter);
  // Problems first, then the newest.
  const ordered = filter === "all" ? [...shown].sort((x, y) => (RANK[x.kind] ?? 9) - (RANK[y.kind] ?? 9) || +new Date(y.at) - +new Date(x.at)) : shown;
  const list = all ? ordered : ordered.slice(0, 6);
  return (
    <section aria-label="Alerts" className="space-y-3">
      <div className="flex items-center justify-between">
        <Eyebrow>Alerts</Eyebrow>
        <span className="text-xs text-muted">{alerts.length} in total</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.filter((f) => f.key === "all" || count(f.key) > 0).map((f) => (
          <button key={f.key} onClick={() => { setFilter(f.key); setAll(false); }} aria-pressed={filter === f.key} className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold ${filter === f.key ? "bg-fg text-bg" : "bg-raised text-muted hover:text-fg"}`}>
            {f.label}<span className={`text-xs tabular-nums ${filter === f.key ? "opacity-70" : ""}`}>{count(f.key)}</span>
          </button>
        ))}
      </div>
      {alerts.length === 0 && <Card><p className="text-sm text-muted">No alerts yet.</p></Card>}
      <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
        {list.map((a, i) => {
          const body = (
            <>
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${KIND_BG[a.kind]}`}><Icon name={KIND_ICON[a.kind] ?? "check"} size={18} /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className={`truncate text-[11px] font-extrabold tracking-widest uppercase ${KIND_TEXT[a.kind]}`}>{a.k}</span>
                  <span className="shrink-0 text-xs text-muted tabular-nums">{new Date(a.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </span>
                <span className="mt-0.5 block font-bold leading-snug">{a.title}</span>
                <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{a.body}</span>
              </span>
              {a.href && <Icon name="chevron" size={18} className="mt-2 shrink-0 text-muted" />}
            </>
          );
          const cls = `flex gap-3 px-4 py-3.5 ${i > 0 ? "border-t border-line" : ""} ${a.kind === "red" ? "bg-alarm-wash/40" : ""}`;
          return (
            <li key={`${a.at}-${i}`}>
              {a.href ? <Link href={a.href} className={`${cls} hover:bg-raised`}>{body}</Link> : <div className={cls}>{body}</div>}
            </li>
          );
        })}
      </ul>
      {ordered.length > 6 && (
        <button onClick={() => setAll((v) => !v)} className="w-full rounded-2xl border border-line py-3 text-sm font-bold text-blue">{all ? "Show fewer" : `Show all ${ordered.length}`}</button>
      )}
    </section>
  );
}

/** Live, read-only view of the election from the ledger. Everything here is computed from signed results. */
export function MissionView() {
  const [geo, setGeo] = useState<Geometry | null>(null);
  const [data, setData] = useState<Mission | null>(null);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/mission", { cache: "no-store" });
      if (!res.ok) throw new Error("bad status");
      setData((await res.json()) as Mission);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void fetch("/api/map").then((r) => r.json()).then(setGeo).catch(() => setFailed(true));
    const first = setTimeout(() => void refresh(), 0);
    const t = setInterval(() => void refresh(), 5000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [refresh]);

  const t = data?.totals;
  const pct = (v: number) => (t && t.units ? (v / t.units) * 100 : 0);
  const simulated = (data?.simulation.simulated ?? 0) > 0;

  return (
    <div className="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-16 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-3">
          <Link href="/"><Logo size={24} /></Link>
          <span className="hidden h-5 w-px bg-line sm:block" />
          <span className="text-sm font-semibold text-muted">Mission control · Federal Capital Territory</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {simulated && <Chip tone="amber">Simulated data · signed by labelled test actors</Chip>}
          <span className="inline-flex h-7 items-center gap-2 rounded-full bg-alarm-wash px-3 text-xs font-bold tracking-wider text-alarm"><i className={`h-2 w-2 rounded-full bg-alarm ${failed ? "" : "animate-pulse"}`} />{failed ? "OFFLINE" : "LIVE"}</span>
          <Link href="/verify" className="text-sm font-bold text-thumb">Check the records ›</Link>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          {geo ? <TerritoryMap geometry={geo} cells={data?.cells ?? null} focus={data?.focus ?? null} /> : <div className="aspect-[1000/940] animate-pulse rounded-2xl bg-raised" />}
          <div className="flex flex-wrap gap-x-5 gap-y-2 px-1 text-xs text-muted">
            <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded-sm bg-sealed" />Sealed by rival parties</span>
            <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded-sm bg-amber" />Witnessed by one party</span>
            <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded-sm bg-raised ring-1 ring-line" />No result yet</span>
            <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded-sm bg-alarm" />Tampering or dispute</span>
          </div>
          <Card className="space-y-3">
            <Eyebrow>Area councils · sealed</Eyebrow>
            {data?.councils.map((c, i) => (
              <div key={c.name}>
                <div className="flex justify-between text-sm"><span className="flex items-center gap-2 font-semibold"><i className={`h-2.5 w-2.5 rounded-full ${COUNCIL_COLORS[i]?.bar}`} />{c.name}</span><span className="text-muted tabular-nums">{n(c.sealed)} of {n(c.units)}</span></div>
                <div className="mt-1 h-2 rounded-full bg-raised"><div className={`h-2 rounded-full transition-[width] duration-700 ${COUNCIL_COLORS[i]?.bar}`} style={{ width: `${c.units ? (c.sealed / c.units) * 100 : 0}%` }} /></div>
              </div>
            ))}
          </Card>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Kpi value={t ? n(t.sealed) : "–"} label={t ? `Units sealed · ${Math.round(pct(t.sealed))}%` : "Units sealed"} tone="text-sealed" />
            <Kpi value={t ? n(t.witnessed) : "–"} label="Witnessed, not sealed" tone="text-amber" />
            <Kpi value={t ? String(t.tamper) : "–"} label="Tampering alerts" tone="text-alarm" alarm={Boolean(t?.tamper)} />
          </div>
          <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-raised" role="img" aria-label="Share of units sealed, witnessed, or without a result">
            <div className="bg-sealed transition-[width] duration-700" style={{ width: `${pct(t?.sealed ?? 0)}%` }} />
            <div className="bg-amber transition-[width] duration-700" style={{ width: `${pct(t?.witnessed ?? 0)}%` }} />
          </div>
          <p className="text-xs text-muted">{t ? `${n(t.reported)} of ${n(t.units)} polling units have a recorded result.` : "Loading…"}</p>

          {data && <MarginCard margin={data.margin} uploads={data.uploads} />}

          {data && <Alerts alerts={data.alerts} />}
        </div>
      </div>
      <p className="mt-8 max-w-prose text-xs text-muted">Map data: polling-site locations on the FCT boundary, GRID3 via geoBoundaries (CC BY 4.0). Results appear here only once they are signed. {failed && "The connection to the server was lost; the numbers shown may be out of date."}</p>
    </div>
  );
}

function Kpi({ value, label, tone, alarm }: { value: string; label: string; tone: string; alarm?: boolean }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 transition-colors ${alarm ? "border-alarm bg-alarm-wash" : tone === "text-sealed" ? "border-sealed/40 bg-sealed-wash" : tone === "text-amber" ? "border-amber/40 bg-amber-wash" : "border-line bg-surface"}`}>
      <div className={`font-display text-4xl leading-none font-extrabold tracking-tight tabular-nums ${tone}`}>{value}</div>
      <div className="mt-1.5 text-xs text-muted">{label}</div>
    </div>
  );
}
