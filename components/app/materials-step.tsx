"use client";
import { useCallback, useEffect, useState } from "react";
import { signEvent, verifyCosignature, type MaterialKind, type SignedEvent } from "@/lib/core/events";
import { compareMaterials, KIND_LABEL, KIND_ORDER, type MaterialItem } from "@/lib/core/materials";
import { decodeQr, encodeEventQr } from "@/lib/core/qr";
import { enqueue, holdEvent, type HeldEvent, type Identity } from "@/lib/client/store";
import { rememberName, rememberParty } from "@/lib/client/parties";
import { QrCodeView, QrScanner } from "@/components/qr";
import { Icon } from "@/components/icons";
import { Button, Card, Chip, Eyebrow } from "@/components/ui";

type Expected = { dispatched: { items: MaterialItem[]; at: string; by: string } | null } | "offline" | null;

/** The officer signs for the materials that arrived, against what was dispatched. Rival agents then see the same counts and co-sign. */
export function MaterialsStep({ identity, received, onChange }: { identity: Identity; received?: HeldEvent; onChange: () => void }) {
  const place = identity.placeCode!;
  const [expected, setExpected] = useState<Expected>(null);
  const [counts, setCounts] = useState<Record<MaterialKind, string>>({ ballot_papers: "", ballot_boxes: "", result_sheets: "", bvas: "" });
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let live = true;
    fetch(`/api/materials/${place}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((d: { dispatched: { items: MaterialItem[]; at: string; by: string } | null }) => {
        if (!live) return;
        setExpected(d);
        // Start from what was sent: the officer changes only what does not match.
        if (d.dispatched) setCounts(Object.fromEntries(KIND_ORDER.map((k) => [k, String(d.dispatched!.items.find((i) => i.kind === k)?.qty ?? "")])) as Record<MaterialKind, string>);
      })
      .catch(() => live && setExpected("offline"));
    return () => {
      live = false;
    };
  }, [place]);

  const sent = expected && expected !== "offline" ? expected.dispatched : null;
  const items: MaterialItem[] = KIND_ORDER.flatMap((kind) => {
    const v = counts[kind];
    if (v === "" || !/^\d+$/.test(v)) return [];
    const base = sent?.items.find((i) => i.kind === kind);
    return [{ kind, qty: Number(v), ...(base?.serialFrom ? { serialFrom: base.serialFrom, serialTo: base.serialTo } : {}) }];
  });
  const cmp = compareMaterials(sent?.items ?? null, items.length ? items : null);

  async function sign() {
    const ev = signEvent({ id: crypto.randomUUID(), type: "material.received", placeCode: place, payload: { items }, occurredAt: new Date().toISOString(), authorKey: identity.publicKeyHex }, identity.secretKeyHex);
    await holdEvent(ev, []);
    await enqueue({ event: ev });
    onChange();
  }

  const onScan = useCallback(
    async (text: string) => {
      setScanning(false);
      if (!received) return;
      const msg = decodeQr(text);
      if (!msg || msg.k !== "cs") return setMessage("That is not an agent's signature code.");
      if (msg.c.contentHash !== received.contentHash) return setMessage("That signature is for something else.");
      if (!verifyCosignature(msg.c)) return setMessage("The signature check failed. Ask the agent to sign again.");
      rememberParty(msg.c.witnessKey, msg.p);
      rememberName(msg.c.witnessKey, msg.n);
      await holdEvent(received.event as SignedEvent, [msg.c]);
      await enqueue({ cosignatures: [msg.c] });
      setMessage(`${msg.p ?? "An agent"} signed.`);
      onChange();
    },
    [received, onChange],
  );

  if (received) {
    const got = (received.event.payload as { items: MaterialItem[] }).items;
    const r = compareMaterials(sent?.items ?? null, got);
    return (
      <Card className="space-y-3">
        <div className="flex items-center justify-between"><Eyebrow>Materials</Eyebrow><Chip tone={r.state === "ok" ? "sealed" : "amber"}>{r.state === "ok" ? "Signed for · all match" : r.state === "differs" ? "Signed for · differences" : "Signed for"}</Chip></div>
        <ul className="divide-y divide-line text-sm">
          {r.lines.map((l) => (
            <li key={l.kind} className="flex items-center justify-between py-2">
              <span>{l.label}</span>
              <span className={`font-bold tabular-nums ${l.state === "ok" ? "text-sealed" : l.state === "waiting" ? "" : "text-amber"}`}>{l.got}{l.state === "short" && l.diff !== null ? ` (${Math.abs(l.diff)} short)` : ""}{l.state === "over" && l.diff !== null ? ` (${l.diff} more)` : ""}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">Party agents who see the materials arrive can co-sign. Show them this code.</p>
        <div className="flex flex-col items-center gap-2">
          {scanning ? <QrScanner onResult={(t) => void onScan(t)} /> : <QrCodeView level="L" value={encodeEventQr(received.event)} label="Agents scan this to confirm the materials" />}
        </div>
        {received.cosignatures.length > 0 && <p className="flex items-center gap-1.5 text-sm font-bold text-sealed"><Icon name="check" size={16} />{received.cosignatures.length} agent{received.cosignatures.length === 1 ? "" : "s"} signed</p>}
        <Button variant="secondary" onClick={() => setScanning((s) => !s)} className="w-full">{scanning ? "Show the code again" : "Scan an agent's signature"}</Button>
        {message && <p className="text-sm" role="status">{message}</p>}
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between"><Eyebrow>Before you open · materials</Eyebrow>{sent && <Chip tone="sealed">Sent {new Date(sent.at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}</Chip>}</div>
      <h3 className="font-display text-2xl font-extrabold tracking-tight">Count what arrived</h3>
      {expected === "offline" && <p className="rounded-xl bg-amber-wash p-3 text-sm text-amber">No connection, so what was sent cannot be shown. Count what you have and sign; it is compared when the phone is online.</p>}
      {expected && expected !== "offline" && !sent && <p className="rounded-xl bg-amber-wash p-3 text-sm text-amber">Nothing is recorded as sent to this unit. Count what you have and sign.</p>}
      <div className="space-y-2.5">
        {KIND_ORDER.map((kind) => {
          const line = cmp.lines.find((l) => l.kind === kind);
          return (
            <label key={kind} className="flex items-center justify-between gap-3">
              <span className="text-sm"><span className="font-semibold">{KIND_LABEL[kind]}</span>{sent?.items.find((i) => i.kind === kind) && <span className="block text-xs text-muted">Sent: {sent.items.find((i) => i.kind === kind)!.qty}</span>}</span>
              <span className="text-right">
                <input value={counts[kind]} onChange={(e) => setCounts((c) => ({ ...c, [kind]: e.target.value.replace(/\D/g, "").slice(0, 6) }))} inputMode="numeric" aria-label={`${KIND_LABEL[kind]} received`} className={`h-12 w-24 rounded-xl border bg-raised px-3 text-right text-lg font-bold tabular-nums outline-none focus:border-thumb ${line && (line.state === "short" || line.state === "over") ? "border-amber text-amber" : "border-line"}`} />
                {line && line.state === "short" && line.diff !== null && <span className="block text-[11px] font-extrabold text-amber">{Math.abs(line.diff)} short</span>}
                {line && line.state === "over" && line.diff !== null && <span className="block text-[11px] font-extrabold text-amber">{line.diff} more</span>}
              </span>
            </label>
          );
        })}
      </div>
      <Button onClick={() => void sign()} disabled={items.length === 0} className="min-h-14 w-full text-base">{cmp.state === "differs" ? "Sign: received, with differences" : "Sign: all received"}</Button>
    </Card>
  );
}
