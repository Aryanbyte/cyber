// CyberGuard Service Worker — PWA Offline + Caching
const CACHE_NAME = 'cyberguard-v2';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/chat.html',
    '/style.css',
    '/script.js',
    '/icon-192.png',
    '/icon-512.png',
    '/manifest.json'
];

// Install: cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch: network-first for API/socket, cache-first for static assets
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests, socket.io, and API calls
    if (event.request.method !== 'GET') return;
    if (url.pathname.startsWith('/socket.io')) return;
    if (url.pathname.startsWith('/api/')) return;

    event.respondWith(
        // Try network first, fall back to cache
        fetch(event.request)
            .then((response) => {
                // Clone and cache successful responses
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Offline: serve from cache
                return caches.match(event.request).then((cached) => {
                    if (cached) return cached;
                    // Fallback for navigation requests
                    if (event.request.mode === 'navigate') {
                        return caches.match('/');
                    }
                    return new Response('Offline', { status: 503 });
                });
            })
    );
});
