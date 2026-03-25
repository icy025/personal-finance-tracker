// Service Worker — Personal Finance Tracker
// Caches the app shell + Chart.js so the app works fully offline.

const CACHE_NAME  = 'finance-tracker-v1';
const CHART_JS_URL = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';

// Core local assets — these MUST be cached on install
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
];

// --- INSTALL ---
// Cache local assets; attempt CDN asset but don't fail install if offline
self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(STATIC_ASSETS);
      // Best-effort: cache Chart.js from CDN
      try { await cache.add(CHART_JS_URL); } catch (_) {}
    })()
  );
  // Activate immediately without waiting for old tabs to close
  self.skipWaiting();
});

// --- ACTIVATE ---
// Remove any old caches from previous versions
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// --- FETCH ---
// Cache-first for all requests: serve from cache, fall back to network
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // Not in cache — fetch from network and cache the response
      return fetch(event.request).then(response => {
        // Only cache valid responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        return response;
      }).catch(() => {
        // Network failed and no cache — nothing to serve
        return new Response('Offline — resource not available.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        });
      });
    })
  );
});
