const CACHE_NAME = 'superbet-v3';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './favicon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Skip non-GET requests and Supabase API calls to ensure live database sync
  if (e.request.method !== 'GET' || e.request.url.includes('supabase.co')) {
    return;
  }

  // Filter out unsupported schemes (like chrome-extension://, about:, data:)
  if (!e.request.url.startsWith('http://') && !e.request.url.startsWith('https://')) {
    return;
  }

  // For navigate / HTML requests, use Network-First to immediately fetch new assets/builds
  const isNavigation = e.request.mode === 'navigate' || 
                       e.request.headers.get('accept')?.includes('text/html');

  if (isNavigation) {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(e.request) || caches.match('./index.html') || caches.match('./');
        })
    );
  } else {
    // For static assets, use Cache-First with network fallback
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(e.request).then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, responseClone);
            });
          }
          return response;
        }).catch(() => {
          // Fallback if offline
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
    );
  }
});
