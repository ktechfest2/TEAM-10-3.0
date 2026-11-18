"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, Eyebrow } from "@/components/ui";
import { Logo } from "@/components/logo";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Progress = { simulated: number; remaining: number };

/** Operator page: fills the ledger with labelled test results, and clears it. Not part of the public product. */
export function OpsView() {
  const [code, setCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const loop = useRef(0);

  const post = useCallback(
    async (path: string, body?: unknown) => {
      const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json", "x-ops-code": code }, body: JSON.stringify(body ?? {}) });
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      return json;
    },
    [code],
  );

  const refresh = useCallback(async () => {
    const m = (await (await fetch("/api/mission", { cache: "no-store" })).json()) as { simulation: Progress };
    setProgress(m.simulation);
  }, []);

  useEffect(() => {
    const stop = loop;
    return () => {
      stop.current++;
    };
  }, []);

  async function unlock() {
    setMessage("");
    try {
      await post("/api/ops/check");
      setUnlocked(true);
      await refresh();
    } catch {
      setMessage("That code was not accepted.");
    }
  }

  async function run() {
    if (running) return;
    const token = ++loop.current;
    setRunning(true);
    setMessage("");
    try {
      while (loop.current === token) {
        const d = (await post("/api/ops/step", { count: 40 })) as unknown as Progress;
        setProgress({ simulated: d.simulated, remaining: d.remaining });
        if (d.remaining === 0) {
          setMessage("Every polling unit has a result.");
          break;
        }
        await sleep(400);
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Stopped.");
    }
    setRunning(false);
  }

  async function collate(mode: "honest" | "tamper") {
    setMessage("");
    try {
      const r = (await post("/api/ops/collate", { mode })) as { ward: string };
      setMessage(`${r.ward} ward collation entered${mode === "tamper" ? " with one altered row" : ""}.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed.");
    }
  }

  async function reset() {
    loop.current++;
    setRunning(false);
    setConfirmReset(false);
    try {
      await post("/api/ops/reset");
      setMessage("The ledger was cleared.");
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 py-10">
      <Link href="/"><Logo size={24} /></Link>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Operations</h1>
      {!unlocked ? (
        <Card className="space-y-3">
          <Eyebrow>Operator code</Eyebrow>
          <input type="password" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Operator code" className="h-12 w-full rounded-xl border border-line bg-raised px-4 outline-none focus:border-thumb" />
          <Button onClick={() => void unlock()} disabled={!code}>Unlock</Button>
          {message && <p className="text-sm text-alarm" role="alert">{message}</p>}
        </Card>
      ) : (
        <Card className="space-y-3">
          <Eyebrow>Test data</Eyebrow>
          <p className="text-sm text-muted">Labelled test actors sign real 2023 polling-unit figures through the same ledger path a phone uses. Results made this way are marked as simulated everywhere they appear.</p>
          {progress && <p className="text-sm tabular-nums">{progress.simulated.toLocaleString("en-US")} simulated results · {progress.remaining.toLocaleString("en-US")} units remaining</p>}
          <div className="grid grid-cols-2 gap-2">
            {running ? <Button variant="secondary" onClick={() => { loop.current++; setRunning(false); }}>Pause</Button> : <Button onClick={() => void run()} disabled={progress?.remaining === 0}>{(progress?.simulated ?? 0) > 0 ? "Continue" : "Start"}</Button>}
            <Button variant="secondary" onClick={() => void collate("honest")}>Collate a ward</Button>
            <Button variant="danger" onClick={() => void collate("tamper")} className="col-span-2">Collate a ward with an altered number</Button>
          </div>
          {confirmReset ? (
            <div className="flex items-center gap-2 text-sm"><span className="flex-1 text-muted">Clear every signed result?</span><Button variant="danger" onClick={() => void reset()} className="min-h-10">Clear</Button><Button variant="secondary" onClick={() => setConfirmReset(false)} className="min-h-10">Cancel</Button></div>
          ) : (
            <button type="button" onClick={() => setConfirmReset(true)} className="text-xs text-muted underline">Clear the ledger</button>
          )}
          {message && <p className="text-sm" role="status">{message}</p>}
          <Link href="/mission" className="block pt-1 text-sm font-bold text-thumb">Open mission control ›</Link>
        </Card>
      )}
    </main>
  );
}
