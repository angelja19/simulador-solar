/* Service worker: guarda la app para que funcione sin internet.
   Si cambia algun archivo, suba el numero de VERSION. */
const VERSION = "simulador-solar-v1";
const ARCHIVOS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/estilos.css",
  "./js/calculos.js",
  "./js/dibujos.js",
  "./js/app.js",
  "./lib/qrcode.js",
  "./lib/katex/katex.min.js",
  "./lib/katex/katex.min.css",
  "./lib/katex/fonts/KaTeX_AMS-Regular.woff2",
  "./lib/katex/fonts/KaTeX_Caligraphic-Bold.woff2",
  "./lib/katex/fonts/KaTeX_Caligraphic-Regular.woff2",
  "./lib/katex/fonts/KaTeX_Fraktur-Bold.woff2",
  "./lib/katex/fonts/KaTeX_Fraktur-Regular.woff2",
  "./lib/katex/fonts/KaTeX_Main-Bold.woff2",
  "./lib/katex/fonts/KaTeX_Main-BoldItalic.woff2",
  "./lib/katex/fonts/KaTeX_Main-Italic.woff2",
  "./lib/katex/fonts/KaTeX_Main-Regular.woff2",
  "./lib/katex/fonts/KaTeX_Math-BoldItalic.woff2",
  "./lib/katex/fonts/KaTeX_Math-Italic.woff2",
  "./lib/katex/fonts/KaTeX_SansSerif-Bold.woff2",
  "./lib/katex/fonts/KaTeX_SansSerif-Italic.woff2",
  "./lib/katex/fonts/KaTeX_SansSerif-Regular.woff2",
  "./lib/katex/fonts/KaTeX_Script-Regular.woff2",
  "./lib/katex/fonts/KaTeX_Size1-Regular.woff2",
  "./lib/katex/fonts/KaTeX_Size2-Regular.woff2",
  "./lib/katex/fonts/KaTeX_Size3-Regular.woff2",
  "./lib/katex/fonts/KaTeX_Size4-Regular.woff2",
  "./lib/katex/fonts/KaTeX_Typewriter-Regular.woff2",
  "./img/heliodon.png",
  "./img/logo_umss.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Primero la red (para ver siempre la ultima version); sin internet, la copia guardada.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        const copia = resp.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copia)).catch(() => {});
        return resp;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match("./index.html")))
  );
});
