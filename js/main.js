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


