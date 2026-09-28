// public/sw.js
// Service Worker for I.E. Denzil Escolar - Seguimiento Conductual y TDR
const CACHE_NAME = 'denzil-tdr-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/denzil.png',
  '/sello_denzil.png',
  '/logo_cat.png',
  '/idle.png',
  '/hablando.png',
  '/empatica.png',
  '/celebrando.png',
  '/apuntando_notas.png',
  '/pulgar_arriba.png',
  '/saludo.png',
  '/pensando.png',
  '/senalando.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // For navigation requests: Network first, falling back to cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // For static assets (images, scripts, styles): Cache first, fallback to network
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          // Do not cache API proxy or dynamic endpoints
          if (!url.pathname.startsWith('/api/')) {
            cache.put(event.request, responseToCache);
          }
        });
        return response;
      });
    }).catch(() => {
      // Offline fallback for images
      if (event.request.destination === 'image') {
        return caches.match('/denzil.png');
      }
      return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    })
  );
});
