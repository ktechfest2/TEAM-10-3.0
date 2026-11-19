"use client";
import { useState } from "react";
import { generateKeyPair } from "@/lib/core/crypto";
import { normaliseRecoveryCode } from "@/lib/core/recovery";
import { saveIdentity, type Identity } from "@/lib/client/store";
import { Button, Card, Eyebrow } from "@/components/ui";

/** Log in on a new phone (or after logging out) with the recovery code shown at sign-up. This phone gets its own key. */
export function Login({ onDone, onBack }: { onDone: (identity: Identity) => void; onBack: () => void }) {
  const [code, setCode] = useState("");
  const [lost, setLost] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const normalised = normaliseRecoveryCode(code);

  async function login() {
    if (!normalised) return;
    setBusy(true);
    setError("");
    const keys = generateKeyPair();
    try {
      const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recoveryCode: normalised, publicKey: keys.publicKeyHex, signOutOthers: lost }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Log in failed");
      const identity: Identity = { role: data.role, displayName: data.displayName, party: data.party, placeCode: data.placeCode, placeName: data.placeName, publicKeyHex: keys.publicKeyHex, secretKeyHex: keys.secretKeyHex, actorId: data.id, createdAt: new Date().toISOString() };
      await saveIdentity(identity);
      onDone(identity);
    } catch (e) {
      setError(e instanceof Error && e.message !== "Failed to fetch" ? e.message : "Logging in needs a connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-muted">‹ Back</button>
      <h1 className="font-display text-2xl font-extrabold">Log in</h1>
      <Card className="space-y-4">
        <label className="block">
          <Eyebrow>Your recovery code</Eyebrow>
          <input value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="characters" autoComplete="off" spellCheck={false} placeholder="XXXX-XXXX-XXXX-XXXX" className="mt-1 min-h-12 w-full rounded-xl border border-line bg-raised px-4 font-mono text-lg outline-none focus:border-thumb" />
          <span className="mt-1 block text-xs text-muted">It was shown once when you signed up. This phone gets its own signature on your account.</span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={lost} onChange={(e) => setLost(e.target.checked)} className="mt-1 h-5 w-5" />
          <span>My other phone is lost or stolen. Sign it out, so it can no longer sign anything for me.</span>
        </label>
        {error && <p role="alert" className="text-sm text-alarm">{error}</p>}
        <Button onClick={() => void login()} disabled={!normalised || busy} className="w-full">{busy ? "Logging in…" : "Log in"}</Button>
      </Card>
    </div>
  );
}
