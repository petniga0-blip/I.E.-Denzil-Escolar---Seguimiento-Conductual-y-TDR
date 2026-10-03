// public/sw.js
// Service Worker for I.E. Denzil Escolar - Seguimiento Conductual y TDR
const CACHE_NAME = 'denzil-tdr-v2';

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

  // Never cache API proxy or dynamic endpoints
  if (url.pathname.startsWith('/api/')) return;

  // Code (scripts, styles, workers, Vite dev modules): NETWORK FIRST so that
  // updates are always seen; fall back to cache only when offline.
  const isCode =
    ['script', 'style', 'worker'].includes(event.request.destination) ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/node_modules/') ||
    /\.(js|mjs|css|tsx?|json)$/.test(url.pathname);

  if (isCode) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then(
            (cached) => cached || new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
          )
        )
    );
    return;
  }

  // Static assets (images, fonts): Cache first, fallback to network
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
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