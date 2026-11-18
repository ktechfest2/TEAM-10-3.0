"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { signEvent, verifyCosignature, type EventType, type ResultFigures, type SignedEvent } from "@/lib/core/events";
import { decodeQr, encodeEventQr } from "@/lib/core/qr";
import { enqueue, holdEvent, listHeld, type HeldEvent, type Identity } from "@/lib/client/store";
import { nameOf, partyOf, rememberName, rememberParty } from "@/lib/client/parties";
import { QrCodeView, QrScanner } from "@/components/qr";
import { Seal, type SealState } from "@/components/seal";
import { Button, Card, Chip, Eyebrow } from "@/components/ui";
import { ResultWizard, type ReadResult } from "./result-wizard";

const STEPS = ["Open", "Result", "Seal", "Upload"];

export function PoHome({ identity, demo }: { identity: Identity; demo?: { photoUrl: string; read: ReadResult; index?: number } }) {
  const place = identity.placeCode!;
  const [held, setHeld] = useState<HeldEvent[]>([]);
  const reload = useCallback(
    () => void listHeld().then((all) => setHeld(all.filter((h) => h.event.placeCode === place && h.event.authorKey === identity.publicKeyHex))),
    [place, identity.publicKeyHex],
  );
  useEffect(reload, [reload]);

  const byType = (t: EventType) => held.filter((h) => h.event.type === t);
  const opened = byType("pu.opened")[0] ?? (demo ? ({} as HeldEvent) : undefined);
  const result = byType("result.declared")[0];
  const attempts = byType("transmission.attempted");
  const [certifying, setCertifying] = useState<string | null>(null);

  async function record(type: EventType, payload: unknown) {
    const event = signEvent({ id: crypto.randomUUID(), type, placeCode: place, payload, occurredAt: new Date().toISOString(), authorKey: identity.publicKeyHex }, identity.secretKeyHex);
    await holdEvent(event, []);
    await enqueue({ event });
    reload();
  }

  const parties = result ? [...new Set(result.cosignatures.map((c) => partyOf(c.witnessKey)).filter((p): p is string => Boolean(p)))] : [];
  const step = !opened ? 0 : !result ? 1 : parties.length < 2 ? 2 : 3;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold">Step {Math.min(step + 1, 4)} of 4 · {STEPS[Math.min(step, 3)]}</span>
          <Chip tone="amber">Saved on this phone</Chip>
        </div>
        <div className="mt-2 flex gap-1.5" aria-hidden="true">
          {STEPS.map((s, i) => (
            <i key={s} className={`h-1.5 flex-1 rounded-full ${i < step ? "bg-sealed" : i === step ? "bg-fg" : "bg-line"}`} />
          ))}
        </div>
      </div>

      <div>
        <Eyebrow>Your polling unit</Eyebrow>
        <h2 className="font-display mt-1 text-2xl leading-tight font-extrabold tracking-tight">{identity.placeName}</h2>
        <p className="hash mt-1 text-muted">{place}</p>
      </div>

      {!opened && (
        <Card className="space-y-4">
          <h3 className="font-display text-2xl font-extrabold tracking-tight">Open the polling unit</h3>
          <p className="text-sm text-muted">This signed record tells voters and supervisors that voting has started. Do it when you open.</p>
          <Button onClick={() => void record("pu.opened", { text: "Polling unit opened" })} className="min-h-14 w-full text-base">Sign: the polling unit is open</Button>
        </Card>
      )}

      {opened && !result && (
        <ResultWizard
          initial={demo}
          onSign={(figures: ResultFigures, photoSha256, readBy) => void record("result.declared", { figures, photoSha256, readBy })}
        />
      )}

      {result && <SealStep result={result} parties={parties} onChange={reload} />}

      {result && (
        <Card className="space-y-3">
          <Eyebrow>Step 4 · IReV upload</Eyebrow>
          <p className="text-sm text-muted">Record each attempt to upload the sheet to IReV. Rival agents can see whether a claimed failure really happened.</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => void record("transmission.attempted", { outcome: "success" })}>Upload worked</Button>
            <Button variant="secondary" onClick={() => void record("transmission.attempted", { outcome: "failed", detail: "BVAS upload failed" })}>Upload failed</Button>
          </div>
          {attempts.length > 0 && (
            <ul className="divide-y divide-line text-sm">
              {attempts.map((a) => {
                const failed = (a.event.payload as { outcome: string }).outcome !== "success";
                return (
                  <li key={a.contentHash} className="py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={failed ? "text-alarm" : "text-sealed"}>{failed ? "Failed" : "Uploaded"}</span>
                      <span className="flex items-center gap-3 text-muted">
                        {new Date(a.event.occurredAt).toLocaleTimeString()}
                        {failed && (
                          <button type="button" onClick={() => setCertifying((c) => (c === a.contentHash ? null : a.contentHash))} className="font-bold text-blue">
                            {certifying === a.contentHash ? "Hide code" : "Have agents certify"}
                          </button>
                        )}
                      </span>
                    </div>
                    {failed && certifying === a.contentHash && (
                      <div className="mt-3 flex flex-col items-center gap-2">
                        <QrCodeView value={encodeEventQr(a.event)} label="Agents scan this if they saw the upload fail, and sign" />
                        <p className="text-center text-xs text-muted">A failure only you report is a claim. When agents of two rival parties sign it, it is certified on the public page.</p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      {result && (
        <div className="space-y-2 text-center text-sm font-bold">
          <Link href={`/p/${place}`} className="block text-thumb">See the public page ›</Link>
          <Link href={`/poster/${place}`} className="block text-blue">Print the poster for the wall ›</Link>
        </div>
      )}
    </div>
  );
}

function SealStep({ result, parties, onChange }: { result: HeldEvent; parties: string[]; onChange: () => void }) {
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState("");
  const state: SealState = parties.length >= 2 ? "sealed" : parties.length === 1 ? "witnessed" : "none";

  const onScan = useCallback(
    async (text: string) => {
      setScanning(false);
      const msg = decodeQr(text);
      if (!msg || msg.k !== "cs") return setMessage("That is not an agent's Tally signature.");
      if (msg.c.contentHash !== result.contentHash) return setMessage("That signature is for a different result.");
      if (!verifyCosignature(msg.c)) return setMessage("The signature check failed. Ask the agent to sign again.");
      rememberParty(msg.c.witnessKey, msg.p);
      rememberName(msg.c.witnessKey, msg.n);
      await holdEvent(result.event as SignedEvent, [msg.c]);
      await enqueue({ cosignatures: [msg.c] });
      setMessage(`${msg.p ?? "An agent"} signed.`);
      onChange();
    },
    [result, onChange],
  );

  return (
    <Card className="space-y-4">
      <div className={`flex items-center gap-4 rounded-2xl border p-3 transition-colors ${state === "sealed" ? "border-sealed" : "border-line"}`}>
        <Seal state={state} signed={parties} className="h-[62px] w-24 shrink-0" />
        <div>
          <div className={`text-[11px] font-extrabold tracking-widest uppercase ${state === "sealed" ? "text-sealed" : state === "witnessed" ? "text-amber" : "text-muted"}`}>
            {state === "sealed" ? "Sealed" : state === "witnessed" ? "Witnessed" : "Waiting"}
          </div>
          <div className="font-display text-xl leading-tight font-extrabold">
            {state === "sealed" ? `${parties.length} rival parties signed` : state === "witnessed" ? "1 party has signed" : "Agents are signing"}
          </div>
          <div className="text-xs text-muted">{state === "sealed" ? "More signatures make it stronger." : "Two rival parties seal it."}</div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        {scanning ? <QrScanner onResult={(t) => void onScan(t)} /> : <QrCodeView value={encodeEventQr(result.event)} label="Agents scan this, check the wall, and sign" />}
      </div>

      <ul className="space-y-2">
        {result.cosignatures.map((c) => (
          <li key={c.witnessKey} className="flex items-center gap-3 rounded-2xl border border-line bg-raised px-3 py-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-fg text-[10px] font-bold text-bg">{partyOf(c.witnessKey) ?? "—"}</span>
            <span className="flex-1 text-sm font-semibold">{nameOf(c.witnessKey) ?? "Witness"}</span>
            <span className="text-xs text-muted">{new Date(c.signedAt).toLocaleTimeString()}</span>
            <span className="text-sealed" aria-label="signed">✓</span>
          </li>
        ))}
        {parties.length < 2 && (
          <li className="flex items-center gap-3 rounded-2xl border border-dashed border-line px-3 py-2 text-sm text-muted">Waiting for {parties.length === 0 ? "the first agent" : "a rival party"}…</li>
        )}
      </ul>

      <Button variant="secondary" onClick={() => setScanning((s) => !s)} className="w-full">{scanning ? "Show the result code again" : "Scan an agent's signature"}</Button>
      {message && <p className="text-sm" role="status">{message}</p>}
    </Card>
  );
}
