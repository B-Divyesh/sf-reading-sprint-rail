const VERSION = 'rsr-shell-v1';
const RUNTIME = 'rsr-runtime-v1';
const SHELL = ['/', '/offline.html', '/manifest.webmanifest', '/assets/icon.svg', '/assets/icon-192.png', '/assets/rail-landscape.webp'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => ![VERSION, RUNTIME].includes(key)).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('message', (event) => { if (event.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => { const copy = response.clone(); caches.open(RUNTIME).then((cache) => cache.put('/', copy)); return response; }).catch(async () => (await caches.match('/')) || caches.match('/offline.html')));
    return;
  }
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => { if (response.ok) { const copy = response.clone(); caches.open(RUNTIME).then((cache) => cache.put(request, copy)); } return response; })));
});
