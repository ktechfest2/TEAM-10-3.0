import type { Metadata } from "next";
import Link from "next/link";
import { Card, Eyebrow, StatusBadge } from "@/components/ui";
import { sqlClient as sql } from "@/lib/db/client";
import { verifyLedger } from "@/lib/server/ledger";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verify" };

export default async function VerifyPage() {
  const [ledger, anchors] = await Promise.all([
    verifyLedger(),
    sql<{ id: string; from_seq: number; to_seq: number; merkle_root: string; status: string; created_at: string }[]>`
      select id, from_seq, to_seq, merkle_root, status, created_at from anchors order by created_at desc limit 10`,
  ]);
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16">
      <header className="py-4">
        <Link href="/" className="text-lg font-black tracking-tight">Tally</Link>
      </header>
      <h1 className="text-3xl font-bold">Verify everything yourself</h1>
      <p className="mt-2 text-muted">You do not have to trust Tally. Every check below can be repeated independently.</p>

      <div className="mt-6 space-y-4">
        <Card className={ledger.intact ? "border-sealed" : "border-2 border-disputed"}>
          <div className="flex items-center justify-between">
            <Eyebrow>Ledger audit (run just now)</Eyebrow>
            <StatusBadge status={ledger.intact ? "match" : "mismatch"} />
          </div>
          <ul className="mt-3 space-y-1 text-sm">
            <li>{ledger.entries.toLocaleString()} signed entries re-checked</li>
            <li>Every content hash recomputed from the stored data: {ledger.alteredSeqs.length === 0 ? "all match" : `${ledger.alteredSeqs.length} altered (entries ${ledger.alteredSeqs.join(", ")})`}</li>
            <li>Every Ed25519 signature verified against its author&apos;s key</li>
            <li>Hash chain from genesis to head: {ledger.brokenAt === null ? "unbroken" : `broken at entry ${ledger.brokenAt}`}</li>
            <li>
              Head <span className="hash">{ledger.head}</span>
            </li>
          </ul>
          <p className="mt-3 text-xs text-muted">
            Machine-readable: <a href="/api/verify" className="underline">/api/verify</a>
          </p>
        </Card>

        <Card>
          <Eyebrow>Public blockchain anchors</Eyebrow>
          <p className="mt-1 text-sm text-muted">Every few minutes the ledger&apos;s Merkle root is timestamped on Bitcoin through OpenTimestamps. After that, not even Tally&apos;s operators can rewrite history without it showing.</p>
          {anchors.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No anchors yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {anchors.map((a) => (
                <li key={a.id} className="rounded-xl bg-paper p-3">
                  <div className="flex justify-between">
                    <span>Entries {a.from_seq}–{a.to_seq}</span>
                    <span className="text-muted">{a.status === "confirmed" ? "Confirmed on Bitcoin" : "Submitted · awaiting Bitcoin block"}</span>
                  </div>
                  <p className="hash mt-1 text-muted">root {a.merkle_root}</p>
                  <a href={`/api/anchors/${a.id}/proof`} className="text-xs text-accent underline">Download .ots proof</a>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <Eyebrow>Check a result by hand</Eyebrow>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            <li>Take the event&apos;s fields (type, place, payload, time, author key) as canonical JSON.</li>
            <li>SHA-256 it: that is the content hash shown on the polling-unit page.</li>
            <li>Verify each Ed25519 signature on that hash with the signer&apos;s public key.</li>
            <li>Check the Merkle path from the ledger hash to an anchored root, and the root&apos;s OpenTimestamps proof.</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
