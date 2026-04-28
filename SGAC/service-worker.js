const CACHE_NAME = "sgac-front-v1";
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./js/app.js",
  "./js/config.js",
  "./js/state.js",
  "./js/utils.js",
  "./js/ui.js",
  "./js/auth.js",
  "./js/admin.js",
  "./js/student.js",
  "./js/coordinator.js",
  "./js/pwa.js",
  "./assets/senac-logo.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE)),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches
      .match(event.request)
      .then(
        (cached) =>
          cached ||
          fetch(event.request).catch(() => caches.match("./index.html")),
      ),
  );
});
