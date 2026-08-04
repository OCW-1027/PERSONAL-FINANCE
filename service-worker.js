// ============================================================
// PERSONAL-FINANCE : service-worker.js
// オフライン対応 — アプリ本体をキャッシュ
// ============================================================
const CACHE = 'pf-v3';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './lang.js',
  './data.js',
  './app.js',
  './safe.js',
  './firebase.js',
  './manifest.json'
];

// インストール: 本体をキャッシュ
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

// 有効化: 旧キャッシュ削除
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 取得: network-first (更新を優先しつつ、オフラインはキャッシュ)
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
