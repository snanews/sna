// 你的 Google Apps Script Web App 部署完整網址
const GAS_API_URL = "https://script.google.com/macros/library/d/1l9y53scQoZINMPGCgpBxKxlqAneab0vflj2Nhb-nKULq-27unzjeYPXC/1";

document.addEventListener("DOMContentLoaded", async () => {
  // 1. 載入共用頁首與頁尾
  await loadComponent("site-header-container", "components/header.html");
  await loadComponent("site-footer-container", "components/footer.html");

  // 2. 初始化深淺色模式與抽屜選單
  initThemeSwitcher();
  initSideDrawer();

  // 3. 從 Google 試算表 API 抓取新聞與公告資料並渲染
  await fetchAndRenderHomeData();
});

// 核心函式：呼叫 GAS API 並分發資料到首頁各大區段
async function fetchAndRenderHomeData() {
  try {
    const response = await fetch(GAS_API_URL);
    const result = await response.json();

    if (result.status !== "success") {
      console.error("API 回傳錯誤:", result.message);
      return;
    }

    const articles = result.articles || [];
    const announcements = result.announcements || [];

    // 執行各大區段的自動化渲染
    renderFeaturedArticle(articles);
    renderRecommendedArticles(articles);
    renderRightsArticles(articles);
    renderAnnouncements(announcements);

  } catch (error) {
    console.error("無法取得試算表資料:", error);
  }
}

// A. 本週焦點：自動抓取 publish_date 最新的一篇
function renderFeaturedArticle(articles) {
  const container = document.getElementById("featured-container");
  if (!container || articles.length === 0) return;

  // 依照發布日期由新到舊排序
  const sorted = [...articles].sort((a, b) => new Date(b.publish_date) - new Date(a.publish_date));
  const latest = sorted[0];

  container.innerHTML = `
    <div class="featured-card">
      <a href="pages/article.html?id=${latest.id}">
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

// B. 推薦內容：自動依 views 點閱率由高到低排序取前 2~4 篇
function renderRecommendedArticles(articles) {
  const container = document.getElementById("recommended-container");
  if (!container || articles.length === 0) return;

  // 依照點閱率 views 由大到小排序
  const sorted = [...articles].sort((a, b) => Number(b.views || 0) - Number(a.views || 0));
  const topArticles = sorted.slice(0, 4); // 取前 4 名

  container.innerHTML = topArticles.map(item => `
    <article class="news-card">
      <img src="${item.cover_image || 'https://via.placeholder.com/100x75'}" alt="縮圖" class="news-card-img">
      <div class="news-card-body">
        <h3 class="news-card-title"><a href="pages/article.html?id=${item.id}">${item.title}</a></h3>
        <span class="news-card-meta">${item.publish_date} · 點閱 ${item.views || 0} 次</span>
      </div>
    </article>
  `).join('');
}

// C. 學權內容：自動篩選 category 等於 "學權" 的文章
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
        <h3 class="news-card-title"><a href="pages/article.html?id=${item.id}">${item.title}</a></h3>
        <span class="news-card-meta">${item.publish_date} · ${item.author || 'SNA 學權組'}</span>
      </div>
    </article>
  `).join('');
}

// D. 社內公告：渲染 Announcements 資料
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

// 輔助函式：非同步載入組件
async function loadComponent(containerId, filePath) {
  try {
    const response = await fetch(filePath);
    if (!response.ok) throw new Error(`無法載入 ${filePath}`);
    const html = await response.text();
    document.getElementById(containerId).innerHTML = html;
  } catch (error) {
    console.error("載入組件失敗:", error);
  }
}

// 深淺色模式切換
function initThemeSwitcher() {
  const themeToggleBtn = document.getElementById("theme-toggle");
  const savedTheme = localStorage.getItem("theme");
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  
  if (savedTheme) {
    document.documentElement.setAttribute("data-theme", savedTheme);
  } else if (systemPrefersDark) {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.setAttribute("data-theme", "light");
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      const newTheme = currentTheme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("theme", newTheme);
    });
  }
}

// 側邊選單
function initSideDrawer() {
  const menuBtn = document.getElementById("menu-btn");
  const closeBtn = document.getElementById("drawer-close-btn");
  const overlay = document.getElementById("drawer-overlay");
  const drawer = document.getElementById("side-drawer");

  function openDrawer() {
    drawer.classList.add("active");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    drawer.classList.remove("active");
    overlay.classList.remove("active");
    document.body.style.overflow = "";
  }

  if (menuBtn) menuBtn.addEventListener("click", openDrawer);
  if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
  if (overlay) overlay.addEventListener("click", closeDrawer);
}

