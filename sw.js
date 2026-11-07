// sw.js: service worker. Guarda una copia de los archivos de la app para que
// se abra sin señal.
//
// Estrategia: entrega la copia guardada al instante y, en paralelo, intenta
// bajar la versión nueva para la próxima vez ("stale-while-revalidate").
// Cambia VERSION cuando quieras forzar que todos bajen archivos nuevos.

const VERSION = "v2";
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
      await cache.addAll(ARCHIVOS);
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

  ev.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const guardada = await cache.match(req, { ignoreSearch: true });
      const deRed = fetch(req)
        .then((resp) => {
          if (resp.ok) cache.put(req, resp.clone());
          return resp;
        })
        .catch(() => guardada);
      return guardada || deRed;
    })
  );
});
