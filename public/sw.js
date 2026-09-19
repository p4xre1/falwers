/* Rose by Marry — service worker (first-party, no deps)
   HTML navigations: network-first with offline fallback to last-seen page / home.
   Versioned assets & images: cache-first (they are ?v= busted / immutable). */
const CACHE = 'rbm-v2';
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.startsWith('/admin')) return;
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/img/')) {
    e.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok) { const cl = res.clone(); (await caches.open(CACHE)).put(req, cl); }
        return res;
      } catch (err) { return hit; }
    })());
    return;
  }
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) { const cl = res.clone(); (await caches.open(CACHE)).put(req, cl); }
        return res;
      } catch (err) {
        const hit = await caches.match(req);
        return hit || caches.match('/');
      }
    })());
  }
});
