/* ============================================================
   OmniChat — Service Worker v3
   Network-first HTML, cache-first assets, NEVER caches sw.js.
   ============================================================ */

const CACHE_NAME = 'omnichat-v4';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // NEVER cache sw.js — this is how SW update deadlock happens
  if (url.pathname.endsWith('sw.js')) return;

  // Never intercept API calls
  if (url.pathname.includes('/v1/') || url.pathname.includes('/chat/completions') || url.pathname.includes('/models')) return;

  // HTML: network-first (always get latest)
  const isHTML = event.request.destination === 'document' || url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/omnichat/');

  if (isHTML) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
  } else {
    // Assets: cache-first, update in background
    event.respondWith(
      caches.match(event.request).then((cached) => {
        fetch(event.request).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response));
          }
        }).catch(() => {});
        return cached || fetch(event.request);
      })
    );
  }
});
