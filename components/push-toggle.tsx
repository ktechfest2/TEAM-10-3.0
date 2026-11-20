"use client";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icons";

type State = "checking" | "unsupported" | "blocked" | "off" | "on" | "busy" | "unconfigured" | "error";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function ensureRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

/**
 * Turns Web Push on for this browser. `topic` is "mission" for the live board, or "place:<code>" for one unit.
 * The browser still needs the VAPID public key at build time; without it the button says alerts are not set up.
 */
export function PushToggle({ topic = "mission", compact = false }: { topic?: string; compact?: boolean }) {
  const [state, setState] = useState<State>("checking");
  const [hint, setHint] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        if (alive) setState("unsupported");
        return;
      }
      if (!VAPID) {
        if (alive) setState("unconfigured");
        return;
      }
      const registration = await ensureRegistration();
      if (!registration) {
        if (alive) setState("unsupported");
        return;
      }
      const sub = await registration.pushManager.getSubscription();
      if (!sub) {
        if (alive) setState(Notification.permission === "denied" ? "blocked" : "off");
        return;
      }
      const res = await fetch(`/api/push/status?endpoint=${encodeURIComponent(sub.endpoint)}&topic=${encodeURIComponent(topic)}`);
      if (!res.ok) throw new Error("status failed");
      const data = (await res.json()) as { configured: boolean; subscribed: boolean };
      if (!alive) return;
      if (!data.configured) setState("unconfigured");
      else setState(data.subscribed ? "on" : "off");
    })().catch(() => alive && setState("error"));
    return () => {
      alive = false;
    };
  }, [topic]);

  const enable = useCallback(async () => {
    setState("busy");
    setHint("");
    try {
      if (!VAPID) {
        setState("unconfigured");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("blocked");
        return;
      }
      const registration = await ensureRegistration();
      if (!registration) {
        setState("unsupported");
        return;
      }
      const sub =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID) as BufferSource }));
      const json = sub.toJSON();
      if (!json.keys?.p256dh || !json.keys.auth) throw new Error("This browser did not return its push keys.");
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth }, topic }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save this device.");
      setState("on");
    } catch (error) {
      setHint(error instanceof Error ? error.message : "Could not turn alerts on.");
      setState("error");
    }
  }, [topic]);

  const disable = useCallback(async () => {
    setState("busy");
    try {
      const registration = await ensureRegistration();
      const sub = await registration?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint, topic }),
        }).catch(() => undefined);
        await sub.unsubscribe().catch(() => undefined);
      }
      setState("off");
    } catch {
      setState("error");
    }
  }, [topic]);

  const label =
    state === "on"
      ? "Alerts on"
      : state === "busy"
        ? "Turning on…"
        : state === "blocked"
          ? "Alerts blocked"
          : state === "unsupported"
            ? "No alerts here"
            : state === "unconfigured"
              ? "Alerts not set up"
              : state === "error"
                ? "Try alerts again"
                : "Get alerts";

  const disabled = state === "checking" || state === "busy" || state === "unsupported" || state === "unconfigured" || state === "blocked";
  const tone = state === "on" ? "bg-sealed-wash text-sealed" : state === "error" || state === "blocked" ? "bg-amber-wash text-amber" : "bg-raised text-fg";

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => void (state === "on" ? disable() : enable())}
        disabled={disabled}
        aria-pressed={state === "on"}
        title={state === "blocked" ? "Allow notifications for Tally in your browser settings." : state === "unconfigured" ? "The deployment has no VAPID keys." : undefined}
        className={`inline-flex min-h-10 items-center gap-2 rounded-full px-3.5 text-sm font-bold ${tone} disabled:opacity-60 ${compact ? "min-h-9 px-3 text-xs" : ""}`}
      >
        <Icon name="bell" size={compact ? 14 : 16} />
        {label}
      </button>
      {hint && <span className="max-w-64 text-xs text-amber">{hint}</span>}
      {state === "blocked" && <span className="max-w-64 text-xs text-muted">Allow notifications for Tally in your browser settings.</span>}
      {state === "unconfigured" && <span className="max-w-64 text-xs text-muted">The deployment has no push keys. SMS alerts still work.</span>}
    </span>
  );
}
