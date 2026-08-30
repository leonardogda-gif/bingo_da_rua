const CACHE = "bingo-da-rua-v2-0";

const CORE = [
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k.startsWith("bingo-da-rua-") && k !== CACHE)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if(event.request.method !== "GET") return;

  const req = event.request;
  const url = new URL(req.url);

  // Never cache the release marker.
  if(url.pathname.endsWith("/version.json")){
    event.respondWith(
      fetch(req, {cache:"no-store"})
        .catch(() => new Response('{"version":"1.17"}', {
          headers: {"Content-Type":"application/json"}
        }))
    );
    return;
  }

  // Always prefer the network for the app shell/navigation.
  if(req.mode === "navigate" || url.pathname.endsWith("/index.html")){
    event.respondWith(
      fetch(req, {cache:"no-store"})
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put("./index.html", copy)).catch(()=>{});
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      if(cached) return cached;

      return fetch(req).then(response => {
        if(response && response.ok){
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy)).catch(()=>{});
        }
        return response;
      });
    })
  );
});
