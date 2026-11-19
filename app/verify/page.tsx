import type { Metadata } from "next";
import { Card, Eyebrow } from "@/components/ui";
import { sqlClient as sql } from "@/lib/db/client";
import { verifyLedger } from "@/lib/server/ledger";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Check the records", description: "Re-check every signed result, signature and timestamp yourself." };

const when = (d: string | Date) => new Date(d).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });

/** The public check: is every signed record still exactly as it was signed? Plain words first, technical detail for auditors. */
export default async function VerifyPage() {
  const [ledger, anchors] = await Promise.all([
    verifyLedger(),
    sql<{ id: string; from_seq: number; to_seq: number; merkle_root: string; status: string; created_at: string }[]>`
      select id, from_seq, to_seq, merkle_root, status, created_at from anchors order by created_at desc limit 10`,
  ]);
  const empty = ledger.entries === 0;
  const n = ledger.entries.toLocaleString("en-US");

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16">
      <h1 className="font-display text-3xl leading-tight font-extrabold sm:text-4xl">Check the records yourself</h1>
      <p className="mt-2 max-w-2xl text-lg text-muted">You do not have to take our word for it. Every result on Tally is a signed record, and this page re-checks all of them each time you open it.</p>

      <div className="mt-6 space-y-4">
        {empty ? (
          <Card>
            <Eyebrow>Records</Eyebrow>
            <h2 className="font-display mt-2 text-2xl font-extrabold">Nothing has been signed yet</h2>
            <p className="mt-2 text-muted">Records appear here as polling units sign their results. Once they do, this page checks each one and tells you whether anything was changed.</p>
          </Card>
        ) : ledger.intact ? (
          <Card className="border-sealed/50">
            <Eyebrow>Records · checked just now</Eyebrow>
            <h2 className="font-display mt-2 text-2xl font-extrabold text-sealed">All {n} signed record{ledger.entries === 1 ? "" : "s"} check out</h2>
            <ul className="mt-4 space-y-2 text-[15px]">
              <li className="flex gap-3"><span aria-hidden className="text-sealed">✓</span>Nobody has changed a signed record since it was signed.</li>
              <li className="flex gap-3"><span aria-hidden className="text-sealed">✓</span>Every signature is genuine and belongs to the person who signed.</li>
              <li className="flex gap-3"><span aria-hidden className="text-sealed">✓</span>Records are in their original order. None has been removed or slipped in.</li>
            </ul>
          </Card>
        ) : (
          <Card className="border-2 border-alarm bg-alarm-wash">
            <Eyebrow>Records · checked just now</Eyebrow>
            <h2 className="font-display mt-2 text-2xl font-extrabold text-alarm">Something does not add up</h2>
            <ul className="mt-3 space-y-2 text-[15px]">
              {ledger.alteredSeqs.length > 0 && <li>{ledger.alteredSeqs.length} record{ledger.alteredSeqs.length === 1 ? " was" : "s were"} changed after signing (record{ledger.alteredSeqs.length === 1 ? "" : "s"} {ledger.alteredSeqs.join(", ")}).</li>}
              {ledger.brokenAt !== null && <li>The order of records is broken at record {ledger.brokenAt}: one was removed or inserted.</li>}
              {ledger.alteredSeqs.length === 0 && ledger.brokenAt === null && <li>A signature does not match its signer.</li>}
            </ul>
            <p className="mt-3 text-sm text-muted">Do not rely on the affected records until this is explained. The details below show exactly where.</p>
          </Card>
        )}

        <Card>
          <Eyebrow>Proof it cannot be rewritten later</Eyebrow>
          <p className="mt-2 text-[15px] text-muted">Every few minutes, a fingerprint of all records is stamped on the public Bitcoin blockchain. After that stamp, nobody, including the people who run Tally, can quietly change what happened.</p>
          {anchors.length === 0 ? (
            <p className="mt-3 text-sm">{empty ? "The first stamp is made once results start coming in." : "No stamp yet. The next one is made within minutes."}</p>
          ) : (
            <ul className="mt-3 divide-y divide-line text-sm">
              {anchors.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span>
                    <b>{(a.to_seq - a.from_seq + 1).toLocaleString("en-US")} record{a.to_seq === a.from_seq ? "" : "s"}</b> stamped
                    <span className="block text-xs text-muted">{when(a.created_at)}</span>
                  </span>
                  <span className={a.status === "confirmed" ? "font-bold text-sealed" : "text-muted"}>{a.status === "confirmed" ? "Confirmed on Bitcoin" : "Sent to Bitcoin, waiting for a block"}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <details>
            <summary className="cursor-pointer text-sm font-bold">For auditors: re-check by hand</summary>
            <div className="mt-3 space-y-4 text-sm">
              <ol className="list-decimal space-y-1.5 pl-5 text-muted">
                <li>Take the record&apos;s fields (type, place, content, time, author key) as canonical JSON.</li>
                <li>SHA-256 it. That is the content hash on the polling-unit page.</li>
                <li>Verify each Ed25519 signature over that hash with the signer&apos;s public key.</li>
                <li>Check the Merkle path from the record to an anchored root, and the root&apos;s OpenTimestamps proof.</li>
              </ol>
              <dl className="space-y-1.5 border-t border-line pt-3 text-xs text-muted">
                <div><dt className="inline font-bold text-fg">Records checked: </dt><dd className="inline">{n}</dd></div>
                <div><dt className="inline font-bold text-fg">Latest record hash: </dt><dd className="hash inline break-all">{empty ? "none yet" : ledger.head}</dd></div>
                {anchors.map((a) => (
                  <div key={a.id}><dt className="inline font-bold text-fg">Stamp {a.from_seq}–{a.to_seq}, Merkle root: </dt><dd className="hash inline break-all">{a.merkle_root}</dd></div>
                ))}
              </dl>
              <p className="text-xs text-muted">Machine-readable: <a className="text-blue underline" href="/api/verify">/api/verify</a></p>
            </div>
          </details>
        </Card>
      </div>
    </div>
  );
}
