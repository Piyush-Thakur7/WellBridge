// WellBridge AI Service Worker
const CACHE_VERSION = 'wellbridge-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Always use network-first strategy to prevent blank screens on new releases
  if (event.request.method !== 'GET') return;

  // Let auth and API requests go directly to network
  if (
    event.request.url.includes('/api/') ||
    event.request.url.includes('firebase') ||
    event.request.url.includes('identitytoolkit') ||
    event.request.url.includes('firestore') ||
    event.request.url.includes('googleapis.com')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If valid response, clone and cache for offline fallback
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => cached || Response.error());
      })
  );
});
