"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Mission } from "@/lib/server/mission";
import { Button, Card, Chip, Eyebrow } from "@/components/ui";
import { TerritoryMap, type Geometry } from "@/components/territory-map";

type Data = Mission & { demoEnabled: boolean };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const n = (v: number) => v.toLocaleString("en-US");

const KIND: Record<string, string> = {
  red: "border-alarm bg-alarm-wash",
  green: "border-line bg-surface",
  amber: "border-line bg-surface",
  grey: "border-line bg-surface",
};
const KIND_TEXT: Record<string, string> = { red: "text-alarm", green: "text-sealed", amber: "text-amber", grey: "text-muted" };

export function MissionView() {
  const [geo, setGeo] = useState<Geometry | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const loop = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/mission", { cache: "no-store" });
      if (!res.ok) throw new Error("bad status");
      setData((await res.json()) as Data);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void fetch("/api/map").then((r) => r.json()).then(setGeo).catch(() => setFailed(true));
    const first = setTimeout(() => void refresh(), 0);
    const t = setInterval(() => void refresh(), 5000);
    const stop = loop;
    return () => {
      clearTimeout(first);
      clearInterval(t);
      stop.current++;
    };
  }, [refresh]);

  async function post(path: string, body?: unknown) {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: string };
    if (!res.ok) throw new Error(json.error ?? "Request failed");
    return json;
  }

  async function run() {
    if (running) return;
    const token = ++loop.current;
    setRunning(true);
    setMessage("");
    try {
      while (loop.current === token) {
        const d = (await post("/api/demo/step", { count: 40 })) as { remaining: number };
        await refresh();
        if (d.remaining === 0) {
          setMessage("Every polling unit has reported.");
          break;
        }
        await sleep(500);
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "The simulation stopped.");
    }
    setRunning(false);
  }

  function pause() {
    loop.current++;
    setRunning(false);
  }

  async function collate(mode: "honest" | "tamper") {
    setMessage("");
    try {
      const r = (await post("/api/demo/collate", { mode })) as { ward: string; rows: number };
      setMessage(mode === "tamper" ? `${r.ward} ward collation entered with one altered row.` : `${r.ward} ward collation entered, read out honestly.`);
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Collation failed.");
    }
  }

  async function reset() {
    pause();
    setConfirmReset(false);
    try {
      await post("/api/demo/reset");
      setMessage("The demo ledger was cleared.");
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Reset failed.");
    }
  }

  const t = data?.totals;
  const pct = (v: number) => (t && t.units ? (v / t.units) * 100 : 0);
  const simulated = (data?.simulation.simulated ?? 0) > 0;

  return (
    <div className="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-16 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-display text-xl font-extrabold tracking-tight">Tally</Link>
          <span className="hidden h-5 w-px bg-line sm:block" />
          <span className="text-sm font-semibold text-muted">Mission control · Federal Capital Territory</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {simulated && <Chip tone="amber">SIMULATION · demo actors signing real 2023 figures</Chip>}
          <span className="inline-flex h-7 items-center gap-2 rounded-full bg-alarm-wash px-3 text-xs font-bold tracking-wider text-alarm"><i className={`h-2 w-2 rounded-full bg-alarm ${failed ? "" : "animate-pulse"}`} />{failed ? "OFFLINE" : "LIVE"}</span>
          <Link href="/verify" className="text-sm font-bold text-thumb">Verify the ledger ›</Link>
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
            {data?.councils.map((c) => (
              <div key={c.name}>
                <div className="flex justify-between text-sm"><span className="font-semibold">{c.name}</span><span className="text-muted tabular-nums">{n(c.sealed)} of {n(c.units)}</span></div>
                <div className="mt-1 h-2 rounded-full bg-raised"><div className="h-2 rounded-full bg-sealed transition-[width] duration-700" style={{ width: `${c.units ? (c.sealed / c.units) * 100 : 0}%` }} /></div>
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

          {data?.demoEnabled && (
            <Card className="space-y-3">
              <Eyebrow>Election-night simulation</Eyebrow>
              <p className="text-sm text-muted">Labelled demo actors sign the real 2023 figures through the same ledger a phone uses. Every count above is live from the database.</p>
              <div className="grid grid-cols-2 gap-2">
                {running ? <Button variant="secondary" onClick={pause}>Pause</Button> : <Button onClick={() => void run()} disabled={data.simulation.remaining === 0}>{data.simulation.simulated > 0 ? "Continue the night" : "Start the night"}</Button>}
                <Button variant="secondary" onClick={() => void collate("honest")}>Collate a ward</Button>
                <Button variant="danger" onClick={() => void collate("tamper")} className="col-span-2">Collate a ward with an altered number</Button>
              </div>
              {data.simulation.simulated > 0 && (
                confirmReset ? (
                  <div className="flex items-center gap-2 text-sm"><span className="flex-1 text-muted">Clear every signed result?</span><Button variant="danger" onClick={() => void reset()} className="min-h-10">Yes, clear</Button><Button variant="secondary" onClick={() => setConfirmReset(false)} className="min-h-10">Cancel</Button></div>
                ) : (
                  <button type="button" onClick={() => setConfirmReset(true)} className="text-xs text-muted underline">Reset the demo</button>
                )
              )}
              {message && <p className="text-sm text-fg" role="status">{message}</p>}
            </Card>
          )}

          <div className="space-y-2.5">
            <Eyebrow>Alerts · newest first</Eyebrow>
            {data && data.alerts.length === 0 && <Card><p className="text-sm text-muted">No alerts yet. They appear as results are signed and collated.</p></Card>}
            {data?.alerts.map((a, i) => (
              <div key={`${a.at}-${i}`} className={`rounded-2xl border px-4 py-3 ${KIND[a.kind]}`}>
                <div className={`text-[11px] font-bold tracking-widest ${KIND_TEXT[a.kind]}`}>{a.k} · {new Date(a.at).toLocaleTimeString()}</div>
                <div className="mt-1 font-bold">{a.title}</div>
                <div className="mt-0.5 text-sm text-muted">{a.body}</div>
              </div>
            ))}
          </div>

        </div>
      </div>
      <p className="mt-8 max-w-prose text-xs text-muted">Map: real polling-site locations on the FCT boundary (GRID3 via geoBoundaries, CC BY 4.0). Results appear only when signed through the ledger. {failed && "The connection to the server was lost; the numbers shown may be out of date."}</p>
    </div>
  );
}

function Kpi({ value, label, tone, alarm }: { value: string; label: string; tone: string; alarm?: boolean }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 transition-colors ${alarm ? "border-alarm bg-alarm-wash" : "border-line bg-surface"}`}>
      <div className={`font-display text-4xl leading-none font-extrabold tracking-tight tabular-nums ${tone}`}>{value}</div>
      <div className="mt-1.5 text-xs text-muted">{label}</div>
    </div>
  );
}
