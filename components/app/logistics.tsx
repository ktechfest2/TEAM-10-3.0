"use client";
import { useCallback, useEffect, useState } from "react";
import { signEvent, type MaterialKind } from "@/lib/core/events";
import { KIND_LABEL, KIND_ORDER, type MaterialItem } from "@/lib/core/materials";
import { enqueue, holdEvent, listHeld, type HeldEvent, type Identity } from "@/lib/client/store";
import { Icon } from "@/components/icons";
import { Button, Card, Chip, Eyebrow } from "@/components/ui";
import { PlaceSearch, type PlaceHit } from "./place-search";

const BLANK: Record<MaterialKind, string> = { ballot_papers: "", ballot_boxes: "", result_sheets: "", bvas: "" };
const KIT: Record<MaterialKind, string> = { ballot_papers: "550", ballot_boxes: "1", result_sheets: "8", bvas: "1" };

/** The materials officer signs what leaves the store for each polling unit. The officer at the unit signs for what arrives. */
export function LogisticsHome({ identity }: { identity: Identity }) {
  const [unit, setUnit] = useState<PlaceHit | null>(null);
  const [counts, setCounts] = useState(BLANK);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sent, setSent] = useState<HeldEvent[]>([]);
  const [done, setDone] = useState("");

  const reload = useCallback(() => void listHeld().then((all) => setSent(all.filter((h) => h.event.type === "material.dispatched" && h.event.authorKey === identity.publicKeyHex).reverse())), [identity.publicKeyHex]);
  useEffect(reload, [reload]);

  const items: MaterialItem[] = KIND_ORDER.flatMap((kind) => {
    const v = counts[kind];
    if (!/^\d+$/.test(v) || Number(v) === 0) return [];
    return [{ kind, qty: Number(v), ...(kind === "ballot_papers" && from && to ? { serialFrom: from, serialTo: to } : {}) }];
  });
  const serialMismatch = from && to && counts.ballot_papers && /^\d+$/.test(from) && /^\d+$/.test(to) && Number(to) - Number(from) + 1 !== Number(counts.ballot_papers);

  async function sign() {
    if (!unit || items.length === 0) return;
    const ev = signEvent({ id: crypto.randomUUID(), type: "material.dispatched", placeCode: unit.code, payload: { items }, occurredAt: new Date().toISOString(), authorKey: identity.publicKeyHex }, identity.secretKeyHex);
    await holdEvent(ev, []);
    await enqueue({ event: ev });
    setDone(`Signed: ${items.map((i) => `${i.qty} ${KIND_LABEL[i.kind].toLowerCase()}`).join(", ")} to ${unit.name}.`);
    setUnit(null);
    setCounts(BLANK);
    setFrom("");
    setTo("");
    reload();
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div className="flex items-center justify-between"><Eyebrow>Materials officer</Eyebrow><Chip tone="amber">Saved on this phone</Chip></div>
        <h2 className="font-display text-2xl leading-tight font-extrabold tracking-tight">Send materials to a polling unit</h2>
        {done && <p role="status" className="flex items-start gap-2 rounded-xl bg-sealed-wash px-4 py-3 text-sm text-sealed"><Icon name="check" size={18} className="mt-0.5 shrink-0" />{done}</p>}
        {unit ? (
          <div className="flex items-center justify-between rounded-xl bg-raised px-4 py-3">
            <span><span className="block font-semibold">{unit.name}</span><span className="hash block text-muted">{unit.code}</span></span>
            <button onClick={() => setUnit(null)} className="text-sm text-muted">Change</button>
          </div>
        ) : (
          <PlaceSearch onPick={(h) => { setUnit(h); setDone(""); }} levels={["pu"]} placeholder="Type the polling unit" />
        )}
        {unit && (
          <>
            <div className="flex items-center justify-between"><p className="text-sm font-bold">What is leaving the store</p><button onClick={() => setCounts(KIT)} className="text-sm font-bold text-blue">Fill the usual kit</button></div>
            <div className="space-y-2.5">
              {KIND_ORDER.map((kind) => (
                <label key={kind} className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">{KIND_LABEL[kind]}</span>
                  <input value={counts[kind]} onChange={(e) => setCounts((c) => ({ ...c, [kind]: e.target.value.replace(/\D/g, "").slice(0, 6) }))} inputMode="numeric" aria-label={KIND_LABEL[kind]} className="h-12 w-24 rounded-xl border border-line bg-raised px-3 text-right text-lg font-bold tabular-nums outline-none focus:border-thumb" />
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-semibold text-muted">Ballot serial from<input value={from} onChange={(e) => setFrom(e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" className="mt-1 h-12 w-full rounded-xl border border-line bg-raised px-3 text-base font-bold text-fg outline-none focus:border-thumb" /></label>
              <label className="block text-xs font-semibold text-muted">to<input value={to} onChange={(e) => setTo(e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" className="mt-1 h-12 w-full rounded-xl border border-line bg-raised px-3 text-base font-bold text-fg outline-none focus:border-thumb" /></label>
            </div>
            {serialMismatch && <p className="text-sm text-amber">The serial range holds {Number(to) - Number(from) + 1} papers, but you entered {counts.ballot_papers}.</p>}
            <Button onClick={() => void sign()} disabled={items.length === 0} className="min-h-14 w-full text-base">Sign: sent to this unit</Button>
          </>
        )}
      </Card>
      <Card>
        <Eyebrow>Sent from this phone</Eyebrow>
        {sent.length === 0 ? <p className="mt-2 text-sm text-muted">None yet.</p> : (
          <ul className="mt-2 divide-y divide-line">
            {sent.slice(0, 12).map((h) => (
              <li key={h.contentHash} className="py-2.5 text-sm"><span className="font-semibold">{h.event.placeCode}</span><span className="block text-xs text-muted">{(h.event.payload as { items: MaterialItem[] }).items.map((i) => `${i.qty} ${KIND_LABEL[i.kind].toLowerCase()}`).join(" · ")}</span></li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
