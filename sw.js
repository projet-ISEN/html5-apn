
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('camera').then(cache => {
      return cache.addAll([
        '/',
        '/index.html',
        '/css/default.css',
        '/css/materialize.min.css',
        '/fonts',
        '/images'
      ])
      .then(() => self.skipWaiting());
    })
  )
});

self.addEventListener('activate',  event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
