"use client";
import { useState } from "react";
import { Icon } from "@/components/icons";

type Labels = { title: string; hint: string; phone: string; go: string; ok: string; off: string; fail: string };

/** Follow one polling unit by text message: a text if it moves, and when voting starts. */
export function SmsAlerts({ code, labels }: { code: string; labels: Labels }) {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"ok" | "off" | "fail" | null>(null);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ placeCode: code, phone }) });
      const data = (await res.json()) as { error?: string; sms?: "sent" | "failed" | "not_configured" };
      if (!res.ok) throw new Error(data.error ?? "Could not save that.");
      setDone(data.sms === "sent" ? "ok" : data.sms === "not_configured" ? "off" : "fail");
    } catch (err) {
      setError(err instanceof Error && err.message !== "Failed to fetch" ? err.message : "No connection. Try again when you have a network.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-wash text-blue"><Icon name="chat" size={20} /></span>
        <div className="min-w-0">
          <h2 className="font-bold">{labels.title}</h2>
          <p className="text-sm text-muted">{labels.hint}</p>
        </div>
      </div>
      {done ? (
        <p role="status" className={`mt-4 flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${done === "ok" ? "bg-sealed-wash text-sealed" : "bg-amber-wash text-amber"}`}>
          <Icon name={done === "ok" ? "check" : "alert"} size={18} className="mt-0.5 shrink-0" />
          {labels[done]}
        </p>
      ) : (
        <form onSubmit={(e) => void submit(e)} className="mt-4 flex gap-2">
          <label className="sr-only" htmlFor={`phone-${code}`}>{labels.phone}</label>
          <input id={`phone-${code}`} value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 123 4567" className="min-h-12 min-w-0 flex-1 rounded-xl border border-line bg-raised px-4 outline-none focus:border-blue" />
          <button type="submit" disabled={busy || phone.replace(/\D/g, "").length < 10} className="min-h-12 shrink-0 rounded-xl bg-fg px-5 font-bold text-bg disabled:opacity-40">{busy ? "…" : labels.go}</button>
        </form>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-alarm">{error}</p>}
    </section>
  );
}
