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

async function staleWhileRevalidate(event) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(SHELL_URL);

  const network = fetch(event.request)
    .then((response) => {
      if (response.ok) cache.put(SHELL_URL, response.clone());
      return response;
    })
    .catch(() => cached);

  event.waitUntil(network.catch(() => {}));
  return cached || network;
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
  self.skipWaiting();
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
