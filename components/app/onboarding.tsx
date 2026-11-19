"use client";
import { useState } from "react";
import { generateKeyPair } from "@/lib/core/crypto";
import { saveIdentity, type Identity } from "@/lib/client/store";
import { Button, Card, Eyebrow } from "@/components/ui";
import { passwordProblem, usernameProblem } from "@/lib/core/credentials";
import { Login } from "./login";
import { PlaceSearch, type PlaceHit } from "./place-search";
import { ROLE_COLOR } from "@/lib/roles";

/** Plain-language descriptions. The official job titles stay (people at polling units know them), each with who it is and what you do. */
const ROLES: { role: Identity["role"]; title: string; who: string; detail: string; place: PlaceHit["level"][] | null }[] = [
  { role: "citizen", title: "Voter", who: "Anyone who votes", detail: "Look up your polling unit, see who signed its result, and check a message you were sent. No code needed.", place: null },
  { role: "presiding_officer", title: "Presiding officer", who: "In charge of a polling unit", detail: "You record the result from the paper sheet and sign it. Party agents then sign it too.", place: ["pu"] },
  { role: "party_agent", title: "Party agent", who: "Represents a party at a polling unit", detail: "You compare the result with the paper sheet and sign if it is right.", place: ["pu"] },
  { role: "observer", title: "Observer", who: "Watches for an independent group", detail: "You watch the count, check results and report problems.", place: ["pu", "ward"] },
  { role: "collation_officer", title: "Collation officer", who: "Adds up results at a ward or council office", detail: "You enter the totals read out there. Tally checks them against what the polling units signed.", place: ["ward", "lga"] },
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
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const needsInvite = role && role.role !== "citizen";
  const nameProblem = name ? usernameProblem(name) : "x";
  const ready =
    role && !nameProblem && passwordProblem(password) === null && (!role.place || place) && (role.role !== "party_agent" || party) && (!needsInvite || invite);

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
          password,
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
      await saveIdentity(identity);
      onDone(identity);
    } catch (e) {
      setError(e instanceof Error && e.message !== "Failed to fetch" ? e.message : "Setting up needs a connection once. After that, Tally works offline.");
    } finally {
      setBusy(false);
    }
  }

  if (showLogin) return <Login onDone={onDone} onBack={() => setShowLogin(false)} />;

  if (!role) {
    const [voter, ...jobs] = ROLES;
    return (
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-3xl leading-tight font-extrabold">Welcome to Tally</h1>
          <p className="mt-1 text-muted">Check election results, and find out if a message you were sent is true. Pick the one that describes you.</p>
        </div>
        <button onClick={() => setRole(voter!)} className={`block w-full rounded-2xl border border-line border-l-4 bg-surface p-5 text-left hover:brightness-125 ${ROLE_COLOR[voter!.role].border}`}>
          <span className={`block text-xl font-bold ${ROLE_COLOR[voter!.role].text}`}>I am a voter</span>
          <span className="mt-1 block text-[15px] text-muted">{voter!.detail}</span>
        </button>
        <div className="pt-2">
          <p className="text-xs font-bold tracking-[0.14em] text-muted uppercase">I have a job on election day</p>
          <p className="mt-1 text-sm text-muted">These need a code from your party, group or electoral office. If you do not have one yet, ask them.</p>
        </div>
        {jobs.map((r) => (
          <button key={r.role} onClick={() => setRole(r)} className={`block w-full rounded-2xl border border-line border-l-4 bg-card p-4 text-left hover:brightness-125 ${ROLE_COLOR[r.role].border}`}>
            <span className="flex items-start justify-between gap-2">
              <span className={`block font-bold ${ROLE_COLOR[r.role].text}`}>{r.title}</span>
              <span className="shrink-0 rounded-full bg-raised px-2 py-0.5 text-[11px] font-bold text-muted">Needs a code</span>
            </span>
            <span className="block text-sm font-semibold">{r.who}</span>
            <span className="mt-0.5 block text-sm text-muted">{r.detail}</span>
          </button>
        ))}
        <button onClick={() => setShowLogin(true)} className="block w-full rounded-2xl border border-line p-4 text-center text-sm font-bold text-blue">I already have an account · Log in</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={() => setRole(null)} className="text-sm text-muted">‹ Back</button>
      <div>
        <h1 className="font-display text-2xl font-extrabold">{role.role === "citizen" ? "Create your account" : `Create your account as ${role.title.toLowerCase() === "observer" ? "an observer" : `a ${role.title.toLowerCase()}`}`}</h1>
        <p className="mt-1 text-sm text-muted">{role.who}. {role.role === "citizen" ? "" : role.detail}</p>
      </div>
      <Card className="space-y-4">
        <label className="block">
          <Eyebrow>Your full name</Eyebrow>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="mt-1 min-h-12 w-full rounded-xl border border-line bg-paper px-4 outline-none focus:border-ink" />
          {name && nameProblem && <span className="mt-1 block text-xs text-muted">{nameProblem}</span>}
        </label>
        {role.role === "party_agent" && (
          <div>
            <Eyebrow>Which party do you represent?</Eyebrow>
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
            <Eyebrow>{role.place.includes("pu") ? "Your polling unit" : "Your ward or council office"}</Eyebrow>
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
                <PlaceSearch onPick={setPlace} levels={role.place} placeholder={role.place.length === 1 && role.place[0] === "pu" ? "Type the name of your polling unit" : role.place.includes("pu") ? "Type the name of your polling unit or ward" : "Type the name of your ward or council"} />
              )}
            </div>
          </div>
        )}
        {needsInvite && (
          <label className="block">
            <Eyebrow>Code from your party or group</Eyebrow>
            <input value={invite} onChange={(e) => setInvite(e.target.value.toUpperCase())} className="mt-1 min-h-12 w-full rounded-xl border border-line bg-paper px-4 font-mono outline-none focus:border-ink" />
            <span className="mt-1 block text-xs text-muted">Ask your party, group or electoral office for this code. It shows that you are who you say you are.</span>
          </label>
        )}
        <div className="space-y-3 border-t border-line pt-4">
          <p className="text-xs text-muted">You will log back in with your name and this password, on another phone or after logging out.</p>
          <label className="block">
            <Eyebrow>Password (6 or more characters)</Eyebrow>
            <span className="mt-1 flex gap-2">
              <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="password" className="min-h-12 w-full rounded-xl border border-line bg-paper px-4 outline-none focus:border-ink" />
              <button type="button" onClick={() => setShowPassword((s) => !s)} className="shrink-0 rounded-xl border border-line px-3 text-sm font-bold">{showPassword ? "Hide" : "Show"}</button>
            </span>
          </label>
        </div>
        {error && <p className="text-sm text-disputed">{error}</p>}
        <Button onClick={finish} disabled={!ready || busy} className="w-full">
          {busy ? "Creating your account…" : "Create my account"}
        </Button>
      </Card>
    </div>
  );
}
