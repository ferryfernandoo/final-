// DeeperNova Search Engine Service Worker (Ultra-lightweight PWA)
const CACHE_NAME = 'dpn-search-v1';
const STATIC_ASSETS = [
  '/search',
  '/search/',
  '/search/index.html',
  '/search/manifest.json',
  '/search/icons/icon-192.png',
  '/search/icons/icon-512.png',
  '/search/favicon.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW-Search] Pre-cache non-critical error:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME && key.startsWith('dpn-search-'))
            .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // NEVER cache API requests - always fresh network hits
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/search/api/')) {
    return;
  }

  // Handle navigation requests (SPA HTML) -> Network First with Cache Fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match('/search/index.html') || caches.match('/search'))
    );
    return;
  }

  // Static assets (CSS, JS, Fonts, Images) -> Cache First with Network Fallback
  if (
    url.pathname.startsWith('/search/assets/') ||
    url.pathname.startsWith('/search/icons/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
  }
});
