const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzvdZebFO9zsqGfxw3ROM36rB5KfOWwuQ7G7AShSh0FpqgsGKpEENwf3-BUw1QmnbQ/exec";

document.addEventListener("DOMContentLoaded", async () => {
  console.log("SNA 網站首頁初始化中...");

  // 動態載入頁首與頁尾組件
  await loadComponent("site-header-container", "components/header.html");
  await loadComponent("site-footer-container", "components/footer.html");

  // 1. 初始化共用功能
  renderHeader();
  initThemeSwitcher();
  initSideDrawer();

  // 2. 非同步從 Google 試算表 API 抓取資料並渲染首頁
  await fetchAndRenderHomeData();
});

// 共用組件載入函式（支援首頁的相對路徑）
async function loadComponent(containerId, filePath) {
  try {
    const response = await fetch(filePath);
    if (!response.ok) throw new Error(`無法載入 ${filePath}`);
    const html = await response.text();
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = html;
    }
  } catch (error) {
    console.error("載入組件失敗:", error);
  }
}

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

  const sorted = [...articles].sort((a, b) => parseDate(b.publish_date) - parseDate(a.publish_date));
  const latest = sorted[0];

  // 如果沒有 cover_image，就帶入預設的 images/icon.jpg
  const coverImg = latest.cover_image && latest.cover_image.trim() !== "" ? latest.cover_image : "images/icon.jpg";

  container.innerHTML = `
    <div class="featured-card">
      <a href="articles/index.html?id=${latest.id}">
        <div class="featured-img-wrapper">
          <img src="${coverImg}" alt="${latest.title}">
        </div>
        <div class="featured-content">
          <span class="featured-tag">本週焦點</span>
          <h1 class="featured-title">${latest.title}</h1>
          <div class="featured-meta">${latest.publish_date} · ${latest.author || 'SNA 新聞組'}</div>
        </div>
      </a>
    </div>
  `;
}

function renderRecommendedArticles(articles) {
  const container = document.getElementById("recommended-container");
  if (!container || articles.length === 0) return;

  const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
  const oneMonthAgo = Date.now() - ONE_MONTH_MS;

  const byViewsDesc = (a, b) => Number(b.views || 0) - Number(a.views || 0);

  // 1. 先抓一個月內的新聞，依觀看數由高到低排序
  const recentArticles = articles
    .filter(item => parseDate(item.publish_date) >= oneMonthAgo)
    .sort(byViewsDesc);

  let topArticles = recentArticles.slice(0, 4);

  // 2. 若一個月內的新聞不足 4 篇，再往前抓更早的新聞依觀看數補齊
  if (topArticles.length < 4) {
    const usedIds = new Set(topArticles.map(item => String(item.id)));
    const olderArticles = articles
      .filter(item => !usedIds.has(String(item.id)) && parseDate(item.publish_date) < oneMonthAgo)
      .sort(byViewsDesc);

    topArticles = topArticles.concat(olderArticles.slice(0, 4 - topArticles.length));
  }

  container.innerHTML = topArticles.map(item => {
    const coverImg = item.cover_image && item.cover_image.trim() !== "" ? item.cover_image : "images/icon.jpg";
    return `
      <article class="news-card">
        <img src="${coverImg}" alt="縮圖" class="news-card-img">
        <div class="news-card-body">
          <h3 class="news-card-title"><a href="articles/index.html?id=${item.id}">${item.title}</a></h3>
          <span class="news-card-meta">${item.publish_date} · 點閱 ${item.views || 0} 次</span>
        </div>
      </article>
    `;
  }).join('');
}

function renderRightsArticles(articles) {
  const container = document.getElementById("rights-container");
  if (!container) return;

  // 只篩選「學權」分類，並依發布日期由新到舊排序（不看點閱率）
  const rightsList = articles
    .filter(item => item.category === "學權")
    .sort((a, b) => parseDate(b.publish_date) - parseDate(a.publish_date));

  if (rightsList.length === 0) {
    container.innerHTML = `<p style="font-size: 0.9rem; color: var(--text-muted); padding: 8px 0;">目前尚無學權專區報導。</p>`;
    return;
  }

  container.innerHTML = rightsList.map(item => {
    const coverImg = item.cover_image && item.cover_image.trim() !== "" ? item.cover_image : "images/icon.jpg";
    return `
      <article class="news-card">
        <img src="${coverImg}" alt="縮圖" class="news-card-img">
        <div class="news-card-body">
          <h3 class="news-card-title"><a href="articles/index.html?id=${item.id}">${item.title}</a></h3>
          <span class="news-card-meta">${item.publish_date} · ${item.author || 'SNA 學權組'}</span>
        </div>
      </article>
    `;
  }).join('');
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