/* ============================================================
   OmniChat — Service Worker
   Network-first app shell, offline fallback, NEVER caches sw.js.
   ============================================================ */

const CACHE_NAME = 'omnichat-runtime';
const CORE_ASSET_RE = /\.(?:html|css|js|json)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => {
        return Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      }),
      self.registration.navigationPreload ? self.registration.navigationPreload.enable() : Promise.resolve(),
    ]).then(() => self.clients.claim())
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
  if (url.origin !== self.location.origin) return;

  // NEVER cache sw.js — this is how SW update deadlock happens
  if (url.pathname.endsWith('sw.js')) return;

  // Never intercept API calls
  if (url.pathname.includes('/v1/') || url.pathname.includes('/chat/completions') || url.pathname.includes('/models')) return;

  const isCoreAsset =
    event.request.destination === 'document' ||
    url.pathname === '/' ||
    url.pathname.endsWith('/omnichat/') ||
    CORE_ASSET_RE.test(url.pathname);

  // Core app files are network-first so deploys are picked up without manual
  // service worker version bumps. Cached fallback is only for offline use.
  if (isCoreAsset) {
    event.respondWith(
      Promise.resolve(event.preloadResponse).then((preload) => {
        return preload || fetch(event.request);
      }).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Other assets are also network-first, with cache fallback for offline use.
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});
