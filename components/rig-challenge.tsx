"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";

type Unit = { code: string; name: string; votes: Record<string, number>; signers: string[]; signedAt: string };
type Ward = { code: string; name: string; units: Unit[] };
type Outcome = {
  caught: boolean;
  ms: number;
  ward: { code: string; name: string };
  mismatches: { code: string; name: string; field: string; announced: number; sealed: number; signers: string[]; signedAt: string }[];
  texted: number;
  smsOff: boolean;
};
type Edit = { unit: string; party: string; votes: number };

const n = (v: number) => v.toLocaleString("en-US");
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });

/** The rigging challenge: the visitor plays a corrupt collation officer and changes one figure. The real check decides. */
export function RigChallenge() {
  const [wards, setWards] = useState<Ward[] | null>(null);
  const [wardCode, setWardCode] = useState("");
  const [edit, setEdit] = useState<Edit | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/rig")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((d: { wards: Ward[] }) => {
        setWards(d.wards);
        setWardCode(d.wards[0]?.code ?? "");
      })
      .catch(() => setError("Could not load the wards. Check your connection and reload."));
  }, []);

  const ward = wards?.find((w) => w.code === wardCode);
  const parties = ward ? [...new Set(ward.units.flatMap((u) => Object.entries(u.votes).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([p]) => p)))].slice(0, 4) : [];
  const changed = edit && ward?.units.find((u) => u.code === edit.unit)?.votes[edit.party] !== edit.votes;

  async function announce() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/rig", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ward: wardCode, edit: changed ? edit : null }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "That did not work.");
      setOutcome(data as Outcome);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setOutcome(null);
    setEdit(null);
  }

  if (outcome) return <Result outcome={outcome} onAgain={reset} />;

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="rounded-xl bg-alarm-wash px-4 py-3 text-sm text-alarm">{error}</p>}
      {!wards && !error && <div className="h-72 animate-pulse rounded-3xl bg-raised" />}
      {wards && wards.length === 0 && <p className="rounded-2xl border border-line p-5 text-muted">No ward has three sealed results yet, so there is nothing to collate. Results need to be signed first.</p>}

      {wards && wards.length > 0 && (
        <>
          <div>
            <p className="mb-2 text-xs font-bold tracking-[0.14em] text-muted uppercase">1 · Pick your ward</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {wards.map((w) => (
                <button key={w.code} onClick={() => { setWardCode(w.code); setEdit(null); }} aria-pressed={w.code === wardCode} className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-bold ${w.code === wardCode ? "bg-fg text-bg" : "bg-raised text-muted hover:text-fg"}`}>
                  {w.name}
                </button>
              ))}
            </div>
          </div>

          {ward && (
            <div>
              <p className="mb-2 text-xs font-bold tracking-[0.14em] text-muted uppercase">2 · Tap a number and change it</p>
              <div className="overflow-hidden rounded-2xl border border-line bg-surface">
                <div className="flex items-center justify-between border-b border-line bg-raised px-4 py-2.5 font-mono text-[11px] tracking-wider text-muted uppercase">
                  <span>EC8B · Ward collation</span>
                  <span className="truncate pl-3">{ward.name}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted">
                        <th className="px-4 py-2 font-semibold">Polling unit</th>
                        {parties.map((p) => <th key={p} className="px-2 py-2 text-right font-extrabold text-fg">{p}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {ward.units.map((u) => (
                        <tr key={u.code} className="border-t border-line">
                          <td className="max-w-[160px] px-4 py-2">
                            <span className="block truncate font-semibold">{u.name}</span>
                            <span className="flex items-center gap-1 text-[11px] text-sealed"><Icon name="check" size={12} />Sealed by {u.signers.join(", ")}</span>
                          </td>
                          {parties.map((p) => {
                            const sealed = u.votes[p] ?? 0;
                            const active = edit?.unit === u.code && edit.party === p;
                            const value = active ? edit!.votes : sealed;
                            const dirty = active && value !== sealed;
                            return (
                              <td key={p} className="px-1.5 py-1.5 text-right">
                                {active ? (
                                  <input
                                    autoFocus
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    value={value}
                                    onChange={(e) => setEdit({ unit: u.code, party: p, votes: Math.max(0, Math.min(100000, Number(e.target.value) || 0)) })}
                                    aria-label={`${p} votes at ${u.name}`}
                                    className={`h-10 w-20 rounded-lg border-2 bg-bg px-2 text-right font-bold tabular-nums outline-none ${dirty ? "border-alarm text-alarm" : "border-fg"}`}
                                  />
                                ) : (
                                  <button onClick={() => setEdit({ unit: u.code, party: p, votes: sealed + 100 })} className="h-10 w-20 rounded-lg px-2 text-right font-bold tabular-nums hover:bg-raised" aria-label={`Change ${p} votes at ${u.name}, now ${sealed}`}>
                                    {n(sealed)}
                                  </button>
                                )}
                                {dirty && <span className="block pr-2 text-[11px] text-muted line-through">{n(sealed)}</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted">Tapping a number adds 100 votes. Type any number you like. The ward total is added up for you, so the sheet itself looks right.</p>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-bold tracking-[0.14em] text-muted uppercase">3 · Announce it</p>
            <button onClick={() => void announce()} disabled={busy || !ward} className={`flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-extrabold disabled:opacity-50 ${changed ? "bg-alarm text-black" : "bg-fg text-bg"}`}>
              {busy ? "Announcing…" : changed ? "Announce the changed total" : "Announce the honest total"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Result({ outcome, onAgain }: { outcome: Outcome; onAgain: () => void }) {
  const m = outcome.mismatches[0];
  return (
    <div className="space-y-4">
      {outcome.caught && m ? (
        <section className="relative overflow-hidden rounded-3xl border-2 border-alarm bg-alarm-wash p-6">
          <span aria-hidden className="absolute -top-16 -right-16 h-48 w-48 animate-ping rounded-full bg-alarm/20 [animation-duration:2.4s]" />
          <p className="flex items-center gap-2 text-xs font-extrabold tracking-[0.18em] text-alarm uppercase"><Icon name="alert" size={16} />Tampering caught</p>
          <h2 className="font-display mt-2 text-5xl leading-none font-extrabold tracking-tight">Caught in {outcome.ms < 1000 ? `${Math.max(1, outcome.ms)} ms` : `${(outcome.ms / 1000).toFixed(1)} s`}.</h2>
          <p className="mt-4 text-lg">
            <b>{m.name}</b>: you announced <b className="text-alarm">{m.field} {n(m.announced)}</b>.
          </p>
          <p className="mt-1 text-lg">
            At the unit, agents of <b>{m.signers.join(", ")}</b> signed <b className="text-sealed">{n(m.sealed)}</b> at {time(m.signedAt)}.
          </p>
          <p className="mt-4 text-sm text-muted">Their signatures were made on their own phones, so neither you nor Tally can change them. Your announcement is now on the public record next to theirs, and the record is stamped on Bitcoin.</p>
        </section>
      ) : (
        <section className="rounded-3xl border-2 border-sealed bg-sealed-wash p-6">
          <p className="flex items-center gap-2 text-xs font-extrabold tracking-[0.18em] text-sealed uppercase"><Icon name="check" size={16} />Matches</p>
          <h2 className="font-display mt-2 text-4xl leading-none font-extrabold tracking-tight">Honest. Nothing to flag.</h2>
          <p className="mt-3 text-muted">Every row equals what rival agents signed at the unit. Try again and change a number.</p>
        </section>
      )}

      {outcome.caught && (
        <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 text-sm">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-wash text-blue"><Icon name="chat" size={18} /></span>
          <p className="pt-1.5">
            {outcome.texted > 0
              ? `${outcome.texted} ${outcome.texted === 1 ? "person following this unit was" : "people following this unit were"} sent a text with the proof.`
              : outcome.smsOff
                ? "People following this unit get a text with the proof. Text messages are not switched on for this server yet."
                : "Anyone following this unit by SMS gets a text with the proof. Nobody follows it yet."}
          </p>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        <Link href="/mission" className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-fg font-bold text-bg"><Icon name="map" size={18} />Mission control</Link>
        <Link href={`/p/${outcome.ward.code}`} className="flex min-h-12 items-center justify-center rounded-2xl border border-line font-bold">See the proof ›</Link>
        <button onClick={onAgain} className="min-h-12 rounded-2xl border border-line font-bold">Try again</button>
      </div>
    </div>
  );
}
