"use client";
import { useMemo } from "react";
import { generateKeyPair } from "@/lib/core/crypto";
import { signEvent } from "@/lib/core/events";
import type { Identity } from "@/lib/client/store";
import { AgentHome } from "@/components/app/agent-flow";
import { PoHome } from "@/components/app/officer";
import type { ReadResult } from "@/components/app/result-wizard";

// Where each figure is written on /dev/ec8a-sample.png, as fractions of the image.
const col = { x: 0.405, w: 0.2 };
const box = (top: number) => ({ ...col, y: (top + 8) / 1000, h: 0.075 });
const READ: ReadResult = {
  figures: { votes: { APC: 112, LP: 12, PDP: 65, NNPP: 1 }, accredited: 191, rejected: 1, totalValid: 190 },
  boxes: { APC: box(230), LP: box(320), PDP: box(410), NNPP: box(500), totalValid: box(640), rejected: box(730), accredited: box(820) },
  uncertain: ["PDP"],
};

function identity(role: Identity["role"], name: string, party: string | null): Identity {
  const k = generateKeyPair();
  return { role, displayName: name, party, placeCode: "37-01-01-001", placeName: "Ung. Maikano / Kofar Mai Unguwa", publicKeyHex: k.publicKeyHex, secretKeyHex: k.secretKeyHex, actorId: null, createdAt: new Date().toISOString() };
}

export function FlowsDemo({ role, index }: { role: "officer" | "agent"; index: number }) {
  const officer = useMemo(() => identity("presiding_officer", "Halima Bello", null), []);
  const agent = useMemo(() => identity("party_agent", "Ngozi Adeyemi", "PDP"), []);
  const officerEvent = useMemo(
    () =>
      signEvent(
        { id: crypto.randomUUID(), type: "result.declared", placeCode: "37-01-01-001", payload: { figures: READ.figures, readBy: "model" }, occurredAt: new Date().toISOString(), authorKey: officer.publicKeyHex },
        officer.secretKeyHex,
      ),
    [officer],
  );
  return (
    <main className="mx-auto w-full max-w-[390px] flex-1 px-4 py-6">
      <p className="mb-4 rounded-xl border border-amber/40 bg-amber-wash p-2 text-center text-xs font-bold text-amber">DEV ONLY · synthetic sheet · throwaway keys</p>
      {role === "officer" ? (
        <PoHome identity={officer} demo={{ photoUrl: "/dev/ec8a-sample.png", read: READ, index }} />
      ) : (
        <AgentHome identity={agent} startWith={officerEvent} />
      )}
    </main>
  );
}
