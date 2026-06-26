/* ═══════════════════════════════════════════════════════════════
   SW.JS — Service Worker Gabon Sport Connect v4
   + Badge PWA temps réel + Push Notifications
   ═══════════════════════════════════════════════════════════════ */
const CACHE_NAME = 'gsc-v4';
const URLS_TO_CACHE = [
  './',
  './index.html',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet-geosearch@3.11.2/dist/geosearch.css',
  'https://unpkg.com/leaflet-geosearch@3.11.2/dist/bundle.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js',
  'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js'
];

/* ── INSTALL ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(URLS_TO_CACHE).catch(() => Promise.resolve());
    })
  );
  self.skipWaiting();
});

/* ── ACTIVATE ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(cacheNames.map(n => n !== CACHE_NAME ? caches.delete(n) : null))
    )
  );
  self.clients.claim();
});

/* ── FETCH ── */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET') return;
  if (url.origin !== location.origin &&
      !request.url.includes('googleapis') &&
      !request.url.includes('gstatic') &&
      !request.url.includes('unpkg') &&
      !request.url.includes('jsdelivr')) return;

  const isHTML = request.mode === 'navigate' || request.destination === 'document';
  if (isHTML) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const r = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, r));
          }
          return response;
        })
        .catch(() => caches.match(request).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (!response || response.status !== 200 || response.type === 'error') return response;
        const r = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(request, r));
        return response;
      }).catch(() => {
        if (request.destination === 'document') return caches.match('./index.html');
        return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      });
    })
  );
});

/* ── MESSAGES depuis la page ── */
self.addEventListener('message', event => {
  if (!event.data) return;

  /* Mise à jour cache */
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  /* Badge PWA — fallback via postMessage si navigator.setAppBadge indispo */
  if (event.data.type === 'SET_BADGE') {
    const count = parseInt(event.data.count) || 0;
    if ('setAppBadge' in self) {
      if (count > 0) self.setAppBadge(count).catch(() => {});
      else self.clearAppBadge().catch(() => {});
    }
    return;
  }
});

/* ── PUSH NOTIFICATIONS (FCM/Web Push) ── */
self.addEventListener('push', event => {
  let data = { title: 'Gabon Sport Connect', body: 'Nouvelle notification', type: 'system' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch(e) {}

  const icons = {
    mention:'🏷️', message:'💬', follow:'👤', like:'❤️',
    comment:'💭', match:'⚽', event:'📅', news:'📰',
    system:'🔔', achievement:'🏆', alert:'⚠️', transfer:'🔄'
  };

  event.waitUntil(
    self.registration.showNotification('Gabon Sport Connect', {
      body: data.body,
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      tag: data.type || 'general',
      data: { link: data.link || 'index.html', type: data.type },
      actions: data.actions || [],
      vibrate: [200, 100, 200],
      requireInteraction: data.type === 'alert' || data.type === 'message',
    })
  );
});

/* ── CLICK sur notification push ── */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const link = event.notification.data?.link || 'index.html';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes('index.html') || c.url.endsWith('/'));
      if (existing) {
        existing.focus();
        existing.postMessage({ type: 'NOTIF_CLICK', link });
      } else {
        self.clients.openWindow(link);
      }
    })
  );
});

/* ── CLOSE notification (dismiss) ── */
self.addEventListener('notificationclose', () => {});
