// Service Worker for Scanner PWA
const CACHE_NAME = 'tdp-scanner-v1';
const RUNTIME_CACHE = 'tdp-scanner-runtime-v1';

// Minimal assets to cache - scanner needs real-time data
const PRECACHE_ASSETS = [
  '/scanner',
];

// Install event - cache minimal assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
          })
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - network first strategy for real-time validation
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle requests within /scanner scope
  if (!url.pathname.startsWith('/scanner') && !url.pathname.startsWith('/api')) {
    return;
  }

  // API routes - always network first, no cache for validation endpoints
  if (url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(request).catch(() => {
        // Only fallback to cache if completely offline
        return caches.match(request);
      })
    );
    return;
  }

  // Static assets - cache first
  if (request.destination === 'image' || request.destination === 'font') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        return cachedResponse || fetch(request);
      })
    );
    return;
  }

  // HTML/JS/CSS - network first, minimal caching
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only cache if not a validation endpoint
        if (!url.pathname.includes('/validate') && !url.pathname.includes('/scan')) {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

