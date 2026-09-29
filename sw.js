// Songbook offline service worker.
//
// Bump CACHE_NAME any time you deploy a change and want to force
// every visitor's cache to refresh cleanly. Old cache versions are
// removed automatically on activate.
var CACHE_NAME = "songbook-shell-v4";

self.addEventListener("install", function (event) {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names
          .filter(function (name) { return name !== CACHE_NAME; })
          .map(function (name) { return caches.delete(name); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  var url = event.request.url;

  // Never intercept live data or realtime calls — those must always
  // hit the network (or fail loudly) so the app's own offline queue
  // logic can handle them, rather than silently serving stale data.
  if (event.request.method !== "GET") return;
  if (url.indexOf("supabase.co") !== -1) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(function (cache) {
      return fetch(event.request).then(function (response) {
        if (response && response.ok) {
          cache.put(event.request, response.clone());
        }
        return response;
      }).catch(function () {
        return cache.match(event.request).then(function (cached) {
          return cached || Promise.reject("offline-and-not-cached");
        });
      });
    })
  );
});
