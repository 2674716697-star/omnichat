/* ============================================================
   Mira — Service Worker
   HTML: network-first + cache fallback (prevents stale HTML + new JS/CSS mix).
   Static assets (CSS/JS/images): cache-first + background refresh.
   Wallpapers: network-first + cache fallback.
   NEVER caches sw.js.  NEVER intercepts API calls.
   ============================================================ */

const CACHE_NAME = 'omnichat-mqgabort';
const CORE_ASSET_RE = /\.(?:html|css|js|json|svg|png|jpe?g|gif)$/i;

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

  // Wallpapers: network-first — always try network, cache for offline fallback.
  // Avoids cache-first serving stale/missing backgrounds after deploys.
  const WALLPAPER_RE = /\/bg\/.+\.(jpg|jpeg|gif|png|webp)$/i;
  if (WALLPAPER_RE.test(url.pathname)) {
    event.respondWith(
      (async () => {
        try {
          const netResp = await fetch(event.request);
          if (netResp.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, netResp.clone());
          }
          return netResp;
        } catch (_) {
          const cached = await caches.match(event.request);
          return cached || new Response('Offline', { status: 503 });
        }
      })()
    );
    return;
  }

  const isDocument = event.request.destination === 'document';
  const isIndex = INDEX_PATHS.has(url.pathname);

  // ==================================================================
  // Document/HTML requests: NETWORK-FIRST with cache fallback.
  // Prevents stale HTML from loading mismatched new JS/CSS after deploys.
  // Cache is updated on every successful network fetch for offline fallback.
  // ==================================================================
  if (isDocument || isIndex) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);

        // 1. Try network first — always get fresh HTML
        try {
          const preload = event.preloadResponse;
          const netResp = preload ? await preload : await fetch(event.request);
          if (netResp.ok) {
            // Cache for offline fallback (not for next navigation — we always go network)
            cache.put(event.request, netResp.clone());
            const indexUrl = new URL('/omnichat/index.html', self.location.origin);
            cache.put(new Request(indexUrl, { method: 'GET' }), netResp.clone());
          }
          return netResp;
        } catch (_err) {
          // Network failed — fall back to cache
        }

        // 2. Cache fallback: try exact match first
        const cached = await cache.match(event.request);
        if (cached) return cached;

        // 3. Try index.html variants from cache
        const indexCached = await cache.match('/omnichat/index.html');
        if (indexCached) return indexCached;
        const rootCached = await cache.match('/omnichat/');
        if (rootCached) return rootCached;

        // 4. Last resort: inline offline page
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
      })()
    );
    return;
  }

  // ==================================================================
  // Static assets (CSS, JS, images, etc.): CACHE-FIRST with background
  // network refresh. Instant repeat loads, cache updates silently.
  // ==================================================================
  if (CORE_ASSET_RE.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);

        // 1. Try cache first — instant return for repeat visits
        const cached = await cache.match(event.request);
        if (cached) {
          // Background refresh: update cache for next time
          event.waitUntil(
            (async () => {
              try {
                const netResp = await fetch(event.request);
                if (netResp.ok) cache.put(event.request, netResp.clone());
              } catch (_) { /* network unavailable — cached version is fine */ }
            })()
          );
          return cached;
        }

        // 2. No cache — go to network (first visit / cache cleared)
        try {
          const netResp = await fetch(event.request);
          if (netResp.ok) cache.put(event.request, netResp.clone());
          return netResp;
        } catch (_err) {
          return new Response('Offline', { status: 503 });
        }
      })()
    );
    return;
  }

  // Other assets: same cache-first with background refresh
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request);
      if (cached) {
        event.waitUntil(
          (async () => {
            try {
              const netResp = await fetch(event.request);
              if (netResp.ok) cache.put(event.request, netResp.clone());
            } catch (_) {}
          })()
        );
        return cached;
      }
      try {
        const netResp = await fetch(event.request);
        if (netResp.ok) cache.put(event.request, netResp.clone());
        return netResp;
      } catch (_err) {
        return new Response('Offline', { status: 503 });
      }
    })()
  );
});
