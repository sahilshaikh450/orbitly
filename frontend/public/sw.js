const C = "orbitly-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== C).map((x) => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => { const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(r).then((res) => { const c = res.clone(); caches.open(C).then((x) => x.put(r, c)); return res; }).catch(() => caches.match(r).then((m) => m || caches.match("/")))); });
self.addEventListener("notificationclick", (e) => { e.notification.close(); e.waitUntil(clients.matchAll({ type: "window" }).then((l) => (l.length ? l[0].focus() : clients.openWindow("/")))); });
