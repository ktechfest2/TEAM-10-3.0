"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { clearIdentity, listOutbox, loadIdentity, type Identity, type OutboxItem } from "@/lib/client/store";
import { flushOutbox, startAutoSync } from "@/lib/client/sync";
import { AgentHome } from "./agent-flow";
import { CitizenHome } from "./citizen";
import { CollationHome } from "./collation";
import { Onboarding } from "./onboarding";
import { PoHome } from "./officer";

const ROLE_LABEL: Record<Identity["role"], string> = {
  citizen: "Voter",
  presiding_officer: "Presiding officer",
  party_agent: "Party agent",
  observer: "Observer",
  community_leader: "Community leader",
  collation_officer: "Collation officer",
  logistics: "Logistics",
};

export function TallyApp() {
  const [identity, setIdentity] = useState<Identity | null | undefined>(undefined);
  const [outbox, setOutbox] = useState<OutboxItem[]>([]);
  const online = useSyncExternalStore(
    (notify) => {
      window.addEventListener("online", notify);
      window.addEventListener("offline", notify);
      return () => {
        window.removeEventListener("online", notify);
        window.removeEventListener("offline", notify);
      };
    },
    () => navigator.onLine,
    () => true,
  );

  const refresh = useCallback(() => void listOutbox().then(setOutbox), []);

  useEffect(() => {
    loadIdentity().then(setIdentity);
    window.addEventListener("tally:outbox", refresh);
    const stop = startAutoSync(refresh);
    refresh();
    return () => {
      window.removeEventListener("tally:outbox", refresh);
      stop();
    };
  }, [refresh]);

  const pending = outbox.filter((i) => i.status === "pending").length;
  const rejected = outbox.filter((i) => i.status === "rejected");

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-4 pb-16">
      <header className="sticky top-0 z-10 -mx-4 mb-4 flex items-center justify-between border-b border-line bg-paper/95 px-4 py-3 backdrop-blur">
        <Link href="/" className="text-lg font-black tracking-tight">Tally</Link>
        <div className="flex items-center gap-2 text-xs">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${online ? "bg-sealed-wash text-sealed" : "bg-witnessed-wash text-witnessed"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-sealed" : "bg-witnessed"}`} />
            {online ? "Online" : "Offline"}
          </span>
          {pending > 0 && (
            <button onClick={() => void flushOutbox().then(refresh)} className="rounded-full bg-ink px-2.5 py-1 font-semibold text-paper">
              {pending} waiting to sync
            </button>
          )}
        </div>
      </header>

      {identity === undefined ? (
        <div className="h-40 animate-pulse rounded-2xl bg-line" />
      ) : identity === null ? (
        <Onboarding onDone={setIdentity} />
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between text-sm">
            <span>
              <span className="font-semibold">{identity.displayName}</span>
              <span className="text-muted"> · {ROLE_LABEL[identity.role]}{identity.party ? ` · ${identity.party}` : ""}</span>
            </span>
            <button
              onClick={async () => {
                if (!confirm("Remove this device's key? Unsynced items stay in the outbox.")) return;
                await clearIdentity();
                setIdentity(null);
              }}
              className="text-xs text-muted underline"
            >
              Switch user
            </button>
          </div>
          {rejected.length > 0 && (
            <p className="mb-4 rounded-xl bg-disputed-wash p-3 text-sm text-disputed">
              {rejected.length} item(s) were refused by the ledger: {rejected[0].reason}
            </p>
          )}
          {identity.role === "presiding_officer" && <PoHome identity={identity} />}
          {identity.role === "party_agent" && <AgentHome identity={identity} />}
          {identity.role === "observer" && <AgentHome identity={identity} />}
          {identity.role === "collation_officer" && <CollationHome identity={identity} />}
          {(identity.role === "citizen" || identity.role === "community_leader" || identity.role === "logistics") && <CitizenHome identity={identity} />}
        </>
      )}
    </div>
  );
}
