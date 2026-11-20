"use client";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { HELP_KINDS, HELP_LABEL, type HelpKind, type HelpState } from "@/lib/core/help";
import { timeAgo } from "@/components/ui";

type Item = { id: string; kind: HelpKind; createdAt: string; answeredAt: string | null; answeredBy: string | null; state: HelpState };
export type HelpLabels = { title: string; hint: string; sent: string; kinds: Record<HelpKind, string> };

const STATE_TONE: Record<HelpState, string> = { open: "bg-amber-wash text-amber", escalated: "bg-alarm text-white", answered: "bg-sealed-wash text-sealed" };
const STATE_TEXT: Record<HelpState, string> = { open: "Waiting", escalated: "Sent to mission control", answered: "Answered" };

/** On a unit page: ask for priority help, and see how requests here are being answered. No name or phone number is asked for. */
export function HelpPanel({ code, initial, labels }: { code: string; initial: Item[]; labels: HelpLabels }) {
  const [items, setItems] = useState<Item[]>(initial);
  const [busy, setBusy] = useState<HelpKind | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`/api/help?place=${code}`, { cache: "no-store" });
      if (r.ok) setItems(((await r.json()) as { items: Item[] }).items);
    } catch {
      /* offline: keep what is shown */
    }
  }, [code]);
  useEffect(() => {
    const t = setInterval(() => void refresh(), 15_000);
    return () => clearInterval(t);
  }, [refresh]);

  async function ask(kind: HelpKind) {
    setBusy(kind);
    setError("");
    try {
      const res = await fetch("/api/help", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ placeCode: code, kind }) });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "That did not work.");
      setSent(true);
      await refresh();
    } catch (e) {
      setError(e instanceof Error && e.message !== "Failed to fetch" ? e.message : "No connection. Tell the officer at the unit, or try again with a network.");
    } finally {
      setBusy(null);
    }
  }

  const open = items.filter((i) => i.state !== "answered").length;
  return (
    <section className="rounded-2xl border border-line bg-surface p-5" aria-label={labels.title}>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-pink-wash text-pink"><Icon name="people" size={20} /></span>
        <div className="min-w-0">
          <h2 className="font-bold">{labels.title}</h2>
          <p className="text-sm text-muted">{labels.hint}</p>
        </div>
      </div>
      {sent ? (
        <p role="status" className="mt-4 flex items-start gap-2 rounded-xl bg-sealed-wash px-4 py-3 text-sm text-sealed"><Icon name="check" size={18} className="mt-0.5 shrink-0" />{labels.sent}</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {HELP_KINDS.map((k) => (
            <button key={k} type="button" onClick={() => void ask(k)} disabled={busy !== null} className="min-h-12 rounded-xl border border-line bg-raised px-3 text-sm font-bold hover:border-pink disabled:opacity-50">
              {busy === k ? "…" : labels.kinds[k]}
            </button>
          ))}
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-alarm">{error}</p>}
      {items.length > 0 && (
        <ul className="mt-4 divide-y divide-line text-sm">
          {items.slice(0, 5).map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 py-2">
              <span><span className="font-semibold">{HELP_LABEL[i.kind]}</span><span className="block text-xs text-muted">{timeAgo(i.createdAt)}{i.answeredBy ? ` · ${i.answeredBy}` : ""}</span></span>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${STATE_TONE[i.state]}`}>{STATE_TEXT[i.state]}</span>
            </li>
          ))}
        </ul>
      )}
      {open > 0 && <p className="mt-2 text-xs text-muted">{open} waiting. After 15 minutes without an answer, mission control is told.</p>}
    </section>
  );
}
