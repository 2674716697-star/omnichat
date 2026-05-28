/* ============================================================
   AI Chat Pro — Service Worker
   Caches the app shell for offline access.
   API calls still require network.
   ============================================================ */

const CACHE_NAME = 'ai-chat-pro-v1';
const APP_SHELL = [
  './',
  './ios-ai-chat-pro.html',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch(() => {
        // Graceful: some files may not exist (e.g. dev vs standalone)
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Don't cache API calls
  const url = new URL(event.request.url);
  if (url.pathname.includes('/v1/') || url.pathname.includes('/chat/completions') || url.pathname.includes('/models')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Network fails, serve cached version
        });

      return cached || fetchPromise;
    })
  );
});
