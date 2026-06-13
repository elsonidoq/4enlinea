const CACHE_NAME = 'decodec4-shell-v2';

// ── Install: pre-cache nothing eagerly — cache on first use instead ──────────
self.addEventListener('install', () => {
  self.skipWaiting();
});

// ── Activate: purge old caches ───────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  // Pass through API requests and cross-origin requests (e.g. Supabase)
  if (event.request.url.includes('/api/')) return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  const { pathname } = new URL(event.request.url);

  // Navigation requests (HTML pages): network-first so the app always gets the
  // latest index.html after a deploy. Fall back to cache only when offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Hashed assets (JS, CSS, fonts from /assets/): cache-first — immutable URLs
  // mean a cached response is always the correct one.
  if (pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
    return;
  }

  // Everything else (manifest, favicon, icons, etc.): cache-first, network fallback
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      const cloned = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
      return response;
    }))
  );
});
