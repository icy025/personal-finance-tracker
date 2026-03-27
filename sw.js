// Service Worker — Personal Finance Tracker
// Caches the app shell + Chart.js so the app works fully offline.

const CACHE_NAME  = 'finance-tracker-v5';
const CHART_JS_URL   = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
const SUPABASE_JS_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

// Core local assets — these MUST be cached on install
const STATIC_ASSETS = [
  './',
  './index.html',
  './poker.html',
  './login.html',
  './manifest.json',
  './supabase-config.js',
  './icon.svg',
  './poker-icon.svg',
];

// --- INSTALL ---
// Cache local assets; attempt CDN asset but don't fail install if offline
self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(STATIC_ASSETS);
      // Best-effort: cache CDN scripts
      try { await cache.add(CHART_JS_URL); } catch (_) {}
      try { await cache.add(SUPABASE_JS_URL); } catch (_) {}
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
// Cache-first for local assets and CDN scripts only.
// Never cache Supabase API calls — those must always hit the network.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Pass Supabase API requests straight through — no caching
  if (url.hostname.endsWith('.supabase.co')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        return response;
      }).catch(() => {
        return new Response('Offline — resource not available.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        });
      });
    })
  );
});
