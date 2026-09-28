// Cache only the public offline page. Never cache authenticated HTML or live forecasts.
const CACHE = 'nightjar-offline-v1';
const OFFLINE = '/offline';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(async cache => {
    const response = await fetch(OFFLINE, { cache: 'reload', redirect: 'error' });
    if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) throw new Error('Offline page unavailable');
    await cache.put(OFFLINE, response);
  }));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('nightjar-offline-') && key !== CACHE).map(key => caches.delete(key)))));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(async () => (await caches.match(OFFLINE)) || new Response('Nightjar is offline. Reconnect and reload.', { status: 503, headers: { 'Content-Type': 'text/plain' } })));
});
