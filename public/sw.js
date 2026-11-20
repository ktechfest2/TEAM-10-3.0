/* Tally offline service worker.
 * - App shell and static assets: cache-first (hashed filenames never change).
 * - Pages and place data: network-first, falling back to the last cached copy.
 * - Writes (/api/sync, /api/media, ...) are never cached; the app's IndexedDB outbox handles offline writes.
 */
const VERSION = "tally-v2";
const SHELL = ["/app", "/"];
// Local development registers the worker only to test push. Never let it cache HMR assets there.
const DEV = self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (DEV) return;
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.match(/\.(png|svg|ico|woff2)$/)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy));
            return res;
          }),
      ),
    );
    return;
  }

  const cacheable = request.mode === "navigate" || url.pathname.startsWith("/api/places/");
  if (!cacheable) return;
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copy));
        }
        return res;
      })
      .catch(() => caches.match(request).then((hit) => hit || caches.match("/app"))),
  );
});

/* Web push: the server sends one short JSON alert; tapping it opens the page it points at. */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Tally", body: event.data ? event.data.text() : "" };
  }
  const kind = data.kind || "grey";
  event.waitUntil(
    self.registration.showNotification(data.title || "Tally", {
      body: data.body || "",
      icon: "/icons/tally-192.png",
      badge: "/icons/tally-192.png",
      tag: data.tag || "tally",
      renotify: true,
      requireInteraction: kind === "red",
      vibrate: kind === "red" ? [90, 45, 90] : undefined,
      data: { url: data.url || "/mission" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/mission";
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = clients.find((client) => new URL(client.url).origin === self.location.origin);
      if (existing) {
        await existing.focus();
        if ("navigate" in existing) await existing.navigate(url);
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
