const CACHE = 'halieus-shell-v4-7-4-' + (new URL(self.location.href).searchParams.get('release') || 'unversioned');
const SHELL = ['/', '/site.webmanifest?identity=install-h6', '/app-icon-192.png?identity=install-h6', '/app-icon-512.png?identity=install-h6', '/notification-badges/hgr.png', '/notification-badges/mega-board.png'];
const IDENTITY_PATHS = new Set(['/site.webmanifest', '/halieus-mark.svg', '/halieus-app-icon.svg', '/halieus-app-icon.png', '/app-icon.svg', '/app-icon-180.png', '/app-icon-192.png', '/app-icon-512.png', '/favicon-32.png', '/favicon.ico']);
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => undefined));
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('halieus-shell-') && key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/socket.io/') || url.pathname.startsWith('/auth/') || url.pathname.startsWith('/accounts/') || url.pathname.startsWith('/admin/') || url.pathname === '/health') return;
  if (url.pathname === '/control' || url.pathname.startsWith('/control/')) return;
  if (IDENTITY_PATHS.has(url.pathname)) {
    event.respondWith(fetch(event.request, { cache: 'reload' }).then((response) => {
      if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
      return response;
    }).catch(() => caches.match(event.request)));
    return;
  }
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then((response) => {
      // A maintenance 503 is authoritative and must never overwrite the
      // healthy offline shell cache with a stale "closed" document.
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put('/', copy));
      }
      return response;
    }).catch(() => caches.match('/')));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
    return response;
  })));
});
// Only approved HGR game IDs may select a bundled icon. Remote-provided
// filenames/URLs are never interpolated into notification assets.
const NOTIFICATION_GAMES = new Set([
  'mega-board', 'poker', 'blackjack', 'whot', 'ludo', 'hidden-dictator',
  'connect-four', 'word-game', 'password', 'anagrams-race',
  'cheat', 'dominoes', 'ayo', 'word-board',
]);
self.addEventListener('push', (event) => {
  let payload = { title: 'Halieus Game Room', body: 'You have a new Halieus notification.', url: '/' };
  try { payload = { ...payload, ...(event.data?.json() || {}) }; } catch {}
  const game = typeof payload.game === 'string' && NOTIFICATION_GAMES.has(payload.game) ? payload.game : null;
  const icon = game ? `/game-icons/${game}.svg` : '/app-icon-192.png?identity=install-h6';
  // Android masks the status-bar badge to a monochrome silhouette; never use
  // the opaque full-colour square as a status badge.
  const badge = game === 'mega-board' ? '/notification-badges/mega-board.png'
    : '/notification-badges/hgr.png';
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    icon,
    badge,
    data: { url: payload.url || '/' },
    tag: payload.tag || 'halieus-notification',
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => 'focus' in client);
    if (existing) { existing.navigate(target); return existing.focus(); }
    return self.clients.openWindow(target);
  }));
});


self.addEventListener('message', (event) => {
  if (event.data?.type !== 'HALIEUS_RELEASE_REFRESH') return;
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('halieus-shell-'))
          .map((key) => caches.delete(key)),
      ),
    ),
  );
});
