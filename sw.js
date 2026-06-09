/* ============================================================
   Mira — Service Worker
   Network-first app shell, offline fallback, NEVER caches sw.js.
   ============================================================ */

const CACHE_NAME = 'omnichat-v3';
const CORE_ASSET_RE = /\.(?:html|css|js|json|svg|png)$/i;

// GitHub Pages serves the repo at /omnichat/; the app entry is index.html
// at that path, which the server also returns as the directory index.
const INDEX_PATHS = new Set(['/', '/omnichat/', '/omnichat/index.html']);

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

  const isDocument = event.request.destination === 'document';
  const isIndex = INDEX_PATHS.has(url.pathname);

  const isCoreAsset =
    isDocument ||
    isIndex ||
    CORE_ASSET_RE.test(url.pathname);

  // Core app files are network-first so deploys are picked up without manual
  // service worker version bumps. Cached fallback is only for offline use.
  if (isCoreAsset) {
    event.respondWith(
      (async () => {
        // Try network (with navigation preload if available)
        try {
          const preload = event.preloadResponse;
          const netResp = preload ? await preload : await fetch(event.request);
          if (netResp.ok) {
            const clone = netResp.clone();
            // Cache the actual response, keyed by request URL
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, clone);
            // For navigation requests to directory paths, also cache under
            // index.html so offline fallback can find it regardless of URL form.
            if (isDocument || isIndex) {
              const indexUrl = new URL('/omnichat/index.html', self.location.origin);
              cache.put(new Request(indexUrl, { method: 'GET' }), netResp.clone());
            }
          }
          return netResp;
        } catch (_err) {
          // Network failed — try cache, then offline fallback
        }

        // Try exact cache match first
        const cached = await caches.match(event.request);
        if (cached) return cached;

        // For navigation requests, try cached index.html as offline fallback
        if (isDocument || isIndex) {
          const indexCached = await caches.match('/omnichat/index.html');
          if (indexCached) return indexCached;
          const rootCached = await caches.match('/omnichat/');
          if (rootCached) return rootCached;
        }

        // Last resort: return a simple offline page inline
        if (isDocument || isIndex) {
          return new Response(
            '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">' +
            '<meta name="viewport" content="width=device-width,initial-scale=1">' +
            '<title>Mira — 离线</title>' +
            '<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;' +
            'justify-content:center;height:100vh;margin:0;background:#0f0f0f;color:#e0e0e0;' +
            'flex-direction:column;gap:12px}' +
            'h1{font-size:1.5rem;margin:0}.hint{font-size:.85rem;color:#888}' +
            '.btn{margin-top:8px;padding:10px 24px;border:none;border-radius:8px;' +
            'background:#4a9eff;color:#fff;font-size:.95rem;cursor:pointer}</style></head>' +
            '<body><h1>📡 当前离线</h1><p class="hint">Mira 需要网络连接才能加载</p>' +
            '<button class="btn" onclick="location.reload()">重试</button></body></html>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        }

        return new Response('Offline', { status: 503 });
      })()
    );
    return;
  }

  // Other assets are also network-first, with cache fallback for offline use.
  event.respondWith(
    (async () => {
      try {
        const netResp = await fetch(event.request);
        if (netResp.ok) {
          const clone = netResp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return netResp;
      } catch (_err) {
        const cached = await caches.match(event.request);
        return cached || new Response('Offline', { status: 503 });
      }
    })()
  );
});
