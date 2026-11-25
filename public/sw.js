// PWA service worker: stale-while-revalidate shell + cache-first build assets.
// The cached shell shows instantly on launch; updates land on the next launch.

const CACHE_NAME = 'tunet-pwa-v8';
// Artwork changes rarely and is expensive to re-download, so it lives in its
// own cache that survives app updates. A bounded cache keeps storage in check.
const ART_CACHE_NAME = 'tunet-device-art-v1';
const ART_CACHE_MAX_ENTRIES = 250;
const SHELL_URL = './index.html';

// ponytail: old hashed assets stay cached until CACHE_NAME is bumped. Bump it
// when cache growth matters; index revalidation keeps new deploys working.

function getShellAssetUrls(html) {
  return [...new Set([...html.matchAll(/(?:src|href)="(\.?\/?assets\/[^"]+)"/g)].map((m) => m[1]))];
}

async function cacheShellAssets(cache, html) {
  await Promise.all(
    getShellAssetUrls(html).map(async (url) => {
      // Hashed assets never change, so skip anything already cached. Without
      // this every navigation re-downloaded the whole shell in the background.
      if (await cache.match(url)) return;
      try {
        const res = await fetch(url, { cache: 'reload' });
        if (res.ok) await cache.put(url, res);
      } catch {
        // Non-fatal: asset gets cached on first runtime request instead.
      }
    })
  );
}

async function precacheShell() {
  const cache = await caches.open(CACHE_NAME);
  const response = await fetch(SHELL_URL, { cache: 'reload' });
  if (!response.ok) throw new Error(`shell fetch failed: ${response.status}`);

  const html = await response.clone().text();
  await cache.put(SHELL_URL, response);
  await cacheShellAssets(cache, html);
}

/**
 * Warm the lazily loaded chunks listed at build time. They are usually only
 * downloaded when a page/modal opens; fetching them now means the next cold
 * launch (and the first launch after an update) can paint pages from cache.
 */
async function precacheLazyAssets() {
  let manifest;
  try {
    const response = await fetch('./precache-manifest.json', { cache: 'no-store' });
    if (!response.ok) return;
    manifest = await response.json();
  } catch {
    return;
  }

  const assets = Array.isArray(manifest?.assets) ? manifest.assets : [];
  if (assets.length === 0) return;
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(
    assets.map(async ({ url }) => {
      if (!url || (await cache.match(url))) return;
      try {
        const response = await fetch(url, { cache: 'reload' });
        if (response.ok) await cache.put(url, response);
      } catch {
        // Individual failures stay lazy; the fetch handler retries on demand.
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
  const networkResponse = () =>
    event.preloadResponse
      ? event.preloadResponse.then((response) => response || fetch(event.request))
      : fetch(event.request);

  if (cached) {
    // Answer immediately from the cache and refresh the shell in the
    // background. Only touch the assets when the shell actually changed, so a
    // normal launch does not re-download the whole build.
    event.waitUntil(
      (async () => {
        const cachedHtml = await cached.clone().text();
        const response = await networkResponse();
        if (!response.ok) return;
        const html = await response.clone().text();
        await cache.put(SHELL_URL, response);
        if (html !== cachedHtml) await cacheShellAssets(cache, html);
      })().catch(() => {})
    );
    return cached;
  }

  // Nothing cached yet: either the network answers, or we show a small
  // offline page instead of the browser's error page.
  try {
    const response = await networkResponse();
    if (response.ok) cache.put(SHELL_URL, response.clone());
    return response;
  } catch {
    return offlineResponse();
  }
}

async function cacheFirst(request, cacheName = CACHE_NAME) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    if (cacheName === ART_CACHE_NAME) {
      const keys = await cache.keys();
      if (keys.length > ART_CACHE_MAX_ENTRIES) {
        await Promise.all(
          keys.slice(0, keys.length - ART_CACHE_MAX_ENTRIES).map((key) => cache.delete(key))
        );
      }
    }
  }
  return response;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      await precacheShell();
      await precacheLazyAssets();
    })().catch((error) => {
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
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key !== CACHE_NAME && key !== ART_CACHE_NAME)
              .map((key) => caches.delete(key))
          )
        ),
      // Fetch the navigation request in parallel with service-worker startup.
      // On a cold PWA launch this removes a full network round trip from the
      // time it takes before the cached shell can be shown.
      self.registration.navigationPreload
        ? self.registration.navigationPreload.enable()
        : Promise.resolve(),
    ])
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
    return;
  }

  // Device artwork is large and changes rarely. Cache each drawing the first
  // time it is shown so the dashboard keeps its illustrations offline.
  if (url.pathname.includes('/device-art/')) {
    event.respondWith(cacheFirst(request, ART_CACHE_NAME));
  }
});
