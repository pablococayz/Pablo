const CACHE_NAME = 'dinner-ai-cache-v1';

// On install, pre-cache the app shell
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([
          '/',
          '/index.html'
      ]);
    })
  );
});

// Clean up old caches on activation
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Use a network-first fetching strategy
self.addEventListener('fetch', event => {
  // Ignore non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // If the request is successful, clone the response and store it in the cache.
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        // If the network request fails (e.g., offline), try to serve from the cache.
        return caches.match(event.request)
            .then(response => {
                return response || new Response("Estás desconectado. Conéctate a internet para usar la aplicación.", { headers: { 'Content-Type': 'text/html' } });
            });
      })
  );
});
