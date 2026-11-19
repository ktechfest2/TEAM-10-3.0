"use client";
import { useState } from "react";
import { generateKeyPair } from "@/lib/core/crypto";
import { saveIdentity, type Identity } from "@/lib/client/store";
import { Button, Card, Eyebrow } from "@/components/ui";
import { Login } from "./login";
import { PlaceSearch, type PlaceHit } from "./place-search";
import { ROLE_COLOR } from "@/lib/roles";

const ROLES: { role: Identity["role"]; title: string; detail: string; place: PlaceHit["level"][] | null }[] = [
  { role: "citizen", title: "Voter", detail: "Check your polling unit, its result and whether a rumour is true.", place: null },
  { role: "presiding_officer", title: "Presiding officer", detail: "Open the unit, record the EC8A result, collect agents' signatures.", place: ["pu"] },
  { role: "party_agent", title: "Party agent", detail: "Check the figures against the sheet and sign the result yourself.", place: ["pu"] },
  { role: "observer", title: "Observer", detail: "Independent witness for results and incidents.", place: ["pu", "ward"] },
  { role: "collation_officer", title: "Collation officer", detail: "Enter ward or area council collation; Tally checks it against sealed units.", place: ["ward", "lga"] },
];

const PARTIES = ["APC", "LP", "PDP", "NNPP", "ADC", "APGA", "SDP", "YPP"];

export function Onboarding({ onDone }: { onDone: (identity: Identity) => void }) {
  const [role, setRole] = useState<(typeof ROLES)[number] | null>(null);
  const [name, setName] = useState("");
  const [party, setParty] = useState("");
  const [place, setPlace] = useState<PlaceHit | null>(null);
  const [invite, setInvite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [saved, setSaved] = useState<{ code: string; identity: Identity } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  const needsInvite = role && role.role !== "citizen";
  const ready = role && name.trim().length >= 2 && (!role.place || place) && (role.role !== "party_agent" || party) && (!needsInvite || invite);

  async function finish() {
    if (!role || !ready) return;
    setBusy(true);
    setError("");
    const keys = generateKeyPair();
    try {
      const res = await fetch("/api/actors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: role.role,
          displayName: name.trim(),
          party: role.role === "party_agent" ? party : null,
          publicKey: keys.publicKeyHex,
          placeCode: place?.code ?? null,
          inviteCode: invite || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Registration failed");
      const identity: Identity = {
        role: role.role,
        displayName: name.trim(),
        party: role.role === "party_agent" ? party : null,
        placeCode: place?.code ?? null,
        placeName: place?.name ?? null,
        publicKeyHex: keys.publicKeyHex,
        secretKeyHex: keys.secretKeyHex,
        actorId: data.id,
        createdAt: new Date().toISOString(),
      };
      // The recovery code is shown once. The identity is kept on this phone only after the person says they have saved it,
      // so closing the page here never leaves an account nobody can get back into.
      if (data.recoveryCode) return setSaved({ code: data.recoveryCode, identity });
      await saveIdentity(identity);
      onDone(identity);
    } catch (e) {
      setError(e instanceof Error && e.message !== "Failed to fetch" ? e.message : "Setting up needs a connection once. After that, Tally works offline.");
    } finally {
      setBusy(false);
    }
  }

  if (saved) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-extrabold">Keep your recovery code</h1>
        <Card className="space-y-4">
          <p className="text-sm text-muted">This is the only way to log back in if you lose this phone, clear your browser or use another phone. We cannot show it again.</p>
          <p className="rounded-xl bg-raised p-4 text-center font-mono text-xl font-bold whitespace-nowrap select-all" aria-label="Recovery code">{saved.code}</p>
          <Button variant="secondary" onClick={() => void navigator.clipboard.writeText(saved.code).then(() => setCopied(true)).catch(() => setCopied(false))} className="w-full">{copied ? "Copied" : "Copy the code"}</Button>
          <p className="text-xs text-muted">Write it down or take a screenshot. Anyone with this code can log in as you, so do not share it.</p>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1 h-5 w-5" />
            <span>I have saved my recovery code.</span>
          </label>
          <Button onClick={() => void saveIdentity(saved.identity).then(() => onDone(saved.identity))} disabled={!confirmed} className="w-full">Continue</Button>
        </Card>
      </div>
    );
  }

  if (showLogin) return <Login onDone={onDone} onBack={() => setShowLogin(false)} />;

  if (!role) {
    return (
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold">Who are you on election day?</h1>
          <p className="mt-1 text-sm text-muted">Tally creates your personal signature on this phone. It never leaves the phone.</p>
        </div>
        {ROLES.map((r) => (
          <button key={r.role} onClick={() => setRole(r)} className={`block w-full rounded-2xl border border-line border-l-4 bg-card p-4 text-left hover:brightness-125 ${ROLE_COLOR[r.role].border}`}>
            <span className={`block font-bold ${ROLE_COLOR[r.role].text}`}>{r.title}</span>
            <span className="mt-0.5 block text-sm text-muted">{r.detail}</span>
          </button>
        ))}
        <button onClick={() => setShowLogin(true)} className="block w-full rounded-2xl border border-line p-4 text-center text-sm font-bold text-blue">I already have an account · Log in</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={() => setRole(null)} className="text-sm text-muted">‹ Change role</button>
      <h1 className="text-2xl font-bold">{role.title}</h1>
      <Card className="space-y-4">
        <label className="block">
          <Eyebrow>Your name</Eyebrow>
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 min-h-12 w-full rounded-xl border border-line bg-paper px-4 outline-none focus:border-ink" />
        </label>
        {role.role === "party_agent" && (
          <div>
            <Eyebrow>Your party</Eyebrow>
            <div className="mt-2 flex flex-wrap gap-2">
              {PARTIES.map((p) => (
                <button key={p} onClick={() => setParty(p)} className={`min-h-11 rounded-xl border px-4 text-sm font-semibold ${party === p ? "border-ink bg-ink text-paper" : "border-line bg-paper"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        {role.place && (
          <div>
            <Eyebrow>{role.place.includes("pu") ? "Your polling unit" : "Where you collate"}</Eyebrow>
            <div className="mt-2">
              {place ? (
                <div className="flex items-center justify-between rounded-xl bg-paper px-4 py-3">
                  <span>
                    <span className="block font-medium">{place.name}</span>
                    <span className="block text-xs text-muted">{place.code}</span>
                  </span>
                  <button onClick={() => setPlace(null)} className="text-sm text-muted">Change</button>
                </div>
              ) : (
                <PlaceSearch onPick={setPlace} levels={role.place} />
              )}
            </div>
          </div>
        )}
        {needsInvite && (
          <label className="block">
            <Eyebrow>Invite code from your organisation</Eyebrow>
            <input value={invite} onChange={(e) => setInvite(e.target.value.toUpperCase())} className="mt-1 min-h-12 w-full rounded-xl border border-line bg-paper px-4 font-mono outline-none focus:border-ink" />
            <span className="mt-1 block text-xs text-muted">Parties, observer groups and INEC issue codes to their own people.</span>
          </label>
        )}
        {error && <p className="text-sm text-disputed">{error}</p>}
        <Button onClick={finish} disabled={!ready || busy} className="w-full">
          {busy ? "Creating your signature…" : "Create my signature"}
        </Button>
      </Card>
    </div>
  );
}
