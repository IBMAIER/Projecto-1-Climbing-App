// sw.js: service worker. Guarda una copia de los archivos de la app para que
// se abra sin señal.
//
// Estrategia "primero la red": con internet siempre baja la versión más
// reciente (y actualiza la copia); sin señal usa la copia guardada.
// Cambia VERSION en cada publicación para que los dispositivos se actualicen.

const VERSION = "v8";
const CACHE = `bitacora-${VERSION}`;
const SDK = "https://www.gstatic.com/firebasejs/10.12.2";

const ARCHIVOS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/estilos.css",
  "./js/app.js",
  "./js/db.js",
  "./js/config.js",
  "./js/calculos.js",
  "./js/formularios.js",
  "./js/ui.js",
  "./js/calendario.js",
  "./js/estadisticas.js",
  "./js/planes.js",
  "./iconos/icono-192.png",
  "./iconos/icono-512.png",
];

const SDK_ARCHIVOS = [
  `${SDK}/firebase-app.js`,
  `${SDK}/firebase-auth.js`,
  `${SDK}/firebase-firestore.js`,
];

// Evento install: se ejecuta la primera vez (o cuando cambia este archivo).
self.addEventListener("install", (ev) => {
  ev.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      // cache: "reload" evita la caché HTTP del navegador, que podría entregar
      // archivos de la versión anterior.
      await cache.addAll(ARCHIVOS.map((u) => new Request(u, { cache: "reload" })));
      // El SDK de Firebase es opcional (en modo local no se usa).
      await Promise.all(SDK_ARCHIVOS.map((u) => cache.add(u).catch(() => {})));
    })
  );
  self.skipWaiting();
});

// Evento activate: borra copias de versiones anteriores.
self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    caches.keys().then((claves) =>
      Promise.all(claves.filter((k) => k.startsWith("bitacora-") && k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Evento fetch: cada vez que la app pide un archivo.
self.addEventListener("fetch", (ev) => {
  const req = ev.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const propio = url.origin === self.location.origin;
  const sdkFirebase = url.href.startsWith("https://www.gstatic.com/firebasejs/");
  // Lo demás (login de Google, datos de Firestore) lo maneja Firebase.
  if (!propio && !sdkFirebase) return;

  // El SDK de Firebase tiene versión fija en la URL: copia guardada primero.
  if (sdkFirebase) {
    ev.respondWith(
      caches.open(CACHE).then(async (cache) =>
        (await cache.match(req)) ||
        fetch(req).then((resp) => {
          if (resp.ok) cache.put(req, resp.clone());
          return resp;
        }))
    );
    return;
  }

  // Archivos de la app: primero la red, sin caché HTTP; si falla, la copia.
  ev.respondWith(
    caches.open(CACHE).then(async (cache) => {
      try {
        // Con señal débil, a los 4 s se usa la copia guardada.
        const resp = await Promise.race([
          fetch(req, { cache: "no-cache" }),
          new Promise((_, rechazar) => setTimeout(() => rechazar(new Error("lento")), 4000)),
        ]);
        if (resp.ok) cache.put(req, resp.clone());
        return resp;
      } catch {
        return (await cache.match(req, { ignoreSearch: true })) ||
          (req.mode === "navigate" ? cache.match("./index.html") : Response.error());
      }
    })
  );
});
