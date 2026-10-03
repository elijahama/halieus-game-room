const CACHE_NAME = "hgr-control-shell-v10";
const SHELL = ["/control.css?v=4.5.3-control-b4", "/control.js?v=4.5.3-control-b4", "/manifest.webmanifest?v=4.5.3-control-approved2", "/offline.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith("hgr-control-") && key !== CACHE_NAME).map((key) => caches.delete(key)));
      await self.clients.claim();
      // Older installed shells have no controllerchange handler. Navigate them
      // from the worker itself so the new state machine actually reaches users.
      const windows = await self.clients.matchAll({ type: "window" });
      // Do not hold activation open while awaiting navigation: the navigation's
      // fetch waits for this worker to finish activating.
      for (const client of windows) client.navigate(client.url).catch(() => undefined);
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (url.pathname === "/control-icon.png") {
    event.respondWith(fetch(event.request, { cache: "no-store" }));
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request, { cache: "no-store" }).catch(() => caches.match("/offline.html")),
    );
    return;
  }

  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => caches.match(event.request)),
  );
});
