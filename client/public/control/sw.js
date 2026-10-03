const CACHE_NAME = "hgr-cloud-control-shell-v1";
const SHELL = [
  "/control/",
  "/control/control.css?v=part26-control-approved2",
  "/control/control.js?v=part26-cloud-b1",
  "/control/manifest.webmanifest?v=4.5.4-control-approved3",
  "/control/control-icon.png?v=4.5.4-control-approved3",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("hgr-cloud-control-") && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/socket.io/") || url.pathname.startsWith("/auth/") || url.pathname.startsWith("/accounts/") || url.pathname.startsWith("/admin/") || url.pathname === "/health") return;
  if (!url.pathname.startsWith("/control/")) return;

  if (url.pathname === "/control/control-icon.png" || url.pathname === "/control/manifest.webmanifest") {
    event.respondWith(fetch(event.request, { cache: "no-store" }));
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request, { cache: "no-store" }).catch(() => caches.match("/control/")));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
      return response;
    })),
  );
});
