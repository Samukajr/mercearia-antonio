const CACHE_NAME = 'mercearia-v2';
const ASSETS = [
  'index.html',
  'css/styles.css',
  'css/login.css',
  'css/components.css',
  'js/app.js',
  'js/firebase-config.js',
  'js/vendas.js',
  'js/estoque.js',
  'js/caixa.js',
  'js/relatorios.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    ))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});