/* ═══════════════════════════════════════════════════════════════
   SW.JS — Service Worker Gabon Sport Connect v4
   + Badge PWA temps réel + Push Notifications
   ═══════════════════════════════════════════════════════════════ */
/* FIX MAJEUR : CACHE_NAME était figé sur 'gsc-v6' depuis longtemps. Le
   handler fetch ci-dessous servait TOUS les fichiers .js/.css de l'app
   (gsc-notifications.js compris) en "cache-first" : dès qu'un appareil
   avait mis un fichier en cache une fois, il ne récupérait plus JAMAIS la
   version à jour sur GitHub Pages, même après un nouveau déploiement —
   seul un changement de CACHE_NAME (purge au prochain 'activate') permet
   de forcer le rafraîchissement. C'est exactement pourquoi le correctif de
   gsc-notifications.js (cloche de notifications) semblait ne rien changer :
   le téléphone exécutait toujours l'ancien fichier mis en cache.
   On bump la version ici pour purger immédiatement le cache existant, ET
   on passe en stratégie "network-first / stale-while-revalidate" pour les
   fichiers JS/CSS de l'app (voir plus bas) afin que ce problème ne se
   reproduise plus à chaque futur correctif. */
const CACHE_NAME = 'gsc-v7';
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

  /* Fichiers de l'app elle-même (JS/CSS same-origin : gsc-*.js, admin-*.js,
     structures-*.js, etc.) — FIX : ces fichiers changent souvent (corrections
     de bugs) et étaient auparavant servis en "cache-first", ce qui gelait
     n'importe quel correctif pour tout appareil ayant déjà visité l'app une
     fois. On passe en "réseau d'abord" : la version la plus récente sur
     GitHub Pages est toujours utilisée quand la connexion est disponible ;
     le cache ne sert que de secours hors-ligne. */
  const isOwnAppCode = url.origin === location.origin && /\.(js|css)$/i.test(url.pathname);
  if (isOwnAppCode) {
    event.respondWith(
      fetch(request).then(response => {
        if (response && response.status === 200) {
          const r = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, r));
        }
        return response;
      }).catch(() => caches.match(request))
    );
    return;
  }

  /* Ressources tierces versionnées (fonts, leaflet, chart.js, firebase SDK…)
     — celles-ci ne changent pas sous une même URL, donc le cache-first reste
     pertinent et économise de la bande passante. */
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

/* ── BADGE PERSISTANT (app fermée) ──
   navigator.setAppBadge() ne fonctionne que depuis une page ouverte. Pour que
   le badge de l'icône continue de s'incrémenter quand l'app est totalement
   fermée (comme WhatsApp/TikTok), le SW garde son propre compteur dans
   IndexedDB : +1 à chaque push reçu, -1 quand la notif est ouverte, et
   resynchronisé sur la vraie valeur (Firestore) dès que l'app rouvre et
   envoie SET_BADGE. */
const BADGE_DB = 'gsc-sw-badge';
const BADGE_STORE = 'state';

function openBadgeDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(BADGE_DB, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(BADGE_STORE)) req.result.createObjectStore(BADGE_STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getBadgeCount() {
  try {
    const db = await openBadgeDB();
    return await new Promise(resolve => {
      const r = db.transaction(BADGE_STORE, 'readonly').objectStore(BADGE_STORE).get('unread');
      r.onsuccess = () => resolve(r.result || 0);
      r.onerror = () => resolve(0);
    });
  } catch (e) { return 0; }
}

/* Écrit le compteur en base ET met à jour le badge visible sur l'icône. */
async function setBadgeCount(n) {
  const count = Math.max(0, n | 0);
  try {
    const db = await openBadgeDB();
    await new Promise(resolve => {
      const tx = db.transaction(BADGE_STORE, 'readwrite');
      tx.objectStore(BADGE_STORE).put(count, 'unread');
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    });
  } catch (e) {}
  /* FIX BADGE HORS APP : la spec Badging API (NavigatorBadge) est un mixin de
     Navigator ET WorkerNavigator — les méthodes vivent donc sur self.navigator
     dans un Service Worker, PAS directement sur self. `'setAppBadge' in self`
     était toujours faux (ou appelait une méthode inexistante), donc l'appel
     échouait silencieusement à chaque push : le badge ne s'actualisait jamais
     quand l'app était fermée, alors que la même page ouverte fonctionnait
     (là, `navigator.setAppBadge` existe bien sur window). */
  if (self.navigator && 'setAppBadge' in self.navigator) {
    if (count > 0) self.navigator.setAppBadge(count).catch(() => {});
    else self.navigator.clearAppBadge().catch(() => {});
  }
  return count;
}

async function incrementBadge(delta) {
  const current = await getBadgeCount();
  return setBadgeCount(current + delta);
}

/* ── MESSAGES depuis la page ── */
self.addEventListener('message', event => {
  if (!event.data) return;

  /* Mise à jour cache */
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  /* Badge PWA — la page envoie systématiquement le vrai compte (Firestore),
     ce qui resynchronise/écrase le compteur approximatif du SW à chaque
     ouverture de l'app ou changement de notifications lues. */
  if (event.data.type === 'SET_BADGE') {
    event.waitUntil ? event.waitUntil(setBadgeCount(event.data.count)) : setBadgeCount(event.data.count);
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
    (async () => {
      await self.registration.showNotification('Gabon Sport Connect', {
        body: data.body,
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        tag: data.type || 'general',
        data: { link: data.link || 'index.html', type: data.type },
        actions: data.actions || [],
        vibrate: [200, 100, 200],
        requireInteraction: data.type === 'alert' || data.type === 'message',
      });
      /* App fermée = pas de page pour appeler setAppBadge : le SW incrémente
         lui-même son compteur persistant et met à jour l'icône. */
      await incrementBadge(1);
    })()
  );
});

/* ── CLICK sur notification push ── */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const link = event.notification.data?.link || 'index.html';

  event.waitUntil(
    (async () => {
      /* La notif est désormais "traitée" — on décrémente le compteur local.
         Il sera de toute façon resynchronisé sur la vraie valeur dès que
         l'app envoie SET_BADGE au chargement. */
      await incrementBadge(-1);

      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = clientList.find(c => c.url.includes('index.html') || c.url.endsWith('/'));
      if (existing) {
        existing.focus();
        existing.postMessage({ type: 'NOTIF_CLICK', link });
      } else {
        self.clients.openWindow(link);
      }
    })()
  );
});

/* ── CLOSE notification (dismiss) ── */
self.addEventListener('notificationclose', () => {});
