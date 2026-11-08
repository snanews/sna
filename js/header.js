// ==========================================
//   SNA 全站共用獨立導覽列與側邊選單生成模組 (js/header.js)
// ==========================================

function renderHeader() {
    const isSubPage = window.location.pathname.includes("/admin/") ||
        window.location.pathname.includes("/articles/") ||
        window.location.pathname.includes("/html/");
    const basePath = isSubPage ? "../" : "";

    const headerContainer = document.getElementById("site-header-container");
    if (!headerContainer) return;

    // 1. 頂部導覽列與分類列
    headerContainer.innerHTML = `
    <div class="top-bar">
      <button class="menu-btn" id="menu-btn" aria-label="開啟選單">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      <a href="${basePath}index.html" class="site-logo">松山新聞社</a>

      <div class="header-actions">
        <button class="theme-toggle-btn" id="theme-toggle" aria-label="切換深淺色模式">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        </button>
      </div>
    </div>

    <nav class="category-nav">
      <a href="${basePath}index.html" class="category-tab active">首頁</a>
      <a href="#" class="category-tab">自治</a>
      <a href="#" class="category-tab">學權</a>
      <a href="#" class="category-tab">校園</a>
      <a href="#" class="category-tab">其他</a>
    </nav>

    <div class="top-loading-bar-container">
      <div class="top-loading-bar" id="global-loading-bar"></div>
    </div>
  `;

    // 2. 側邊抽屜選單與背景遮罩
    if (!document.getElementById("side-drawer")) {
        const overlay = document.createElement("div");
        overlay.className = "drawer-overlay";
        overlay.id = "drawer-overlay";

        const drawer = document.createElement("aside");
        drawer.className = "side-drawer";
        drawer.id = "side-drawer";
        drawer.innerHTML = `
      <div class="drawer-header">
        <span class="drawer-title">導覽選單</span>
        <button class="drawer-close-btn" id="drawer-close-btn" aria-label="關閉選單">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <nav class="drawer-nav">
        <ul class="drawer-menu">
          <li class="drawer-item"><a href="${basePath}index.html" class="drawer-link active">首頁</a></li>
          <li class="drawer-item"><a href="${basePath}html/all_articles.html" class="drawer-link">所有新聞報導</a></li>
          <li class="drawer-item"><a href="#" class="drawer-link">常用表件與規章</a></li>
          <li class="drawer-divider"></li>
          <li class="drawer-section-label">新聞分類</li>
          <li class="drawer-item"><a href="#" class="drawer-link">自治議題</a></li>
          <li class="drawer-item"><a href="#" class="drawer-link">學權權益</a></li>
          <li class="drawer-item"><a href="#" class="drawer-link">校園生活</a></li>
          <li class="drawer-item"><a href="#" class="drawer-link">其他報導</a></li>
          <li class="drawer-divider"></li>
          <li class="drawer-section-label">關於我們</li>
          <li class="drawer-item"><a href="#" class="drawer-link">社團簡介與組織章程</a></li>
          <li class="drawer-item"><a href="#" class="drawer-link">勘誤與新聞倫理規範</a></li>
        </ul>
      </nav>

      <div class="drawer-footer">
        <p>松山新聞社 SNA © 2026</p>
      </div>
    `;

        document.body.appendChild(overlay);
        document.body.appendChild(drawer);
    }
}

// 3. 側邊抽屜選單互動控制
function initSideDrawer() {
    const menuBtn = document.getElementById("menu-btn");
    const closeBtn = document.getElementById("drawer-close-btn");
    const overlay = document.getElementById("drawer-overlay");
    const drawer = document.getElementById("side-drawer");

    if (!menuBtn || !drawer) return;

    function openDrawer() {
        drawer.classList.add("active");
        if (overlay) overlay.classList.add("active");
        document.body.style.overflow = "hidden";
    }

    function closeDrawer() {
        drawer.classList.remove("active");
        if (overlay) overlay.classList.remove("active");
        document.body.style.overflow = "";
    }

    menuBtn.onclick = openDrawer;
    if (closeBtn) closeBtn.onclick = closeDrawer;
    if (overlay) overlay.onclick = closeDrawer;
}

// 4. 深淺色模式切換
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