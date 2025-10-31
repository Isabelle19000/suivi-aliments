const CACHE_NAME = 'suivi-alimentaire-v1';
const ASSETS = [
  './',
  './index.html',
  './script.js',
  './manifest.json'
  // ajoute './icons/icon-192.png', './icons/icon-512.png' si présents
];

self.addEventListener('install', ev => {
  ev.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', ev => {
  ev.respondWith(
    caches.match(ev.request).then(cached => cached || fetch(ev.request).catch(()=>caches.match('./')))
  );
});
