// 你的 Google Apps Script Web App 部署完整網址
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzvdZebFO9zsqGfxw3ROM36rB5KfOWwuQ7G7AShSh0FpqgsGKpEENwf3-BUw1QmnbQ/exec";

document.addEventListener("DOMContentLoaded", async () => {
  console.log("SNA 網站首頁初始化中...");

  // 1. 優先且獨立載入共用頁首與頁尾
  await loadComponent("site-header-container", "components/header.html");
  await loadComponent("site-footer-container", "components/footer.html");

  // 2. 初始化深淺色模式與抽屜選單（確保 Header 載入完成後才綁定 DOM 元素）
  initThemeSwitcher();
  initSideDrawer();

  // 3. 非同步從 Google 試算表 API 抓取資料並渲染首頁
  await fetchAndRenderHomeData();
});

// 核心函式：呼叫 GAS API 並分發資料到首頁各大區段（支援快取與進度條）
async function fetchAndRenderHomeData() {
  // 1. 快取優先機制：若本地有上次備份的資料，立刻 0 秒秒開渲染
  const cachedData = localStorage.getItem("sna_articles_cache");
  if (cachedData) {
    try {
      const parsed = JSON.parse(cachedData);
      renderFeaturedArticle(parsed.articles || []);
      renderRecommendedArticles(parsed.articles || []);
      renderRightsArticles(parsed.articles || []);
      renderAnnouncements(parsed.announcements || []);
    } catch (e) {
      console.warn("讀取快取資料失敗，將重新向伺服器請求", e);
    }
  }

  // 2. 啟動頂部動態進度條，向 GAS 發送非同步請求同步最新資料
  startLoadingBar();

  try {
    const response = await fetch(GAS_API_URL);
    const result = await response.json();

    if (result.status === "success") {
      const articles = result.articles || [];
      const announcements = result.announcements || [];

      // 將最新的資料寫入快取，供下次瞬間載入使用
      localStorage.setItem("sna_articles_cache", JSON.stringify(result));

      // 重新渲染最新的畫面
      renderFeaturedArticle(articles);
      renderRecommendedArticles(articles);
      renderRightsArticles(articles);
      renderAnnouncements(announcements);

      // 進度條流暢滑滿至 100% 並隱藏
      finishLoadingBar();
    } else {
      console.error("API 回傳狀態異常:", result.message);
      errorLoadingBar();
    }
  } catch (error) {
    console.error("無法取得試算表資料:", error);
    errorLoadingBar();
  }
}

// A. 本週焦點：自動抓取 publish_date 最新的一篇
function renderFeaturedArticle(articles) {
  const container = document.getElementById("featured-container");
  if (!container || articles.length === 0) return;

  const sorted = [...articles].sort((a, b) => new Date(b.publish_date) - new Date(a.publish_date));
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

// B. 推薦內容：自動依 views 點閱率由高到低排序取前 4 篇
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
        <h3 class="news-card-title"><a href="articles/index.html?id=${item.id}">${item.title}</a></h3>
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

// 絕對精準的路徑組件載入函式（支援 GitHub Pages 專案路徑）
// 升級版：自動修正 Header/Footer 內部相對連結的路徑組件載入函式
async function loadComponent(containerId, filePath) {
  try {
    const isGitHubPages = window.location.hostname.includes("github.io");
    const basePath = isGitHubPages ? "/sna/" : "/";
    
    let fullPath = filePath;
    if (!filePath.startsWith("../") && !filePath.startsWith("/")) {
      fullPath = basePath + filePath;
    }

    const response = await fetch(fullPath);
    if (!response.ok) throw new Error(`無法載入 ${fullPath}`);
    const html = await response.text();
    const container = document.getElementById(containerId);
    
    if (container) {
      container.innerHTML = html;

      // 關鍵修復：如果是載入 Header，自動校正所有指向 index.html 的連結
      if (containerId === "site-header-container") {
        const logoLink = container.querySelector(".site-logo");
        const homeTab = container.querySelector(".category-tab[href='index.html']");
        const drawerHome = container.querySelector(".drawer-link[href='index.html']");

        // 計算回到根目錄的首頁相對路徑（例如在子資料夾就用 '../index.html'，在根目錄就用 'index.html'）
        const relativeHomePath = window.location.pathname.includes("/admin/") || window.location.pathname.includes("/articles/")
          ? "../index.html" 
          : "index.html";

        if (logoLink) logoLink.setAttribute("href", relativeHomePath);
        if (homeTab) homeTab.setAttribute("href", relativeHomePath);
        if (drawerHome) drawerHome.setAttribute("href", relativeHomePath);
      }
    }
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

// 側邊抽屜選單互動控制
function initSideDrawer() {
  const menuBtn = document.getElementById("menu-btn");
  const closeBtn = document.getElementById("drawer-close-btn");
  const overlay = document.getElementById("drawer-overlay");
  const drawer = document.getElementById("side-drawer");

  function openDrawer() {
    if (drawer) drawer.classList.add("active");
    if (overlay) overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    if (drawer) drawer.classList.remove("active");
    if (overlay) overlay.classList.remove("active");
    document.body.style.overflow = "";
  }

  if (menuBtn) menuBtn.addEventListener("click", openDrawer);
  if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
  if (overlay) overlay.addEventListener("click", closeDrawer);
}

// 控制頂部進度條控制函式
function startLoadingBar() {
  const bar = document.getElementById("global-loading-bar");
  if (!bar) return;
  
  bar.classList.add("loading", "loading-pulse");
  bar.style.width = "30%";
  
  // 模擬緩慢推進至 85%（給使用者流暢的載入預期）
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
