self.addEventListener("install", e => {
  e.waitUntil(caches.open("focusflow-cache-v2").then(cache => {
    return cache.addAll(["/", "/index.html", "/style.css", "/script.js", "/manifest.json", "/favicon.ico"]);
  }));
});

self.addEventListener("fetch", e => {
  e.respondWith(caches.match(e.request).then(response => response || fetch(e.request)));
});

self.addEventListener("notificationclick", function(event) {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: "window" }).then(clientList => {
    if (clientList.length > 0) {
      const client = clientList[0];
      return client.focus();
    }
    return clients.openWindow('/');
  }));
});
