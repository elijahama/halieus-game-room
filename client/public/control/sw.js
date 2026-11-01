const CACHE = 'hgr-cloud-control-v2';
const OFFLINE = '/control/offline.html';
const SHELL = [OFFLINE, '/control/control-icon.png?v=part26-control-approved2', '/control/control-icon-512.png?v=4.5.4.19', '/notification-badges/control.png'];
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

/* Background Control progress: notifications are delivered by the cloud
 * server, not page polling. Never expose credentials or external URLs. */
self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data?.json() || {}; } catch { /* Safe default. */ }
  const title = typeof payload.title === 'string' ? payload.title.slice(0,100) : 'HGR Control update';
  const body = typeof payload.body === 'string' ? payload.body.slice(0,160) : 'Open Control for update status.';
  const tag = typeof payload.tag === 'string' ? payload.tag.slice(0,120) : 'hgr-control-update';
  event.waitUntil(self.registration.showNotification(title, {
    body,
    tag,
    renotify: true,
    icon: '/control/control-icon.png?v=part26-control-approved2',
    // Exact Control H/cog silhouette extracted from the approved launcher art.
    badge: '/notification-badges/control.png',
    data: { url: '/control/' },
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const control = clients.find((client) => {
      try {
        const url = new URL(client.url);
        return url.origin === self.location.origin && (url.pathname === '/control' || url.pathname.startsWith('/control/'));
      } catch { return false; }
    });
    return control ? control.focus() : self.clients.openWindow('/control/');
  }));
});
