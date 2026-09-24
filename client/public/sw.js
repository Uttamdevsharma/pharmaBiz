// PharmaBiz Offline POS Service Worker
const CACHE_NAME = "pharmabiz-pos-v1";

const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/favicon.ico",
];

// Install: pre-cache critical shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate: cleanup older caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network first with cache fallback
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never cache POST / PUT / PATCH / DELETE mutation APIs
  if (request.method !== "GET") {
    return;
  }

  // API calls are handled by IndexedDB in offlineDb.ts, don't intercept with Service Worker cache
  if (request.url.includes("/api/")) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses for scripts, styles, images, and fonts
        if (
          response &&
          response.status === 200 &&
          (request.destination === "style" ||
            request.destination === "script" ||
            request.destination === "image" ||
            request.destination === "font")
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if network fails (offline power outage)
        return caches.match(request).then((cached) => cached || caches.match("/dashboard"));
      })
  );
});
