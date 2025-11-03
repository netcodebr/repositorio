/* ======================================================
 🧩 Conversor de Imagens PWA - Service Worker
 👨‍💻 Criado por: Nelson Ferreira do Nascimento Junior
 🚀 Versão: 6.0 (Atualizado em 2025-11-03)
====================================================== */

const CACHE_NAME = "conversor-pwa-v6";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js",
  "https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js",
  "https://cdn.jsdelivr.net/npm/sweetalert2@11",
];

/* ====== INSTALL: Pré-carrega os arquivos principais ====== */
self.addEventListener("install", (event) => {
  console.log("🪣 Instalando Service Worker...");

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("📦 Cache inicial criado:", CACHE_NAME);
      return cache.addAll(APP_SHELL);
    })
  );

  self.skipWaiting();
});

/* ====== ACTIVATE: Remove caches antigos ====== */
self.addEventListener("activate", (event) => {
  console.log("🔁 Ativando Service Worker...");

  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("🧹 Limpando cache antigo:", key);
            return caches.delete(key);
          }
        })
      )
    )
  );

  self.clients.claim();
});

/* ====== FETCH: Estratégia offline-first ====== */
self.addEventListener("fetch", (event) => {
  // Ignora requisições externas de analytics ou ícones externos
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Serve do cache se disponível
      if (cachedResponse) return cachedResponse;

      // Caso contrário, busca na rede e adiciona ao cache
      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          const clonedResponse = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clonedResponse);
          });

          return networkResponse;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});

/* ====== MENSAGEM OPCIONAL DE ATUALIZAÇÃO ====== */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
