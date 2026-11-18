"use client";
/**
 * On-device storage (IndexedDB). The private key never leaves this device.
 * The outbox holds signed items until any network is available; held events are
 * copies this device witnessed, so a lost or locked device elsewhere loses nothing.
 */
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Cosignature, Role, SignedEvent } from "@/lib/core/events";

export type Identity = {
  role: Exclude<Role, "system">;
  displayName: string;
  party: string | null;
  placeCode: string | null;
  placeName: string | null;
  publicKeyHex: string;
  secretKeyHex: string;
  actorId: string | null;
  createdAt: string;
};

export type OutboxItem = {
  id: string;
  createdAt: string;
  event?: SignedEvent;
  cosignatures?: Cosignature[];
  status: "pending" | "synced" | "rejected";
  reason?: string;
  attempts: number;
};

export type HeldEvent = { contentHash: string; event: SignedEvent; cosignatures: Cosignature[]; savedAt: string };

interface TallyDB extends DBSchema {
  identity: { key: string; value: Identity };
  outbox: { key: string; value: OutboxItem; indexes: { status: string } };
  held: { key: string; value: HeldEvent };
}

let dbPromise: Promise<IDBPDatabase<TallyDB>> | null = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<TallyDB>("tally", 1, {
      upgrade(db) {
        db.createObjectStore("identity");
        db.createObjectStore("outbox", { keyPath: "id" }).createIndex("status", "status");
        db.createObjectStore("held", { keyPath: "contentHash" });
      },
    });
  }
  return dbPromise;
}

export async function loadIdentity(): Promise<Identity | null> {
  return (await (await getDb()).get("identity", "me")) ?? null;
}

export async function saveIdentity(identity: Identity) {
  await (await getDb()).put("identity", identity, "me");
}

export async function clearIdentity() {
  await (await getDb()).delete("identity", "me");
}

export async function enqueue(item: Omit<OutboxItem, "id" | "createdAt" | "status" | "attempts">) {
  const full: OutboxItem = { ...item, id: crypto.randomUUID(), createdAt: new Date().toISOString(), status: "pending", attempts: 0 };
  await (await getDb()).put("outbox", full);
  window.dispatchEvent(new Event("tally:outbox"));
  return full;
}

export async function listOutbox(): Promise<OutboxItem[]> {
  const all = await (await getDb()).getAll("outbox");
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateOutbox(item: OutboxItem) {
  await (await getDb()).put("outbox", item);
}

export async function holdEvent(event: SignedEvent, cosignatures: Cosignature[]) {
  const db = await getDb();
  const existing = await db.get("held", event.contentHash);
  const merged = [...(existing?.cosignatures ?? []), ...cosignatures].filter(
    (c, i, arr) => arr.findIndex((x) => x.witnessKey === c.witnessKey) === i,
  );
  await db.put("held", { contentHash: event.contentHash, event, cosignatures: merged, savedAt: new Date().toISOString() });
}

export async function listHeld(): Promise<HeldEvent[]> {
  const all = await (await getDb()).getAll("held");
  return all.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}
