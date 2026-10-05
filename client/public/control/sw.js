const CACHE = 'hgr-cloud-control-v1';
const OFFLINE = '/control/offline.html';
const SHELL = [OFFLINE, '/control/control-icon.png?v=part26-control-approved2', '/control/control-icon-512.png?v=4.5.4.19'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('hgr-cloud-control-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // Only the public offline document and approved artwork may enter this cache.
  // Account, operation, enrollment and other APIs always go directly to network.
  if (event.request.mode === 'navigate' && (url.pathname === '/control/' || url.pathname === '/control')) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }).catch(() => caches.match(OFFLINE)));
  } else if (SHELL.includes(url.pathname + url.search)) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
  }
});
