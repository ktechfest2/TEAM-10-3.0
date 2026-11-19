"use client";
import { useState } from "react";
import { generateKeyPair } from "@/lib/core/crypto";
import { normaliseUsername } from "@/lib/core/credentials";
import { saveIdentity, type Identity } from "@/lib/client/store";
import { Button, Card, Eyebrow } from "@/components/ui";

/** Log in on a new phone (or after logging out). This phone gets its own signature on your account. */
export function Login({ onDone, onBack }: { onDone: (identity: Identity) => void; onBack: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [lost, setLost] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ready = normaliseUsername(username).length >= 2 && password.length > 0;

  async function login() {
    if (!ready) return;
    setBusy(true);
    setError("");
    const keys = generateKeyPair();
    try {
      const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password, publicKey: keys.publicKeyHex, signOutOthers: lost }) });
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
          <Eyebrow>Your name</Eyebrow>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="name" spellCheck={false} placeholder="your name" className="mt-1 min-h-12 w-full rounded-xl border border-line bg-raised px-4 outline-none focus:border-thumb" />
        </label>
        <label className="block">
          <Eyebrow>Password</Eyebrow>
          <span className="mt-1 flex gap-2">
            <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="password" className="min-h-12 w-full rounded-xl border border-line bg-raised px-4 outline-none focus:border-thumb" />
            <button type="button" onClick={() => setShowPassword((s) => !s)} className="shrink-0 rounded-xl border border-line px-3 text-sm font-bold">{showPassword ? "Hide" : "Show"}</button>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={lost} onChange={(e) => setLost(e.target.checked)} className="mt-1 h-5 w-5" />
          <span>My other phone is lost or stolen. Sign it out, so it can no longer sign anything for me.</span>
        </label>
        {error && <p role="alert" className="text-sm text-alarm">{error}</p>}
        <Button onClick={() => void login()} disabled={!ready || busy} className="w-full">{busy ? "Logging in…" : "Log in"}</Button>
      </Card>
    </div>
  );
}
