const CACHE_NAME = 'velocimetro-v1';
const FILES_TO_CACHE = [
  './',
  './index.html',
  './velocimetro.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-256.png',
  './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request)
      .then(resp => resp || fetch(e.request))
      .catch(() => caches.match('./index.html'))
  );
});
