"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { cosign, verifySignedEvent, type ResultFigures, type SignedEvent } from "@/lib/core/events";
import { decodeQr, encodeCosignatureQr } from "@/lib/core/qr";
import { checkResultArithmetic } from "@/lib/core/results";
import { enqueue, holdEvent, listHeld, type HeldEvent, type Identity } from "@/lib/client/store";
import { HoldToSign } from "@/components/hold-to-sign";
import { QrCodeView, QrScanner } from "@/components/qr";
import { Seal } from "@/components/seal";
import { Button, Card, Chip, Eyebrow, FigureTile } from "@/components/ui";

type View = "home" | "scan" | "review" | "signed";

/** Agents and observers: scan the officer's code, compare with the wall, hold to sign, keep a signed copy. */
export function AgentHome({ identity, startWith }: { identity: Identity; startWith?: SignedEvent }) {
  const [view, setView] = useState<View>(startWith ? "review" : "home");
  const [pending, setPending] = useState<SignedEvent | null>(startWith ?? null);
  const [sigQr, setSigQr] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [held, setHeld] = useState<HeldEvent[]>([]);
  const role = identity.party ? `${identity.party} agent` : "Observer";

  const reload = useCallback(() => void listHeld().then(setHeld), []);
  useEffect(reload, [reload]);

  const onScan = useCallback((text: string) => {
    const msg = decodeQr(text);
    if (!msg || msg.k !== "ev") {
      setError(msg ? "That is a signature code. Scan the result code on the presiding officer's phone." : "That is not a code this version of Tally can read. Close and reopen Tally on both phones, then scan again.");
      return setView("home");
    }
    const check = verifySignedEvent(msg.e);
    if (!check.ok) {
      setError(`Do not sign: ${check.reason}.`);
      return setView("home");
    }
    setError("");
    setPending(msg.e);
    setView("review");
  }, []);

  async function sign() {
    if (!pending) return;
    const c = cosign(pending.contentHash, identity.secretKeyHex, identity.publicKeyHex, new Date().toISOString());
    await holdEvent(pending, [c]);
    // This phone also carries the officer's signed event, so whichever phone finds a network first delivers it.
    await enqueue({ event: pending, cosignatures: [c] });
    setSigQr(encodeCosignatureQr(c, identity.displayName, identity.party));
    setView("signed");
    reload();
  }

  if (view === "scan") {
    return (
      <Card className="space-y-3">
        <h2 className="font-display text-2xl font-extrabold tracking-tight">Scan the officer&apos;s result code</h2>
        <QrScanner onResult={onScan} />
        <Button variant="secondary" onClick={() => setView("home")} className="w-full">Cancel</Button>
      </Card>
    );
  }

  if (view === "review" && pending && pending.type === "transmission.attempted") {
    const attempt = pending.payload as { outcome: string; detail?: string };
    return (
      <div className="space-y-3">
        <Chip tone="sealed">✓ Officer&apos;s signature checked on this phone</Chip>
        <div>
          <p className="text-sm text-muted">Unit {pending.placeCode}</p>
          <h2 className="font-display mt-1 text-3xl leading-tight font-extrabold tracking-tight">Did you see the upload fail?</h2>
        </div>
        <p className="rounded-2xl border border-line bg-surface p-4 text-sm">
          The officer reports that the upload to IReV {attempt.outcome === "failed" ? "failed" : "worked"} at {new Date(pending.occurredAt).toLocaleTimeString()}.
          {attempt.detail ? ` “${attempt.detail}”` : ""}
        </p>
        <p className="text-sm text-muted">Your signature says: <i>&quot;I was there and saw this attempt {attempt.outcome === "failed" ? "fail" : "work"}.&quot;</i> Sign only if that is true.</p>
        <HoldToSign ariaLabel={`Press and hold to sign as ${role}`} onComplete={() => void sign()} />
        <Button variant="danger" onClick={() => { setPending(null); setView("home"); }} className="w-full">I did not see this. Do not sign.</Button>
      </div>
    );
  }

  if (view === "review" && pending && pending.type === "result.declared") {
    const figures = (pending.payload as { figures: ResultFigures }).figures;
    const issues = checkResultArithmetic(figures);
    return (
      <div className="space-y-3">
        <Chip tone="sealed">✓ Officer&apos;s signature checked on this phone</Chip>
        <div>
          <p className="text-sm text-muted">Unit {pending.placeCode}</p>
          <h2 className="font-display mt-1 text-3xl leading-tight font-extrabold tracking-tight">Do these match the sheet on the wall?</h2>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {Object.entries(figures.votes).map(([p, v]) => (
            <FigureTile key={p} label={p} value={v} />
          ))}
        </div>
        <div className="flex justify-between px-1 text-sm text-muted">
          <span>Valid <b className="text-fg">{figures.totalValid}</b></span>
          <span>Rejected <b className="text-fg">{figures.rejected}</b></span>
          <span>Accredited <b className="text-fg">{figures.accredited}</b></span>
        </div>
        {issues.length > 0 && (
          <ul className="space-y-1 rounded-2xl border border-alarm/50 bg-alarm-wash p-3 text-sm text-alarm">
            {issues.map((i) => (
              <li key={i.code}>⚠ {i.message}</li>
            ))}
          </ul>
        )}
        <p className="text-sm text-muted">Your signature says: <i>&quot;These are the figures on the sheet I saw.&quot;</i></p>
        <HoldToSign ariaLabel={`Press and hold to sign as ${role}`} onComplete={() => void sign()} />
        <Button variant="danger" onClick={() => { setPending(null); setView("home"); }} className="w-full">They don&apos;t match. Do not sign.</Button>
      </div>
    );
  }

  if (view === "signed" && sigQr && pending) {
    return (
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <Eyebrow>{role}</Eyebrow>
          <Chip tone="sealed">Signed</Chip>
        </div>
        <h2 className="font-display text-3xl font-extrabold tracking-tight">You signed</h2>
        <div className="flex flex-col items-center gap-1 rounded-2xl border border-sealed bg-surface p-4">
          <Seal state="witnessed" signed={[identity.party ?? "OBS"]} className="h-24 w-36" />
          <p className="text-sm text-muted">Your stroke is on the tally.</p>
        </div>
        <QrCodeView level="L" value={sigQr} label="Show this to the presiding officer, who scans it" />
        <p className="text-sm text-muted">Saved on your phone. Sent when you have a network.</p>
        <Button variant="secondary" onClick={() => { setPending(null); setView("home"); }} className="w-full">Done</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <Eyebrow>{role}</Eyebrow>
        <h2 className="font-display text-2xl leading-tight font-extrabold tracking-tight">{identity.placeName}</h2>
        <p className="text-sm text-muted">Scan the officer&apos;s code, compare with the wall sheet, hold to sign.</p>
        <Button onClick={() => setView("scan")} className="min-h-14 w-full text-base">Scan result to sign</Button>
        {error && <p className="text-sm text-alarm" role="alert">{error}</p>}
      </Card>
      <Card>
        <Eyebrow>Signed copies on this phone</Eyebrow>
        {held.length === 0 ? (
          <p className="mt-2 text-sm text-muted">None yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {held.map((h) => (
              <li key={h.contentHash} className="flex items-center justify-between py-2.5 text-sm">
                <span>
                  <span className="font-semibold">{h.event.placeCode}</span>
                  <span className="block text-xs text-muted">{new Date(h.event.occurredAt).toLocaleString()}</span>
                </span>
                <Link href={`/p/${h.event.placeCode}`} className="font-bold text-thumb">View ›</Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
