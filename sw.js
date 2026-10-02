/* BANI MAD KAMARI — PWA + Web Push Service Worker V14.50 */

importScripts('./assets/js/bmk-notification-state.js');

const CACHE_NAME = "bmk-v14-50-shell";
const APP_SHELL = [
  "./",
  "./index.html",
  "./notifikasi.html",
  "./manifest.webmanifest",
  "./assets/css/style.css",
  "./assets/js/app.js",
  "./assets/js/cloud.js",
  "./assets/js/supabase-config.js",
  "./assets/js/push-config.js",
  "./assets/js/bmk-push.js",
  "./assets/js/bmk-notification-state.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
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

/* Incoming Web Push messages may arrive while no page/tab is open. */
self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (_) { data = { body: event.data ? event.data.text() : "Pengumuman baru BANI MAD KAMARI" }; }

  const title = String(data.title || "BANI MAD KAMARI");
  const notificationId = String(data?.data?.notificationId || data.notificationId || "").trim();
  const targetUrl = String(data?.data?.url || data.url || "/notifikasi.html");
  const options = {
    body: String(data.body || "Ada pengumuman baru.").slice(0, 400),
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/icons/icon-192.png",
    tag: data.tag || (notificationId ? `bmk-notif-${notificationId}` : "bmk-notification"),
    renotify: Boolean(data.renotify),
    requireInteraction: true,
    timestamp: Date.now(),
    data: {
      ...(data.data || {}),
      notificationId,
      url: targetUrl
    }
  };

  event.waitUntil((async () => {
    let badgePromise = Promise.resolve();
    if (notificationId && self.BMKNotificationState) {
      badgePromise = self.BMKNotificationState.addUnread(notificationId);
    }

    const showPromise = self.registration.showNotification(title, options);

    await Promise.allSettled([badgePromise, showPromise]);

    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.all(list.map(client => {
      try {
        client.postMessage({ type: 'bmk-push-arrived', notificationId, url: targetUrl });
      } catch (_) {}
      return Promise.resolve();
    }));
  })());
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = event.notification?.data?.url || "/notifikasi.html";
  event.waitUntil((async () => {
    const absolute = new URL(target, self.location.origin).href;
    const clientsList = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clientsList) {
      if (new URL(client.url).origin === self.location.origin) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(absolute);
          return;
        }
      }
    }
    if (clients.openWindow) await clients.openWindow(absolute);
  })());
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if(req.method !== "GET") return;

  const url = new URL(req.url);

  if(
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("supabase.com") ||
    url.origin !== self.location.origin
  ) return;

  if(isNavigation(req)){
    event.respondWith(
      caches.match(req).then(cached => {
        const refresh = fetch(req).then(response => {
          if(response && response.ok){
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          }
          return response;
        }).catch(() => null);

        if(cached) return cached;
        return refresh.then(response =>
          response || caches.match("./index.html")
        );
      })
    );
    return;
  }

  if(isStaticAsset(url)){
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

  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
