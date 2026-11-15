const CACHE_NAME = 'sna-app-v1';
const urlsToCache = [
  './index.html',
  './css/style.css',
  './css/article.css',
  './images/icon.jpg'
];

// 安裝 Service Worker 並快取核心檔案
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// 攔截網路請求，優先從快取讀取以支援離線瀏覽
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});