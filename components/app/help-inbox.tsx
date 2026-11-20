"use client";
import { useCallback, useEffect, useState } from "react";
import { signEvent } from "@/lib/core/events";
import { HELP_LABEL, waited, type HelpKind, type HelpState } from "@/lib/core/help";
import { enqueue, holdEvent, type Identity } from "@/lib/client/store";
import { Icon } from "@/components/icons";

type Item = { id: string; placeCode: string; placeName: string; kind: HelpKind; createdAt: string; answeredAt: string | null; state: HelpState };

/** Priority-help requests at this officer's unit (or the observer's ward). Tapping "I'm on it" signs the answer, which also works offline. */
export function HelpInbox({ identity }: { identity: Identity }) {
  const place = identity.placeCode!;
  const [items, setItems] = useState<Item[] | null>(null);
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [, tick] = useState(0);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/help?place=${place}`, { cache: "no-store" });
      if (r.ok) setItems(((await r.json()) as { items: Item[] }).items);
    } catch {
      /* offline: keep what is shown */
    }
  }, [place]);
  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const poll = setInterval(() => void load(), 10_000);
    const clock = setInterval(() => tick((n) => n + 1), 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [load]);

  async function answer(i: Item) {
    const ev = signEvent({ id: crypto.randomUUID(), type: "help.responded", placeCode: i.placeCode, payload: { requestId: i.id, text: "On my way" }, occurredAt: new Date().toISOString(), authorKey: identity.publicKeyHex }, identity.secretKeyHex);
    await holdEvent(ev, []);
    await enqueue({ event: ev });
    setMine((m) => new Set(m).add(i.id));
  }

  const waiting = (items ?? []).filter((i) => i.state !== "answered" && !mine.has(i.id));
  if (!items || (waiting.length === 0 && mine.size === 0)) return null;
  return (
    <section className="rounded-2xl border-2 border-pink bg-pink-wash p-4" aria-label="Priority help requests">
      <p className="flex items-center gap-2 text-xs font-extrabold tracking-widest text-pink uppercase"><Icon name="people" size={16} />Priority help · {waiting.length} waiting</p>
      <ul className="mt-3 space-y-2">
        {waiting.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface p-3">
            <span className="min-w-0 text-sm">
              <span className="block font-bold">{HELP_LABEL[i.kind]}</span>
              <span className={`block text-xs ${i.state === "escalated" ? "font-bold text-alarm" : "text-muted"}`}>{i.placeName} · waiting {waited(i.createdAt)}{i.state === "escalated" ? " · mission control told" : ""}</span>
            </span>
            <button type="button" onClick={() => void answer(i)} className="min-h-11 shrink-0 rounded-xl bg-pink px-4 text-sm font-extrabold text-black">I&apos;m on it</button>
          </li>
        ))}
        {mine.size > 0 && <li className="flex items-center gap-2 rounded-xl bg-sealed-wash p-3 text-sm font-bold text-sealed"><Icon name="check" size={16} />{mine.size} answered. Saved on this phone.</li>}
      </ul>
    </section>
  );
}
