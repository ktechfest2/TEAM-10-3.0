"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Mission } from "@/lib/server/mission";
import { Card, Chip, Eyebrow } from "@/components/ui";
import { MarginCard } from "@/components/margin-card";
import { COUNCIL_COLORS, TerritoryMap, type Geometry } from "@/components/territory-map";
import { Icon, type IconName } from "@/components/icons";
import { WatchBar } from "@/components/watch-bar";

const n = (v: number) => v.toLocaleString("en-US");

const KIND_TEXT: Record<string, string> = { red: "text-alarm", green: "text-sealed", amber: "text-amber", grey: "text-muted" };
const KIND_BG: Record<string, string> = { red: "bg-alarm-wash text-alarm", green: "bg-sealed-wash text-sealed", amber: "bg-amber-wash text-amber", grey: "bg-raised text-muted" };
const KIND_ICON: Record<string, IconName> = { red: "alert", green: "check", amber: "eye", grey: "lock" };
const FILTERS = [
  { key: "all", label: "All" },
  { key: "red", label: "Urgent" },
  { key: "amber", label: "Needs a look" },
  { key: "green", label: "Sealed" },
  { key: "grey", label: "Records" },
] as const;
const RANK: Record<string, number> = { red: 0, amber: 1, green: 2, grey: 3 };
const alertKey = (a: Mission["alerts"][number]) => `${a.kind}|${a.at}|${a.title}|${a.body}`;

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
  const [now, setNow] = useState(() => Date.now());
  const [fresh, setFresh] = useState<Mission["alerts"][number] | null>(null);
  const [full, setFull] = useState(false);
  const [canFull, setCanFull] = useState(false);
  const seen = useRef<Set<string>>(new Set());

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

  // A clock for "updated Ns ago" makes the board feel live even between polls.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    // Deferred so the server-rendered header does not change shape during hydration.
    const t = setTimeout(() => setCanFull(Boolean(document.documentElement.requestFullscreen)), 0);
    const onChange = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      clearTimeout(t);
      document.removeEventListener("fullscreenchange", onChange);
    };
  }, []);

  // Toast the worst new alert after the first load's baseline.
  useEffect(() => {
    const alerts = data?.alerts ?? [];
    if (alerts.length === 0) return;
    if (seen.current.size === 0) {
      alerts.forEach((a) => seen.current.add(alertKey(a)));
      return;
    }
    const newOnes = alerts.filter((a) => !seen.current.has(alertKey(a)));
    newOnes.forEach((a) => seen.current.add(alertKey(a)));
    if (newOnes.length === 0) return;
    const worst = [...newOnes].sort((a, b) => (RANK[a.kind] ?? 9) - (RANK[b.kind] ?? 9))[0]!;
    setFresh(worst);
    const t = setTimeout(() => setFresh(null), 9000);
    return () => clearTimeout(t);
  }, [data]);

  async function toggleFull() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      /* the browser refused; the button simply does nothing */
    }
  }

  const t = data?.totals;
  const pct = (v: number) => (t && t.units ? (v / t.units) * 100 : 0);
  const simulated = (data?.simulation.simulated ?? 0) > 0;
  // The first thing a phone shows: the worst alert, then the map.
  const topAlert = data ? [...data.alerts].sort((a, b) => (RANK[a.kind] ?? 9) - (RANK[b.kind] ?? 9))[0] : undefined;
  const updated = data ? Math.max(0, Math.round((now - new Date(data.at).getTime()) / 1000)) : null;

  return (
    <div className="mx-auto w-full max-w-[1440px] flex-1 overflow-x-clip px-4 pb-16 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 py-4">
        <h1 className="font-display text-xl font-extrabold">Mission control <span className="hidden text-sm font-semibold text-muted sm:inline">· Federal Capital Territory</span></h1>
        <div className="flex flex-wrap items-center gap-2">
          {simulated && <Chip tone="amber">Simulated data</Chip>}
          <span className="inline-flex h-7 items-center gap-2 rounded-full bg-alarm-wash px-3 text-xs font-bold tracking-wider text-alarm"><i className={`h-2 w-2 rounded-full bg-alarm ${failed ? "" : "animate-pulse"}`} />{failed ? "OFFLINE" : "LIVE"}</span>
          {updated !== null && <span className="text-[11px] text-muted tabular-nums">updated {updated}s ago</span>}
          {canFull && (
            <button type="button" onClick={() => void toggleFull()} className="inline-flex h-7 items-center gap-1.5 rounded-full bg-raised px-3 text-xs font-bold text-muted hover:text-fg">
              <Icon name="expand" size={13} />{full ? "Exit" : "Full screen"}
            </button>
          )}
          <Link href="/verify" className="hidden text-sm font-bold text-thumb sm:inline">Check the records ›</Link>
        </div>
      </header>

      <WatchBar />

      {fresh && (
        <Link href={fresh.href ?? "/mission"} onClick={() => setFresh(null)} role="status" className={`pop fixed inset-x-3 bottom-24 z-40 mx-auto flex max-w-md items-start gap-3 rounded-2xl border-2 bg-surface p-3 shadow-2xl md:inset-x-auto md:right-6 md:bottom-6 md:mx-0 ${fresh.kind === "red" ? "border-alarm" : "border-line"}`}>
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${KIND_BG[fresh.kind]}`}><Icon name={KIND_ICON[fresh.kind] ?? "check"} size={18} /></span>
          <span className="min-w-0 flex-1">
            <span className={`block text-[11px] font-extrabold tracking-widest uppercase ${KIND_TEXT[fresh.kind]}`}>{fresh.k}</span>
            <span className="block font-bold leading-snug">{fresh.title}</span>
            <span className="line-clamp-2 block text-sm text-muted">{fresh.body}</span>
          </span>
        </Link>
      )}

      {data && (
        <div className="mb-4 space-y-3 lg:hidden">
          <div className="grid grid-cols-3 gap-2">
            <Kpi value={t ? n(t.sealed) : "–"} label={t ? `Sealed · ${Math.round(pct(t.sealed))}%` : "Sealed"} tone="text-sealed" />
            <Kpi value={t ? n(t.witnessed) : "–"} label="Witnessed" tone="text-amber" />
            <Kpi value={t ? String(t.tamper) : "–"} label="Tampering" tone="text-alarm" alarm={Boolean(t?.tamper)} />
          </div>
          {topAlert && (
            <Link href={topAlert.href ?? "/mission"} className={`flex items-center gap-3 rounded-2xl border p-3 ${topAlert.kind === "red" ? "border-alarm bg-alarm-wash" : "border-line bg-surface"}`}>
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${KIND_BG[topAlert.kind]}`}><Icon name={KIND_ICON[topAlert.kind] ?? "check"} size={18} /></span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[11px] font-extrabold tracking-widest uppercase ${KIND_TEXT[topAlert.kind]}`}>{topAlert.k}</span>
                <span className="block truncate font-bold">{topAlert.title}</span>
                <span className="line-clamp-2 block text-sm text-muted">{topAlert.body}</span>
              </span>
              <Icon name="chevron" size={18} className="shrink-0 text-muted" />
            </Link>
          )}
        </div>
      )}

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
          <div className="hidden grid-cols-3 gap-3 lg:grid">
            <Kpi value={t ? n(t.sealed) : "–"} label={t ? `Units sealed · ${Math.round(pct(t.sealed))}%` : "Units sealed"} tone="text-sealed" />
            <Kpi value={t ? n(t.witnessed) : "–"} label="Witnessed, not sealed" tone="text-amber" />
            <Kpi value={t ? String(t.tamper) : "–"} label="Tampering alerts" tone="text-alarm" alarm={Boolean(t?.tamper)} />
          </div>
          <div className="hidden h-2.5 gap-0.5 overflow-hidden rounded-full bg-raised lg:flex" role="img" aria-label="Share of units sealed, witnessed, or without a result">
            <div className="bg-sealed transition-[width] duration-700" style={{ width: `${pct(t?.sealed ?? 0)}%` }} />
            <div className="bg-amber transition-[width] duration-700" style={{ width: `${pct(t?.witnessed ?? 0)}%` }} />
          </div>
          <p className="hidden text-xs text-muted lg:block">{t ? `${n(t.reported)} of ${n(t.units)} polling units have a recorded result.` : "Loading…"}</p>

          {data && <Alerts alerts={data.alerts} />}
          {data && <MarginCard margin={data.margin} uploads={data.uploads} />}
          {data && <ReadinessCards materials={data.materials} help={data.help} />}
        </div>
      </div>
      <p className="mt-8 max-w-prose text-xs text-muted">
        Map data: polling-site locations on the FCT boundary, GRID3 via geoBoundaries (CC BY 4.0). Results appear here only once they are signed.
        {simulated && " Results are simulated: signed by labelled test actors from the published 2023 figures."}
        {failed && " The connection to the server was lost; the numbers shown may be out of date."}
      </p>
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

const HELP_ORDER = ["open", "escalated", "answered"] as const;

/** Before and around polls opening: materials that arrived short or not at all, and priority-help requests and how they are answered. */
function ReadinessCards({ materials, help }: { materials: Mission["materials"]; help: Mission["help"] }) {
  const stat = (v: number, label: string, tone: string) => (
    <div className="rounded-xl bg-raised px-3 py-2.5 text-center">
      <p className={`font-display text-2xl leading-none font-extrabold tabular-nums ${tone}`}>{n(v)}</p>
      <p className="mt-1 text-[11px] leading-tight text-muted">{label}</p>
    </div>
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card className="space-y-3">
        <Eyebrow>Materials</Eyebrow>
        {materials.dispatched === 0 ? <p className="text-sm text-muted">No materials have been signed for yet.</p> : (
          <>
            <div className="grid grid-cols-3 gap-2">
              {stat(materials.received - materials.differs, "Received, all match", "text-sealed")}
              {stat(materials.differs, "Received different", "text-amber")}
              {stat(materials.awaiting, "Not signed for", materials.awaiting ? "text-amber" : "")}
            </div>
            <ul className="space-y-1.5 text-sm">
              {materials.problems.slice(0, 3).map((p) => (
                <li key={p.code}><Link href={`/p/${p.code}`} className="block hover:underline"><b>{p.name}</b><span className="block text-xs text-muted">{p.line}</span></Link></li>
              ))}
            </ul>
            <p className="text-xs text-muted">{n(materials.dispatched)} units sent materials{materials.simulated ? " · estimated test data" : ""}</p>
          </>
        )}
      </Card>
      <Card className="space-y-3">
        <Eyebrow>Priority help</Eyebrow>
        {HELP_ORDER.every((k) => help[k] === 0) ? <p className="text-sm text-muted">No one has asked for priority help.</p> : (
          <>
            <div className="grid grid-cols-3 gap-2">
              {stat(help.open, "Waiting", "text-amber")}
              {stat(help.escalated, "Not answered in 15 min", help.escalated ? "text-alarm" : "")}
              {stat(help.answered, "Answered", "text-sealed")}
            </div>
            <ul className="space-y-1.5 text-sm">
              {help.worst.slice(0, 3).map((w) => (
                <li key={w.code}><Link href={`/p/${w.code}`} className="block hover:underline"><b>{w.name}</b><span className="block text-xs text-alarm">Waiting since {new Date(w.createdAt).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}</span></Link></li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
