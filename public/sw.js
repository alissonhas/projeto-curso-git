/* Cache somente de recursos públicos. Nunca guardar HTML autenticado, RSC, API ou respostas Supabase. */
const CACHE = 'ah-public-v2';
const PUBLIC_PATHS = ['/offline.html', '/logo-ah.png', '/pwa-icon/192', '/pwa-icon/512'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PUBLIC_PATHS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('ah-public-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => (await caches.match('/offline.html', { cacheName: CACHE })) || Response.error()));
    return;
  }
  if (url.search || !PUBLIC_PATHS.includes(url.pathname)) return;
  event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(request)) || fetch(request)));
});
