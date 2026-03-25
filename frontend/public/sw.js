// NEXUS Service Worker - Full Offline Support
const CACHE_VERSION = 'nexus-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;

// Pages to pre-cache on install
const PRECACHE_PAGES = [
  '/',
  '/dashboard',
  '/travelers',
  '/labor-tracking',
  '/reports',
  '/reports/analytics',
  '/notifications',
  '/profile',
  '/auth/login',
];

// API paths to cache for offline reading
const CACHEABLE_API_PATHS = [
  '/travelers/dashboard-summary',
  '/dashboard/stats',
  '/analytics/all',
  '/labor/',
  '/notifications/',
  '/work-centers-mgmt/',
];

// Install: pre-cache shell pages
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PAGE_CACHE).then((cache) => {
      return Promise.allSettled(
        PRECACHE_PAGES.map((url) =>
          cache.add(url).catch((err) => console.log(`SW: Failed to cache ${url}:`, err.message))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => !key.startsWith(CACHE_VERSION)).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (mutations handled by offline queue in app)
  if (request.method !== 'GET') return;

  // Skip chrome-extension, webpack HMR, etc
  if (!url.protocol.startsWith('http')) return;
  if (url.pathname.includes('__next') && url.pathname.includes('webpack')) return;

  // API requests: network-first, fall back to cache
  if (url.pathname.startsWith('/api/') || url.hostname !== self.location.hostname) {
    const isApiCall = CACHEABLE_API_PATHS.some((p) => url.pathname.includes(p));
    if (isApiCall || url.pathname.includes('/api/')) {
      event.respondWith(networkFirstAPI(request));
      return;
    }
  }

  // Static assets (_next/static): cache-first
  if (url.pathname.startsWith('/_next/static/') || url.pathname.match(/\.(js|css|woff2?|svg|png|jpg|ico)$/)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Page navigations: network-first with offline fallback
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstPage(request));
    return;
  }

  // Everything else: network with cache fallback
  event.respondWith(networkFirstAPI(request));
});

// Cache-first for static assets
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

// Network-first for API calls, cache response for offline use
async function networkFirstAPI(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ offline: true, message: 'You are offline. Showing cached data.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Network-first for page navigations
async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(PAGE_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Try cached version of this specific page
    const cached = await caches.match(request);
    if (cached) return cached;

    // Try cached version of the dashboard as fallback
    const dashCached = await caches.match('/dashboard');
    if (dashCached) return dashCached;

    // Last resort: offline page
    return new Response(offlineHTML(), {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

function offlineHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>NEXUS - Offline</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .container { text-align: center; padding: 2rem; }
    h1 { font-size: 1.5rem; color: #0d9488; margin-bottom: 0.5rem; }
    p { color: #94a3b8; font-size: 0.875rem; margin: 0.5rem 0; }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    .retry { margin-top: 1.5rem; padding: 0.75rem 2rem; background: #0d9488; color: white; border: none; border-radius: 0.5rem; font-weight: 600; cursor: pointer; font-size: 0.875rem; }
    .retry:hover { background: #0f766e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">&#128268;</div>
    <h1>NEXUS Offline</h1>
    <p>You're currently offline. The page you requested isn't cached yet.</p>
    <p>Previously visited pages will load from cache automatically.</p>
    <button class="retry" onclick="window.location.reload()">Retry Connection</button>
  </div>
</body>
</html>`;
}

// Listen for sync events (Background Sync API)
self.addEventListener('sync', (event) => {
  if (event.tag === 'nexus-offline-sync') {
    event.waitUntil(syncOfflineData());
  }
});

// Message handler for manual sync trigger
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SYNC_OFFLINE') {
    syncOfflineData().then(() => {
      event.ports?.[0]?.postMessage({ synced: true });
    });
  }
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
});

async function syncOfflineData() {
  // This is triggered by background sync or manual message
  // The actual sync logic lives in the app (offlineSync.ts) since it needs IndexedDB
  // We just notify all clients to run sync
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'RUN_SYNC' });
  });
}
