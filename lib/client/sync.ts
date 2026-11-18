"use client";
import { listOutbox, updateOutbox, type OutboxItem } from "./store";

type ServerResult = { status: "accepted" | "duplicate" | "rejected" | "cosignatures-only"; reason?: string; cosignatures: { status: string; reason?: string }[] };

let flushing = false;

/**
 * Sends pending outbox items. Safe to call repeatedly and from any device:
 * the server treats repeats as duplicates. Returns how many items settled.
 */
export async function flushOutbox(): Promise<{ sent: number; failed: number; offline: boolean }> {
  if (flushing) return { sent: 0, failed: 0, offline: false };
  if (typeof navigator !== "undefined" && !navigator.onLine) return { sent: 0, failed: 0, offline: true };
  flushing = true;
  try {
    const pending = (await listOutbox()).filter((i) => i.status === "pending").reverse(); // oldest first
    if (pending.length === 0) return { sent: 0, failed: 0, offline: false };
    let sent = 0;
    let failed = 0;
    for (let i = 0; i < pending.length; i += 20) {
      const batch = pending.slice(i, i + 20);
      let response: Response;
      try {
        response = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: batch.map(({ event, cosignatures }) => ({ event, cosignatures })) }),
        });
      } catch {
        return { sent, failed, offline: true };
      }
      if (!response.ok) {
        failed += batch.length;
        for (const item of batch) await updateOutbox({ ...item, attempts: item.attempts + 1 });
        continue;
      }
      const { results } = (await response.json()) as { results: ServerResult[] };
      for (const [index, item] of batch.entries()) {
        const r = results[index];
        const next: OutboxItem = { ...item, attempts: item.attempts + 1 };
        const cosigRejected = r.cosignatures.find((c) => c.status === "rejected");
        if (r.status === "rejected") {
          next.status = "rejected";
          next.reason = r.reason;
          failed++;
        } else if (cosigRejected && cosigRejected.reason === "event not yet on the ledger") {
          // The event will arrive from another device; keep trying.
          next.reason = "Waiting for the result to reach the ledger";
        } else if (cosigRejected) {
          next.status = "rejected";
          next.reason = cosigRejected.reason;
          failed++;
        } else {
          next.status = "synced";
          next.reason = undefined;
          sent++;
        }
        await updateOutbox(next);
      }
    }
    window.dispatchEvent(new Event("tally:outbox"));
    return { sent, failed, offline: false };
  } finally {
    flushing = false;
  }
}

/** Flush whenever the network returns, and every 20 seconds while the app is open. */
export function startAutoSync(onSettled?: () => void) {
  const run = () => void flushOutbox().then(() => onSettled?.());
  window.addEventListener("online", run);
  window.addEventListener("tally:outbox", run);
  const timer = window.setInterval(run, 20_000);
  run();
  return () => {
    window.removeEventListener("online", run);
    window.removeEventListener("tally:outbox", run);
    window.clearInterval(timer);
  };
}
