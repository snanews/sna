const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzvdZebFO9zsqGfxw3ROM36rB5KfOWwuQ7G7AShSh0FpqgsGKpEENwf3-BUw1QmnbQ/exec";

document.addEventListener("DOMContentLoaded", async () => {
  console.log("SNA 網站首頁初始化中...");

  // 1. 呼叫共用 js/header.js 的渲染與初始化函式
  renderHeader();
  initThemeSwitcher();
  initSideDrawer();

  // 2. 非同步從 Google 試算表 API 抓取資料並渲染首頁
  await fetchAndRenderHomeData();
});

async function fetchAndRenderHomeData() {
  const cachedData = localStorage.getItem("sna_articles_cache");
  if (cachedData) {
    try {
      const parsed = JSON.parse(cachedData);
      renderFeaturedArticle(parsed.articles || []);
      renderRecommendedArticles(parsed.articles || []);
      renderRightsArticles(parsed.articles || []);
      renderAnnouncements(parsed.announcements || []);
    } catch (e) {
      console.warn("讀取快取資料失敗", e);
    }
  }

  startLoadingBar();

  try {
    const response = await fetch(GAS_API_URL);
    const result = await response.json();

    if (result.status === "success") {
      const articles = result.articles || [];
      const announcements = result.announcements || [];

      localStorage.setItem("sna_articles_cache", JSON.stringify(result));

      renderFeaturedArticle(articles);
      renderRecommendedArticles(articles);
      renderRightsArticles(articles);
      renderAnnouncements(announcements);

      finishLoadingBar();
    } else {
      console.error("API 回傳狀態異常", result.message);
      errorLoadingBar();
    }
  } catch (error) {
    console.error("無法取得試算表資料", error);
    errorLoadingBar();
  }
}

// 標準化日期解析函式（可完美處理帶有 "·" 或多餘空白的日期字串）
const parseDate = (dateStr) => {
  if (!dateStr) return 0;
  const cleanStr = dateStr.replace('·', '').trim();
  return new Date(cleanStr).getTime() || 0;
};

function renderFeaturedArticle(articles) {
  const container = document.getElementById("featured-container");
  if (!container || articles.length === 0) return;

  // 使用標準化日期進行降序排序，抓取最新的一篇
  const sorted = [...articles].sort((a, b) => parseDate(b.publish_date) - parseDate(a.publish_date));
  const latest = sorted[0];

  container.innerHTML = `
    <div class="featured-card">
      <a href="articles/index.html?id=${latest.id}">
        <div class="featured-img-wrapper">
          <img src="${latest.cover_image || 'https://via.placeholder.com/800x450'}" alt="${latest.title}">
        </div>
        <div class="featured-content">
          <span class="featured-tag">本週焦點</span>
          <h1 class="featured-title">${latest.title}</h1>
          <div class="featured-meta">${latest.publish_date} · ${latest.author || 'SNA 新聞組'} (代碼: ${latest.short_code || ''})</div>
        </div>
      </a>
    </div>
  `;
}

function renderRecommendedArticles(articles) {
  const container = document.getElementById("recommended-container");
  if (!container || articles.length === 0) return;

  const sorted = [...articles].sort((a, b) => Number(b.views || 0) - Number(a.views || 0));
  const topArticles = sorted.slice(0, 4);

  container.innerHTML = topArticles.map(item => `
    <article class="news-card">
      <img src="${item.cover_image || 'https://via.placeholder.com/100x75'}" alt="縮圖" class="news-card-img">
      <div class="news-card-body">
        <h3 class="news-card-title"><a href="articles/index.html?id=${item.id}">${item.title}</a></h3>
        <span class="news-card-meta">${item.publish_date} · 點閱 ${item.views || 0} 次</span>
      </div>
    </article>
  `).join('');
}

function renderRightsArticles(articles) {
  const container = document.getElementById("rights-container");
  if (!container) return;

  const rightsList = articles.filter(item => item.category === "學權");

  if (rightsList.length === 0) {
    container.innerHTML = `<p style="font-size: 0.9rem; color: var(--text-muted); padding: 8px 0;">目前尚無學權專區報導。</p>`;
    return;
  }

  container.innerHTML = rightsList.map(item => `
    <article class="news-card">
      <img src="${item.cover_image || 'https://via.placeholder.com/100x75'}" alt="縮圖" class="news-card-img">
      <div class="news-card-body">
        <h3 class="news-card-title"><a href="articles/index.html?id=${item.id}">${item.title}</a></h3>
        <span class="news-card-meta">${item.publish_date} · ${item.author || 'SNA 學權組'}</span>
      </div>
    </article>
  `).join('');
}

function renderAnnouncements(announcements) {
  const container = document.getElementById("announcement-container");
  if (!container || announcements.length === 0) return;

  container.innerHTML = announcements.map(item => `
    <div class="announcement-item">
      <span class="announcement-date">${item.date}</span>
      <a href="${item.link_url || '#'}" class="announcement-title">${item.title}</a>
    </div>
  `).join('');
}

function startLoadingBar() {
  const bar = document.getElementById("global-loading-bar");
  if (!bar) return;
  bar.classList.add("loading", "loading-pulse");
  bar.style.width = "30%";
  setTimeout(() => { if (bar.classList.contains("loading")) bar.style.width = "65%"; }, 400);
  setTimeout(() => { if (bar.classList.contains("loading")) bar.style.width = "85%"; }, 1200);
}

function finishLoadingBar() {
  const bar = document.getElementById("global-loading-bar");
  if (!bar) return;
  bar.style.width = "100%";
  setTimeout(() => {
    bar.style.opacity = "0";
    setTimeout(() => {
      bar.classList.remove("loading", "loading-pulse");
      bar.style.width = "0%";
    }, 300);
  }, 200);
}

function errorLoadingBar() {
  const bar = document.getElementById("global-loading-bar");
  if (!bar) return;
  bar.style.backgroundColor = "#e74c3c";
  finishLoadingBar();
}