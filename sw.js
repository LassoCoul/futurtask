// Service Worker pour FuturTask PWA
const CACHE_NAME = "futurTask-v1.0.0";
const STATIC_CACHE = "futurTask-static-v1.0.0";
const DYNAMIC_CACHE = "futurTask-dynamic-v1.0.0";

// Ressources à mettre en cache
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/stats.html",
  "/styles.css",
  "/script.js",
  "/stats.js",
  "/manifest.json",
  "https://cdn.jsdelivr.net/npm/chart.js",
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
];

// Installation du Service Worker
self.addEventListener("install", (event) => {
  console.log("Service Worker: Installation en cours...");

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log("Service Worker: Mise en cache des ressources statiques");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log("Service Worker: Installation terminée");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("Service Worker: Erreur lors de l'installation", error);
      })
  );
});

// Activation du Service Worker
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activation en cours...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log(
                "Service Worker: Suppression de l'ancien cache",
                cacheName
              );
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("Service Worker: Activation terminée");
        return self.clients.claim();
      })
  );
});

// Interception des requêtes réseau
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Stratégie de cache pour les ressources statiques
  if (request.method === "GET" && isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          console.log(
            "Service Worker: Ressource trouvée en cache",
            url.pathname
          );
          return response;
        }

        return fetch(request)
          .then((fetchResponse) => {
            if (fetchResponse && fetchResponse.status === 200) {
              const responseClone = fetchResponse.clone();
              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return fetchResponse;
          })
          .catch(() => {
            // Fallback pour les ressources critiques
            if (url.pathname === "/" || url.pathname === "/index.html") {
              return caches.match("/index.html");
            }
            if (url.pathname === "/stats.html") {
              return caches.match("/stats.html");
            }
          });
      })
    );
  }

  // Stratégie de cache pour les requêtes dynamiques
  else if (request.method === "GET") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
  }
});

// Fonction pour identifier les ressources statiques
function isStaticAsset(pathname) {
  const staticExtensions = [
    ".html",
    ".css",
    ".js",
    ".json",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".ico",
  ];
  const staticPaths = [
    "/",
    "/index.html",
    "/stats.html",
    "/styles.css",
    "/script.js",
    "/stats.js",
    "/manifest.json",
  ];

  return (
    staticPaths.includes(pathname) ||
    staticExtensions.some((ext) => pathname.endsWith(ext)) ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/screenshots/")
  );
}

// Gestion des messages du client
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "GET_VERSION") {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Gestion des notifications push (pour futures fonctionnalités)
self.addEventListener("push", (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1,
      },
      actions: [
        {
          action: "explore",
          title: "Voir les tâches",
          icon: "/icons/add-task-96x96.png",
        },
        {
          action: "close",
          title: "Fermer",
          icon: "/icons/close-96x96.png",
        },
      ],
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

// Gestion des clics sur les notifications
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "explore") {
    event.waitUntil(clients.openWindow("/"));
  } else if (event.action === "close") {
    // Ne rien faire, notification déjà fermée
  } else {
    // Clic sur la notification principale
    event.waitUntil(clients.openWindow("/"));
  }
});

// Gestion des erreurs
self.addEventListener("error", (event) => {
  console.error("Service Worker: Erreur", event.error);
});

// Gestion des rejets de promesses non gérés
self.addEventListener("unhandledrejection", (event) => {
  console.error("Service Worker: Promesse rejetée non gérée", event.reason);
});
