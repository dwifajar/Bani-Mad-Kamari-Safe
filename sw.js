
const CACHE_NAME = "bmk-v14-39-shell";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/css/style.css",
  "./assets/js/app.js",
  "./assets/js/cloud.js",
  "./assets/js/supabase-config.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

function isNavigation(request){
  return request.mode === "navigate" ||
    (request.headers.get("accept") || "").includes("text/html");
}

function isStaticAsset(url){
  return /\.(?:css|js|png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(url.pathname);
}

function timeout(ms){
  return new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));
}

self.addEventListener("fetch", event => {
  const req = event.request;
  if(req.method !== "GET") return;

  const url = new URL(req.url);

  // Keep Supabase and external CDN requests live and uncached.
  if(
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("supabase.com") ||
    url.origin !== self.location.origin
  ) return;

  if(isNavigation(req)){
    // Fast network-first navigation. If the network is slow, show the cached
    // public page instead of leaving a blank/white launch screen waiting.
    event.respondWith(
      Promise.race([fetch(req), timeout(2200)])
        .then(response => {
          if(response && response.ok){
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          }
          return response;
        })
        .catch(() =>
          caches.match(req).then(cached =>
            cached || caches.match("./index.html")
          )
        )
    );
    return;
  }

  if(isStaticAsset(url)){
    // Static files are served from cache immediately after the first install.
    event.respondWith(
      caches.match(req).then(cached => {
        const network = fetch(req).then(response => {
          if(response && response.ok){
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          }
          return response;
        }).catch(() => cached);

        return cached || network;
      })
    );
    return;
  }

  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
