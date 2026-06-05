// Offline-capable cache with a safe update strategy.
//
// IMPORTANT: navigations (the HTML shell) use **network-first** so a new
// deploy is always picked up. The previous cache-first shell would keep
// serving a stale index.html that points at hashed JS/CSS that no longer
// exist after a redeploy → 404 → blank page. Hashed build assets are
// immutable, so for those we use cache-first.
//
// Bump CACHE whenever this file changes so `activate` purges old caches.
const CACHE = 'focusflow-v2';
const SHELL = './';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.add(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // App shell / page navigations → network-first, fall back to cache offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(SHELL, copy));
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match(SHELL))),
    );
    return;
  }

  // Static assets (hashed, immutable) → cache-first, then network.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const url = new URL(req.url);
          if (url.origin === location.origin && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached || Response.error());
    }),
  );
});
