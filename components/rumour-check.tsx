"use client";
import Link from "next/link";
import { useState } from "react";
import { Button, Card, Eyebrow } from "@/components/ui";
import { PlaceSearch } from "@/components/app/place-search";
import { ListenButton } from "@/components/listen-button";
import { t, type Lang } from "@/lib/core/i18n";

type Verdict = { verdict: "confirmed" | "false" | "unverified"; headline: string; reasons: string[]; simulated?: boolean };
type Claim = { summary: string; by: "ai" | "rules" };
type Candidate = { code: string; name: string; level: string; path: string };
type Result =
  | { status: "needs_place"; claim: Claim; candidates: Candidate[] }
  | { status: "checked"; claim: Claim; place: { code: string; name: string } | null; verdict: Verdict };

const TONE = {
  confirmed: { label: "r.confirmed", text: "text-sealed", border: "border-sealed/50", dot: "bg-sealed" },
  false: { label: "r.false", text: "text-alarm", border: "border-alarm/60", dot: "bg-alarm" },
  unverified: { label: "r.unverified", text: "text-amber", border: "border-amber/50", dot: "bg-amber" },
} as const;
const LEVEL: Record<string, string> = { lga: "Area council", ward: "Ward", pu: "Polling unit" };

/** Paste or share a forwarded message; the signed ledger answers. */
export function RumourCheck({ initialText = "", lang = "en" }: { initialText?: string; lang?: Lang }) {
  const [text, setText] = useState(initialText);
  const [place, setPlace] = useState<{ code: string; name: string } | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function check(placeCode?: string) {
    setState("loading");
    setError("");
    try {
      const res = await fetch("/api/rumour", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, placeCode: placeCode ?? place?.code, lang }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The check failed.");
      setResult(data as Result);
      setState("idle");
    } catch (e) {
      setError(navigator.onLine ? ((e as Error).message ?? "The check failed.") : "You are offline. A check needs a connection.");
      setState("error");
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <label htmlFor="msg" className="font-display text-xl font-extrabold">{t(lang, "c.label")}</label>
        <p className="mt-1 text-sm text-muted">{t(lang, "c.hint")}</p>
        <textarea
          id="msg"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setResult(null);
          }}
          rows={5}
          maxLength={1500}
          placeholder="e.g. APC won 202 votes at Leleli Pri. Sch. II, they changed the figures at Pai ward"
          className="mt-3 w-full rounded-xl border border-line bg-raised p-3 text-base outline-none focus:border-thumb"
        />
        <div className="mt-3">
          <Eyebrow>{t(lang, "c.place")}</Eyebrow>
          {place ? (
            <p className="mt-1 flex items-center justify-between rounded-xl bg-raised px-3 py-2 text-sm">
              <span className="font-bold">{place.name}</span>
              <button type="button" onClick={() => setPlace(null)} className="text-blue">Change</button>
            </p>
          ) : (
            <div className="mt-1">
              <PlaceSearch placeholder="Search the polling unit or ward it mentions" onPick={(h) => setPlace({ code: h.code, name: h.name })} />
            </div>
          )}
        </div>
        <Button onClick={() => void check()} disabled={text.trim().length < 8 || state === "loading"} className="mt-4 w-full">
          {state === "loading" ? t(lang, "c.loading") : t(lang, "c.button")}
        </Button>
        {state === "error" && <p role="alert" className="mt-3 text-sm text-alarm">{error}</p>}
      </Card>

      {result?.status === "needs_place" && (
        <Card>
          <Eyebrow>Which one?</Eyebrow>
          <p className="mt-1 text-sm text-muted">Several places match the name in the message. Pick the right one.</p>
          <ul className="mt-2 divide-y divide-line">
            {result.candidates.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => {
                    setPlace({ code: c.code, name: c.name });
                    void check(c.code);
                  }}
                  className="flex w-full items-center justify-between gap-3 py-3 text-left"
                >
                  <span>
                    <span className="block font-bold">{c.name}</span>
                    <span className="block text-xs text-muted">{LEVEL[c.level] ?? c.level}{c.path ? ` · ${c.path}` : ""}</span>
                  </span>
                  <span aria-hidden className="text-muted">›</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {result?.status === "checked" && (
        <Card className={TONE[result.verdict.verdict].border}>
          <p className={`flex items-center gap-2 text-xs font-bold tracking-[0.14em] uppercase ${TONE[result.verdict.verdict].text}`}>
            <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${TONE[result.verdict.verdict].dot}`} />
            {t(lang, TONE[result.verdict.verdict].label)}
          </p>
          <h2 className="font-display mt-2 text-2xl leading-tight font-extrabold">{result.verdict.headline}</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {result.verdict.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <div className="mt-3"><ListenButton lang={lang} text={[t(lang, TONE[result.verdict.verdict].label), result.verdict.headline, ...result.verdict.reasons].map((part) => part.replace(/\.+$/, "")).join(". ")} labels={{ listen: t(lang, "ui.listen"), stop: t(lang, "ui.stop"), noVoice: t(lang, "ui.novoice") }} /></div>
          {result.verdict.simulated && <p role="note" className="mt-3 rounded-xl border border-amber/40 bg-amber-wash px-3 py-2 text-xs text-amber">{t(lang, "sim.note")}</p>}
          {result.place && (
            <Link href={`/p/${result.place.code}`} className="mt-4 inline-block font-bold text-blue">{t(lang, "c.record", { place: result.place.name })} ›</Link>
          )}
          <div className="mt-4 border-t border-line pt-3 text-xs text-muted">
            <p>{t(lang, "c.readAs")}: “{result.claim.summary}”</p>
            <p className="mt-1">{result.claim.by === "ai" ? t(lang, "c.readAi") : t(lang, "c.readRules")}</p>
          </div>
        </Card>
      )}
    </div>
  );
}
