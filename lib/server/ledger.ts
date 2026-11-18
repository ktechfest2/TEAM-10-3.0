import "server-only";
import { iso } from "./time";
import { sqlClient as sql } from "@/lib/db/client";
import {
  AUTHOR_ROLES,
  GENESIS_HASH,
  ledgerHashOf,
  verifyCosignature,
  verifySignedEvent,
  type Cosignature,
  type Role,
  type SignedEvent,
} from "@/lib/core/events";

export type IngestItem = { event?: SignedEvent; cosignatures?: Cosignature[] };
export type IngestResult = {
  eventId?: string;
  contentHash?: string;
  status: "accepted" | "duplicate" | "rejected" | "cosignatures-only";
  reason?: string;
  seq?: number;
  cosignatures: { witnessKey: string; status: "accepted" | "duplicate" | "rejected"; reason?: string }[];
};

type ActorRow = { id: string; role: Role; party: string | null };

async function actorByKey(tx: typeof sql, key: string): Promise<ActorRow | undefined> {
  const [row] = await tx<ActorRow[]>`select id, role, party from actors where public_key = ${key}`;
  return row;
}

/** Appends one signed event (idempotently) and any co-signatures, in a single transaction. */
export async function ingest(item: IngestItem, channel = "app"): Promise<IngestResult> {
  return sql.begin(async (txRaw) => {
    const tx = txRaw as unknown as typeof sql;
    const result: IngestResult = { status: "cosignatures-only", cosignatures: [] };
    let authorId: string | undefined;

    if (item.event) {
      const e = item.event;
      result.eventId = e.id;
      result.contentHash = e.contentHash;
      const check = verifySignedEvent(e);
      if (!check.ok) return { ...result, status: "rejected", reason: check.reason };

      const author = await actorByKey(tx, e.authorKey);
      if (!author) return { ...result, status: "rejected", reason: "author key is not registered" };
      if (!AUTHOR_ROLES[e.type].includes(author.role)) {
        return { ...result, status: "rejected", reason: `a ${author.role} cannot record ${e.type}` };
      }
      authorId = author.id;

      const [place] = await tx`select code from places where code = ${e.placeCode}`;
      if (!place) return { ...result, status: "rejected", reason: `unknown place ${e.placeCode}` };

      const [existing] = await tx<{ seq: number }[]>`select seq from events where content_hash = ${e.contentHash}`;
      if (existing) {
        result.status = "duplicate";
        result.seq = Number(existing.seq);
      } else {
        // Serialise appends so every entry links to exactly one predecessor.
        await tx`select pg_advisory_xact_lock(7307)`;
        const [last] = await tx<{ ledger_hash: string }[]>`select ledger_hash from events order by seq desc limit 1`;
        const prevHash = last?.ledger_hash ?? GENESIS_HASH;
        const ledgerHash = ledgerHashOf(prevHash, e.contentHash);
        const [inserted] = await tx<{ seq: number }[]>`
          insert into events (id, type, place_code, payload, occurred_at, author_key, author_id, content_hash, signature, prev_hash, ledger_hash, channel)
          values (${e.id}, ${e.type}, ${e.placeCode}, ${JSON.stringify(e.payload)}::jsonb, ${e.occurredAt}, ${e.authorKey}, ${author.id},
                  ${e.contentHash}, ${e.signature}, ${prevHash}, ${ledgerHash}, ${channel})
          on conflict (id) do nothing
          returning seq`;
        if (!inserted) return { ...result, status: "rejected", reason: "event id already used for different content" };
        result.status = "accepted";
        result.seq = Number(inserted.seq);
      }
    }

    for (const c of item.cosignatures ?? []) {
      if (!verifyCosignature(c)) {
        result.cosignatures.push({ witnessKey: c.witnessKey, status: "rejected", reason: "signature invalid" });
        continue;
      }
      const [target] = await tx<{ author_id: string }[]>`select author_id from events where content_hash = ${c.contentHash}`;
      if (!target) {
        result.cosignatures.push({ witnessKey: c.witnessKey, status: "rejected", reason: "event not yet on the ledger" });
        continue;
      }
      const witness = await actorByKey(tx, c.witnessKey);
      if (!witness) {
        result.cosignatures.push({ witnessKey: c.witnessKey, status: "rejected", reason: "witness key is not registered" });
        continue;
      }
      if (witness.id === (authorId ?? target.author_id)) {
        result.cosignatures.push({ witnessKey: c.witnessKey, status: "rejected", reason: "an author cannot witness their own event" });
        continue;
      }
      const inserted = await tx`
        insert into witnesses (content_hash, actor_id, kind, signature, signed_at)
        values (${c.contentHash}, ${witness.id}, 'signed', ${c.signature}, ${c.signedAt})
        on conflict do nothing returning actor_id`;
      result.cosignatures.push({ witnessKey: c.witnessKey, status: inserted.length ? "accepted" : "duplicate" });
    }
    return result;
  });
}

/**
 * Full audit: (1) every stored event still hashes to its content hash and carries a valid
 * author signature, and (2) the ledger chain links unbroken from genesis to head.
 */
export async function verifyLedger() {
  const rows = await sql<
    {
      seq: number;
      id: string;
      type: SignedEvent["type"];
      place_code: string;
      payload: unknown;
      occurred_at: Date;
      author_key: string;
      content_hash: string;
      signature: string;
      prev_hash: string;
      ledger_hash: string;
    }[]
  >`select seq, id, type, place_code, payload, occurred_at, author_key, content_hash, signature, prev_hash, ledger_hash from events order by seq`;
  const { findChainBreak } = await import("@/lib/core/events");
  const brokenAt = findChainBreak(
    rows.map((r) => ({ seq: Number(r.seq), contentHash: r.content_hash, prevHash: r.prev_hash, ledgerHash: r.ledger_hash })),
  );
  const altered = rows
    .filter(
      (r) =>
        !verifySignedEvent({
          id: r.id,
          type: r.type,
          placeCode: r.place_code,
          payload: r.payload,
          occurredAt: iso(r.occurred_at),
          authorKey: r.author_key,
          contentHash: r.content_hash,
          signature: r.signature,
        }).ok,
    )
    .map((r) => Number(r.seq));
  return {
    entries: rows.length,
    intact: brokenAt === null && altered.length === 0,
    brokenAt,
    alteredSeqs: altered,
    head: rows.at(-1)?.ledger_hash ?? GENESIS_HASH,
  };
}
