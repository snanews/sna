document.addEventListener("DOMContentLoaded", async () => {
  // 1. 動態載入共用頁首與頁尾
  await loadComponent("site-header-container", "components/header.html");
  await loadComponent("site-footer-container", "components/footer.html");

  // 2. 初始化深淺色模式
  initThemeSwitcher();

  // 3. 初始化左側抽屜選單
  initSideDrawer();
});

// 輔助函式：用來非同步載入 HTML 組件
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

// 深淺色模式切換邏輯
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

// 左側抽屜選單互動邏輯
function initSideDrawer() {
  const menuBtn = document.getElementById("menu-btn");
  const closeBtn = document.getElementById("drawer-close-btn");
  const overlay = document.getElementById("drawer-overlay");
  const drawer = document.getElementById("side-drawer");

  function openDrawer() {
    drawer.classList.add("active");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden"; // 禁止背景滾動
  }

  function closeDrawer() {
    drawer.classList.remove("active");
    overlay.classList.remove("active");
    document.body.style.overflow = ""; // 恢復背景滾動
  }

  if (menuBtn) menuBtn.addEventListener("click", openDrawer);
  if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
  if (overlay) overlay.addEventListener("click", closeDrawer);
}


