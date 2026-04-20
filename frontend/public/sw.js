// NEXUS Service Worker - Full Offline Support
// Bump CACHE_VERSION whenever a deploy contains UI that must replace a cached
// bundle — the SW's cache-first strategy for /_next/static will otherwise
// keep serving the prior build. Bumping purges every client's cache on their
// next visit so newly-shipped UI (e.g. Generate WO button, labor tracker
// fixes) becomes visible without users needing to clear site data manually.
const CACHE_VERSION = 'nexus-v4';
const CACHE_NAME = `${CACHE_VERSION}-all`;

// Install: activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate: claim clients, clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET (mutations handled by app's offline queue)
  if (request.method !== 'GET') return;

  // Skip non-http
  if (!url.protocol.startsWith('http')) return;

  // Skip HMR / dev stuff
  if (url.pathname.includes('__nextjs') || url.pathname.includes('webpack-hmr')) return;

  // For page navigations: network-first, cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  // Next.js RSC requests (have special headers) — network-first
  if (request.headers.get('rsc') === '1' || request.headers.get('next-router-state-tree')) {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  // Static assets (JS, CSS, fonts, images) — cache-first (they have hashed filenames)
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(js|css|woff2?|svg|png|jpg|jpeg|gif|ico|webp)$/)
  ) {
    event.respondWith(cacheFirstWithNetwork(request));
    return;
  }

  // API calls — network-first, serve cached if offline
  if (url.pathname.startsWith('/api/') || (url.origin !== self.location.origin && url.pathname.includes('/'))) {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  // Everything else — network-first
  event.respondWith(networkFirstWithCache(request));
});

// Cache-first: great for immutable assets with hashed filenames
async function cacheFirstWithNetwork(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

// Network-first: try network, fall back to cache
async function networkFirstWithCache(request) {
  try {
    const response = await fetch(request);
    // Cache successful responses
    if (response.ok && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Network failed — try cache
    const cached = await caches.match(request);
    if (cached) return cached;

    // For navigation requests, try to serve the cached dashboard or any cached page
    if (request.mode === 'navigate') {
      // Try exact URL first
      const exactCached = await caches.match(request.url);
      if (exactCached) return exactCached;

      // Try dashboard as fallback
      const dashCached = await caches.match('/dashboard');
      if (dashCached) return dashCached;

      // Try root
      const rootCached = await caches.match('/');
      if (rootCached) return rootCached;

      // Last resort: offline page
      return new Response(offlineHTML(), {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // For API calls, return offline JSON
    if (request.headers.get('accept')?.includes('application/json')) {
      return new Response(
        JSON.stringify({ offline: true, message: 'You are offline. Showing cached data.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response('', { status: 503, statusText: 'Offline' });
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
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .c { text-align: center; padding: 2rem; max-width: 400px; }
    .icon { width: 64px; height: 64px; margin: 0 auto 1.5rem; background: #1e293b; border-radius: 16px; display: flex; align-items: center; justify-content: center; }
    .icon svg { width: 32px; height: 32px; color: #f59e0b; }
    h1 { font-size: 1.25rem; color: #f8fafc; margin-bottom: 0.5rem; font-weight: 700; }
    p { color: #94a3b8; font-size: 0.8125rem; line-height: 1.5; margin-bottom: 0.75rem; }
    .hint { background: #1e293b; border-radius: 8px; padding: 0.75rem 1rem; margin: 1rem 0; }
    .hint p { font-size: 0.75rem; margin: 0; }
    .btn { margin-top: 1rem; padding: 0.625rem 1.5rem; background: #0d9488; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.8125rem; transition: background 0.2s; }
    .btn:hover { background: #0f766e; }
    .btn:active { transform: scale(0.98); }
  </style>
</head>
<body>
  <div class="c">
    <div class="icon">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 5.636a9 9 0 010 12.728m-2.829-2.829a5 5 0 000-7.07m-4.243 9.9a9 9 0 01-4.95-4.95M3 3l18 18"/>
      </svg>
    </div>
    <h1>You're Offline</h1>
    <p>NEXUS can't connect to the internet right now.</p>
    <div class="hint">
      <p><strong>Tip:</strong> Visit pages while online first — they'll be available offline automatically. Previously visited pages should still work.</p>
    </div>
    <button class="btn" onclick="window.location.reload()">Try Again</button>
  </div>
</body>
</html>`;
}

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SYNC_OFFLINE') {
    // Notify all clients to run their sync logic
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => client.postMessage({ type: 'RUN_SYNC' }));
    });
  }
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME);
  }
  if (event.data?.type === 'PRECACHE_PAGES') {
    // Pre-cache pages in background
    const pages = event.data.pages || [];
    caches.open(CACHE_NAME).then((cache) => {
      pages.forEach((url) => {
        fetch(url, { credentials: 'same-origin' })
          .then((res) => { if (res.ok) cache.put(url, res); })
          .catch(() => {});
      });
    });
  }
});

// Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'nexus-offline-sync') {
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => client.postMessage({ type: 'RUN_SYNC' }));
    });
  }
});
