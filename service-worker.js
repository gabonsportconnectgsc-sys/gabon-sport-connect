const CACHE_NAME = 'bongsc-v1';
const RUNTIME_CACHE = 'bongsc-runtime-v1';
const IMAGE_CACHE = 'bongsc-images-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installation en cours...');
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        // Cache des assets statiques si disponibles
        const assetsToCache = STATIC_ASSETS.filter(asset => asset !== '/offline.html');
        await Promise.allSettled(assetsToCache.map(asset => 
          fetch(asset).then(response => {
            if (response.ok) {
              cache.put(asset, response);
            }
          }).catch(() => console.log(`Impossible de cacher ${asset}`))
        ));
        console.log('[ServiceWorker] Installation complétée');
      } catch (error) {
        console.error('[ServiceWorker] Erreur installation:', error);
      }
    })()
  );
  self.skipWaiting();
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activation en cours...');
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && !cacheName.includes('bongsc-images')) {
            console.log('[ServiceWorker] Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })()
  );
  self.clients.claim();
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ne pas mettre en cache les requêtes non-GET
  if (request.method !== 'GET') {
    return;
  }

  // Ignorer les requêtes Firebase et APIs externes
  if (url.hostname.includes('googleapis.com') || 
      url.hostname.includes('firebaseio.com') ||
      url.hostname.includes('firebaseapp.com')) {
    event.respondWith(
      fetch(request)
        .then(response => response)
        .catch(() => {
          // Retourner une réponse offline
          return new Response(
            JSON.stringify({ offline: true, message: 'Mode hors ligne' }),
            { 
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // Stratégie: Cache first, fall back to network
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request)
        .then(response => response || fetchAndCache(request, IMAGE_CACHE))
        .catch(() => new Response('', { status: 404 }))
    );
  } else {
    // Network first pour HTML et CSS
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) {
            return cached;
          }
          // Fallback pour les pages HTML
          if (request.destination === 'document' || request.headers.get('accept').includes('text/html')) {
            return caches.match('/offline.html') || 
                   new Response('Page non disponible en mode hors ligne', { status: 503 });
          }
          return new Response('', { status: 404 });
        })
    );
  }
});

// Fonction helper pour cacher les réponses
async function fetchAndCache(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[ServiceWorker] Erreur fetch:', error);
    throw error;
  }
}

// Synchronisation en arrière-plan
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(
      (async () => {
        try {
          // Récupérer les données en attente depuis IndexedDB
          const db = await openIndexedDB();
          const pendingChanges = await getPendingChanges(db);
          
          // Envoyer les données au serveur
          for (const change of pendingChanges) {
            try {
              await fetch(change.url, {
                method: change.method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(change.data)
              });
              // Supprimer de la file d'attente après succès
              await removePendingChange(db, change.id);
            } catch (error) {
              console.error('[ServiceWorker] Erreur sync:', error);
            }
          }
        } catch (error) {
          console.error('[ServiceWorker] Erreur background sync:', error);
        }
      })()
    );
  }
});

// Notifications push (optionnel)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'Nouvelle notification',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: data.tag || 'notification',
    data: data.data || {}
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'BONGSC', options)
  );
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (let client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
