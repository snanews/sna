const CACHE_NAME = 'sna-app-v7';
const urlsToCache = [
  './index.html',
  './css/style.css',
  './css/article.css',
  './images/icon.jpg'
];

// 安裝 Service Worker 並快取核心檔案
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
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