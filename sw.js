// sw.js - Service Worker for Morrow.AI

const CACHE_NAME = 'smartlocal-ai-cache-v1';

// On install, activate immediately
self.addEventListener('install', event => {
    self.skipWaiting();
});

// On activation, clean up old caches and take control of the page
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (CACHE_NAME !== cacheName) {
            console.log('Service Worker: clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
    // Only handle GET requests
    if (event.request.method !== 'GET') {
      return;
    }

    const url = new URL(event.request.url);
    const isSameOrigin = url.origin === self.location.origin;
    const isMaps = /(^|\.)googleapis\.com$/.test(url.hostname) || /(^|\.)gstatic\.com$/.test(url.hostname) || url.pathname.includes('/maps/api/');

    // Never intercept Google Maps or other third-party cross-origin requests
    if (!isSameOrigin || isMaps) {
      return; // Let the network handle it directly
    }

    // For navigation requests (loading the main page), use a network-first strategy
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
            .then(response => {
                // If the network request is successful, cache it
                return caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, response.clone());
                    return response;
                });
            })
            .catch(() => {
                // If the network fails, try to serve from the cache
                return caches.match(event.request);
            })
        );
        return;
    }

  // For all other same-origin requests (assets like JS, CSS, images), use a stale-while-revalidate strategy
    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(response => {
                const fetchPromise = fetch(event.request).then(networkResponse => {
                    // Update the cache with the new response from the network
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });

                // Return the cached version immediately if available, otherwise wait for the network
                return response || fetchPromise;
            });
        })
    );
});
