import "server-only";
import { hexToBytes } from "@/lib/core/crypto";
import { merkleRoot } from "@/lib/core/merkle";
import { sqlClient as sql } from "@/lib/db/client";

const CALENDARS = ["https://a.pool.opentimestamps.org", "https://b.pool.opentimestamps.org", "https://a.pool.eternitywall.com"];
const MIN_INTERVAL_MS = 10 * 60 * 1000;

export type CalendarProof = { calendar: string; ok: boolean; proofBase64?: string; error?: string };

/** Submits a 32-byte digest to OpenTimestamps calendars. Each returns a pending timestamp that later commits to Bitcoin. */
async function submit(digestHex: string): Promise<CalendarProof[]> {
  return Promise.all(
    CALENDARS.map(async (calendar) => {
      try {
        const res = await fetch(`${calendar}/digest`, {
          method: "POST",
          headers: { Accept: "application/vnd.opentimestamps.v1", "Content-Type": "application/x-www-form-urlencoded" },
          body: Buffer.from(hexToBytes(digestHex)),
          signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) return { calendar, ok: false, error: `HTTP ${res.status}` };
        return { calendar, ok: true, proofBase64: Buffer.from(await res.arrayBuffer()).toString("base64") };
      } catch (e) {
        return { calendar, ok: false, error: e instanceof Error ? e.message : "failed" };
      }
    }),
  );
}

/** Anchors every ledger entry since the last anchor under one Merkle root. Returns null when there is nothing new. */
export async function anchorPending(force = false) {
  const [last] = await sql<{ to_seq: number; created_at: string }[]>`select to_seq, created_at from anchors where status <> 'failed' order by to_seq desc limit 1`;
  if (!force && last && Date.now() - new Date(last.created_at).getTime() < MIN_INTERVAL_MS) return null;
  const fromSeq = (last?.to_seq ?? 0) + 1;
  const rows = await sql<{ seq: number; ledger_hash: string }[]>`select seq, ledger_hash from events where seq >= ${fromSeq} order by seq`;
  if (rows.length === 0) return null;

  const root = merkleRoot(rows.map((r) => r.ledger_hash));
  const proofs = await submit(root);
  const ok = proofs.some((p) => p.ok);
  const [anchor] = await sql<{ id: string }[]>`
    insert into anchors (from_seq, to_seq, merkle_root, calendars, status)
    values (${fromSeq}, ${Number(rows.at(-1)!.seq)}, ${root}, ${JSON.stringify(proofs)}::jsonb, ${ok ? "pending" : "failed"})
    returning id`;
  return { id: anchor.id, fromSeq, toSeq: Number(rows.at(-1)!.seq), root, calendars: proofs.map(({ calendar, ok, error }) => ({ calendar, ok, error })) };
}

const OTS_MAGIC = Buffer.from("004f70656e54696d657374616d7073000050726f6f6600bf89e2e884e89294", "hex");

/**
 * Builds a standard detached .ots file (verify with: ots verify -d <root> proof.ots).
 * Layout: magic · version 1 · op SHA256 (0x08) · 32-byte digest · calendar timestamp.
 */
export function otsFile(rootHex: string, calendarProofBase64: string): Buffer {
  return Buffer.concat([OTS_MAGIC, Buffer.from([0x01, 0x08]), Buffer.from(hexToBytes(rootHex)), Buffer.from(calendarProofBase64, "base64")]);
}
