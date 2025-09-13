const CACHE = 'clicksmart-v1';
const ASSETS = [
  '/',
  '/Tech_News.html',
  '/styles/site.css',
  '/scripts/site.js',
  '/favicon.svg',
  '/site.webmanifest',
  '/public/icons/icon-192.svg',
  '/public/icons/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // For navigations, try network first then cache
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }
  // For other requests, cache-first
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req))
  );
});

