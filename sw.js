/* Plutus offline shell.

   TWO RULES, both learned the hard way on the Timetable app:

   1. Bump CACHE on every deploy. If you do not, phones keep serving the old
      copy and your change is invisible to everyone but you.
   2. Never list a file in SHELL before it exists. A failed fetch during
      install throws, the new worker never activates, and every user is
      stranded on the previous version.
*/

const CACHE = "plutus-v2";

const SHELL = [
  "./",
  "index.html",
  "privacy.html",
  "manifest.webmanifest",
  "css/styles.css",
  "fonts/jakarta-latin.woff2",
  "fonts/jakarta-latin-ext.woff2",
  "js/config.js",
  "js/money.js",
  "js/dates.js",
  "js/expenses.js",
  "js/budget.js",
  "js/analytics.js",
  "js/debts.js",
  "js/goals.js",
  "js/alerts.js",
  "js/validate.js",
  "js/store.js",
  "js/ui.js",
  "js/app.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/icon-180.png"
];

/* GitHub Pages serves everything with max-age=600, so a plain fetch can be
   answered from the browser's own HTTP cache for ten minutes. That makes
   network first quietly return stale files. "no-cache" forces a check with
   the server every time, but the ETag still goes along, so an unchanged file
   comes back as a cheap 304 rather than a full download. */
const fresh = (url) => new Request(url, { cache: "no-cache", credentials: "same-origin" });

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(SHELL.map((url) =>
        fetch(fresh(url)).then((r) => {
          /* Never cache an error page. Throwing here leaves the old worker in
             place, which is far better than pinning a broken app offline. */
          if (!r.ok) throw new Error("shell fetch failed: " + url + " " + r.status);
          return c.put(url, r);
        })
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Network first so a deploy shows up straight away, cache as the fallback so
   the app still opens with no signal. Falling back to index.html means a deep
   hash link still resolves offline. */
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  if (new URL(e.request.url).origin !== self.location.origin) return;

  e.respondWith(
    fetch(fresh(e.request.url))
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match("index.html")))
  );
});
