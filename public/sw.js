// Cache the public offline page and immutable app files, never HTML or live forecasts.
const CACHE = 'nightjar-offline-v4';
const STATIC_CACHE = 'nightjar-static-v1';
const MAX_STATIC_FILES = 80;
const OFFLINE = '/offline';
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
});
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(async cache => {
    const response = await fetch(OFFLINE, { cache: 'reload', redirect: 'error' });
    if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) throw new Error('Offline page unavailable');
    await cache.put(OFFLINE, response);
  }));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => (key.startsWith('nightjar-offline-') && key !== CACHE) || (key.startsWith('nightjar-static-') && key !== STATIC_CACHE)).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => {
      try { const cached = await caches.match(OFFLINE); if (cached) return cached; } catch { /* Storage can be unavailable. */ }
      return new Response('Nightjar is offline. Reconnect and reload.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    }));
    return;
  }
  if (!url.pathname.startsWith('/_next/static/') || url.search || request.headers.has('authorization')) return;
  event.respondWith((async () => {
    let cache;
    try {
      cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
    } catch { /* Cache reads must not prevent an online request. */ }
    const response = await fetch(request);
    const contentType = response.headers.get('content-type') || '';
    const cacheControl = response.headers.get('cache-control') || '';
    if (cache && response.ok && response.type === 'basic' && /javascript|text\/css|font\/|image\//i.test(contentType) && !/private|no-store/i.test(cacheControl)) {
      try {
        await cache.put(request, response.clone());
        const keys = await cache.keys();
        await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_STATIC_FILES)).map(key => cache.delete(key)));
      } catch { /* A full or disabled cache must not block the app file. */ }
    }
    return response;
  })());
});
