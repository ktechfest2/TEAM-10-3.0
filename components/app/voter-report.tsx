"use client";
import { useState } from "react";
import { signEvent } from "@/lib/core/events";
import { t, type Lang, type MessageKey } from "@/lib/core/i18n";
import { enqueue, type Identity } from "@/lib/client/store";
import { Button, Card, Eyebrow } from "@/components/ui";
import { PlaceSearch } from "./place-search";

const LEVELS = [
  { level: "none", key: "q.none" },
  { level: "short", key: "q.short" },
  { level: "medium", key: "q.medium" },
  { level: "long", key: "q.long" },
  { level: "not_opened", key: "q.not_opened" },
] as const satisfies readonly { level: string; key: MessageKey }[];

type Unit = { code: string; name: string };

/** A voter tells everyone what is happening at their polling unit. Signed on the phone, so it works offline and cannot be forged. */
export function VoterReport({ identity, lang, followed }: { identity: Identity; lang: Lang; followed: Unit[] }) {
  const [unit, setUnit] = useState<Unit | null>(null);
  const [level, setLevel] = useState<(typeof LEVELS)[number]["level"] | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function send() {
    if (!unit || !level) return;
    setState("sending");
    try {
      const event = signEvent({ id: crypto.randomUUID(), type: "pu.queue", placeCode: unit.code, payload: { level }, occurredAt: new Date().toISOString(), authorKey: identity.publicKeyHex }, identity.secretKeyHex);
      await enqueue({ event });
      setState("sent");
    } catch {
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <Card>
        <p role="status" className="text-sm font-bold text-sealed">{t(lang, "q.sent")}</p>
        <button type="button" onClick={() => { setState("idle"); setLevel(null); }} className="mt-3 text-sm font-bold text-blue">{t(lang, "q.title")} ›</button>
      </Card>
    );
  }

  return (
    <Card>
      <Eyebrow>{t(lang, "q.title")}</Eyebrow>
      {unit ? (
        <p className="mt-2 flex items-center justify-between rounded-xl bg-raised px-3 py-2 text-sm">
          <span className="font-bold">{unit.name}</span>
          <button type="button" onClick={() => setUnit(null)} className="text-blue">✕</button>
        </p>
      ) : (
        <div className="mt-2 space-y-2">
          {followed.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {followed.map((f) => (
                <button key={f.code} type="button" onClick={() => setUnit(f)} className="rounded-full bg-raised px-3 py-2 text-sm font-bold hover:brightness-125">{f.name}</button>
              ))}
            </div>
          )}
          <PlaceSearch levels={["pu"]} placeholder={t(lang, "q.pick")} onPick={(h) => setUnit({ code: h.code, name: h.name })} />
        </div>
      )}
      {unit && (
        <>
          <div className="mt-3 grid grid-cols-1 gap-2" role="radiogroup" aria-label={t(lang, "q.title")}>
            {LEVELS.map((l) => (
              <button key={l.level} type="button" role="radio" aria-checked={level === l.level} onClick={() => setLevel(l.level)} className={`min-h-12 rounded-xl border px-4 text-left text-base font-bold ${level === l.level ? "border-fg bg-fg text-bg" : l.level === "not_opened" ? "border-amber/50 text-amber" : "border-line"}`}>
                {t(lang, l.key)}
              </button>
            ))}
          </div>
          <Button onClick={() => void send()} disabled={!level || state === "sending"} className="mt-3 w-full">{t(lang, "q.send")}</Button>
          {state === "error" && <p role="alert" className="mt-2 text-sm text-alarm">Could not save the report on this phone. Try again.</p>}
        </>
      )}
    </Card>
  );
}
