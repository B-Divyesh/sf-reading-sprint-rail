const VERSION = 'rsr-shell-v3';
const RUNTIME = 'rsr-runtime-v3';
const STATIC_SHELL = [
  '/', '/offline.html', '/manifest.webmanifest',
  '/assets/icon.svg', '/assets/icon-192.png', '/assets/icon-512.png', '/assets/icon-maskable-512.png',
  '/assets/atkinson-400.woff2', '/assets/atkinson-700.woff2',
  '/assets/rail-landscape.png', '/assets/rail-landscape.webp', '/assets/rail-landscape-768.webp',
];

function shellAssetUrls(html) {
  const attributes = /\b(?:src|href)=["']([^"']+)["']/g;
  const urls = new Set(STATIC_SHELL);
  let match;
  while ((match = attributes.exec(html))) {
    const url = new URL(match[1], self.location.origin);
    if (url.origin === self.location.origin) urls.add(`${url.pathname}${url.search}`);
  }
  return [...urls];
}

async function precacheShell() {
  const cache = await caches.open(VERSION);
  // Vite fingerprints its JS and CSS. Read the generated production HTML so
  // every deployment caches the current entry files, rather than a stale list.
  const appShell = await fetch('/', { cache: 'reload' });
  if (!appShell.ok) throw new Error(`Could not cache the app shell (${appShell.status})`);
  const html = await appShell.clone().text();
  await cache.put('/', appShell);
  await cache.addAll(shellAssetUrls(html).filter((url) => url !== '/'));
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()));
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
    event.respondWith(fetch(request).then((response) => { const copy = response.clone(); caches.open(RUNTIME).then((cache) => cache.put('/', copy)); return response; }).catch(async () => (await caches.match('/', { ignoreVary: true })) || caches.match('/offline.html', { ignoreVary: true })));
    return;
  }
  event.respondWith(caches.match(request, { ignoreVary: true }).then((cached) => cached || fetch(request).then((response) => { if (response.ok) { const copy = response.clone(); caches.open(RUNTIME).then((cache) => cache.put(request, copy)); } return response; })));
});
