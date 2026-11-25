// DeeperNova AI Service Worker (Lightweight Native-like PWA — Zero-Stale-Chunk Edition)
const CACHE_NAME = 'dpn-ai-v4';
const STATIC_SHELL = [
  '/manifest.json',
  '/logo192.png',
  '/logo512.png',
  '/favicon.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_SHELL).catch((err) => {
        console.warn('[SW-AI] Shell pre-cache non-critical warning:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME && key.startsWith('dpn-ai-'))
            .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. NEVER cache any API, stream, websocket, or search calls
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/v1/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/ws') ||
    url.pathname.startsWith('/search') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // 2. Navigation Requests (SPA HTML) -> Always fetch fresh no-store HTML first so Vite chunk hashes never go stale
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match('/index.html') || caches.match('/'))
    );
    return;
  }

  // 3. Hashed Vite Assets (/assets/*) -> Network-first / immutable cache (never serve 404 or HTML as JS)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((networkResponse) => {
          const ct = networkResponse.headers.get('content-type') || '';
          if (networkResponse && networkResponse.status === 200 && !ct.includes('text/html')) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 4. Static Icons/Fonts/Manifest -> Stale-While-Revalidate
  if (
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.json')
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return networkResponse;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
  }
});
