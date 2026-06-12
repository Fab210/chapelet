/* ============================================================
   SERVICE WORKER — PWA hors-ligne
   Stratégies :
   - Précache à l'installation : shell (HTML/CSS/JS), vendor
     (Bootstrap + polices), manifest, icônes et les 21 images
     utilisées (~10 Mo). L'app complète marche hors-ligne.
   - Audio (29 Mo) : PAS précaché. Cache à la première lecture
     (cache-first), avec réponses 206 aux requêtes Range — sans
     quoi Safari/iOS refuse de lire un <audio> servi du cache.
   - HTML/CSS/JS : network-first (les mises à jour arrivent dès
     que possible), repli sur le cache hors-ligne.
   - Reste (images, polices…) : cache-first.

   IMPORTANT : incrémenter VERSION à chaque déploiement qui
   modifie img/ ou vendor/ (les fichiers réseau-d'abord, eux,
   se rafraîchissent seuls).
   ============================================================ */

const VERSION = "rosaire-v1";
const PRECACHE = `${VERSION}-precache`;
const RUNTIME = `${VERSION}-runtime`;

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/scripts.js",
  "./manifest.json",
  "./vendor/bootstrap.min.css",
  "./vendor/bootstrap.bundle.min.js",
  "./vendor/fonts.css",
  "./vendor/fonts/cormorant-garamond-400-latin.woff2",
  "./vendor/fonts/cormorant-garamond-400-latin-ext.woff2",
  "./vendor/fonts/cormorant-garamond-700-latin.woff2",
  "./vendor/fonts/cormorant-garamond-700-latin-ext.woff2",
  "./vendor/fonts/great-vibes-400-latin.woff2",
  "./vendor/fonts/great-vibes-400-latin-ext.woff2",
  "./vendor/fonts/merriweather-400-latin.woff2",
  "./vendor/fonts/merriweather-400-latin-ext.woff2",
  "./vendor/fonts/merriweather-700-latin.woff2",
  "./vendor/fonts/merriweather-700-latin-ext.woff2",
  "./img/icon-192.png",
  "./img/icon-512.png",
  "./img/jesus.jpg",
  "./img/joyeux1.jpg",
  "./img/joyeux2.jpg",
  "./img/joyeux3.jpg",
  "./img/joyeux4.jpg",
  "./img/joyeux5.jpg",
  "./img/lumineux1.jpg",
  "./img/lumineux2.jpg",
  "./img/lumineux3.jpg",
  "./img/lumineux4.jpg",
  "./img/lumineux5.jpg",
  "./img/douloureux1.jpg",
  "./img/douloureux2.jpg",
  "./img/douloureux3.jpg",
  "./img/douloureux4.jpg",
  "./img/douloureux5.jpg",
  "./img/glorieux1.jpg",
  "./img/glorieux2.jpg",
  "./img/glorieux3.jpg",
  "./img/glorieux4.jpg",
  "./img/glorieux5.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(VERSION))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Hors origine (GoatCounter…) : laisser passer, échec silencieux hors-ligne
  if (url.origin !== location.origin) return;
  if (event.request.method !== "GET") return;

  if (url.pathname.endsWith(".mp3")) {
    event.respondWith(audioCacheFirst(event.request));
    return;
  }

  if (
    event.request.mode === "navigate" ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js")
  ) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});

// HTML/CSS/JS : réseau d'abord (mises à jour immédiates), cache en repli
async function networkFirst(request) {
  const cache = await caches.open(PRECACHE);
  try {
    const fraiche = await fetch(request);
    if (fraiche.ok) cache.put(request, fraiche.clone());
    return fraiche;
  } catch (e) {
    const enCache = await cache.match(request, { ignoreSearch: true });
    if (enCache) return enCache;
    // Navigation vers un chemin inconnu hors-ligne : servir l'app
    if (request.mode === "navigate") {
      const index = await cache.match("./index.html");
      if (index) return index;
    }
    throw e;
  }
}

// Images, polices… : cache d'abord, réseau en repli (et mise en cache)
async function cacheFirst(request) {
  const enCache = await caches.match(request, { ignoreSearch: true });
  if (enCache) return enCache;
  const reponse = await fetch(request);
  if (reponse.ok) {
    const cache = await caches.open(RUNTIME);
    cache.put(request, reponse.clone());
  }
  return reponse;
}

// Audio : cache-first à la lecture. Le fichier COMPLET est mis en cache
// (fetch sans en-tête Range), puis les requêtes Range sont servies en 206
// par découpage du blob — indispensable pour <audio> sur Safari/iOS.
async function audioCacheFirst(request) {
  const cache = await caches.open(RUNTIME);
  let complet = await cache.match(request.url);

  if (!complet) {
    let reponse;
    try {
      reponse = await fetch(request.url); // sans Range : fichier entier
    } catch (e) {
      return Response.error(); // hors-ligne et pas en cache
    }
    if (!reponse.ok) return reponse;
    await cache.put(request.url, reponse.clone());
    complet = reponse;
  }

  const range = request.headers.get("range");
  if (!range) return complet;

  const blob = await complet.blob();
  const m = /bytes=(\d+)-(\d+)?/.exec(range);
  if (!m) return complet;
  const debut = Number(m[1]);
  const fin = m[2] ? Math.min(Number(m[2]), blob.size - 1) : blob.size - 1;
  if (debut >= blob.size) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${blob.size}` },
    });
  }
  const morceau = blob.slice(debut, fin + 1);
  return new Response(morceau, {
    status: 206,
    statusText: "Partial Content",
    headers: {
      "Content-Type": complet.headers.get("Content-Type") || "audio/mpeg",
      "Content-Range": `bytes ${debut}-${fin}/${blob.size}`,
      "Content-Length": String(morceau.size),
      "Accept-Ranges": "bytes",
    },
  });
}
