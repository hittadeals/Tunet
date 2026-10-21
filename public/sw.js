// PWA service worker: stale-while-revalidate shell + cache-first build assets.
// The cached shell shows instantly on launch; updates land on the next launch.

const CACHE_NAME = 'tunet-pwa-v4';
const SHELL_URL = './index.html';

// ponytail: old hashed assets stay cached until CACHE_NAME is bumped. Bump it
// when cache growth matters; index revalidation keeps new deploys working.

async function precacheShell() {
  const cache = await caches.open(CACHE_NAME);
  const response = await fetch(SHELL_URL, { cache: 'reload' });
  if (!response.ok) throw new Error(`shell fetch failed: ${response.status}`);

  const html = await response.clone().text();
  await cache.put(SHELL_URL, response);

  const assets = new Set(
    [...html.matchAll(/(?:src|href)="(\.?\/?assets\/[^"]+)"/g)].map((match) => match[1])
  );

  await Promise.all(
    [...assets].map(async (url) => {
      try {
        const res = await fetch(url, { cache: 'reload' });
        if (res.ok) await cache.put(url, res);
      } catch {
        // Non-fatal: asset gets cached on first runtime request instead.
      }
    })
  );
}

const OFFLINE_FALLBACK = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Offline</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
        background: #0f172a;
        color: #f8fafc;
        text-align: center;
        padding: 2rem;
      }
      p { color: #94a3b8; }
    </style>
  </head>
  <body>
    <div>
      <h1>Offline</h1>
      <p>The dashboard shell is not cached yet. Reconnect to the network and reload.</p>
    </div>
  </body>
</html>`;

function offlineResponse() {
  return new Response(OFFLINE_FALLBACK, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

async function staleWhileRevalidate(event) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(SHELL_URL);

  const network = fetch(event.request)
    .then((response) => {
      if (response.ok) cache.put(SHELL_URL, response.clone());
      return response;
    })
    .catch(() => null);

  event.waitUntil(network.catch(() => {}));

  if (cached) {
    // Refresh in the background, but answer immediately from the cache.
    network.catch(() => {});
    return cached;
  }

  // Nothing cached yet: either the network answers, or we show a small
  // offline page instead of the browser's error page.
  const response = await network;
  return response || offlineResponse();
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    precacheShell().catch((error) => {
      console.warn('Shell precache failed:', error);
    })
  );
});

// The new worker waits until the user accepts the update, so a running
// dashboard never ends up with assets from two different versions.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(staleWhileRevalidate(event));
    return;
  }

  if (url.pathname.includes('/assets/')) {
    event.respondWith(cacheFirst(request));
  }
});
