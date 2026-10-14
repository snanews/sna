document.addEventListener("DOMContentLoaded", async () => {
  // 1. 動態載入共用頁首與頁尾
  await loadComponent("site-header-container", "components/header.html");
  await loadComponent("site-footer-container", "components/footer.html");

  // 2. 初始化深淺色模式邏輯（必須在 header 載入之後，否則抓不到按鈕 ID）
  initThemeSwitcher();
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
  
  // 檢查並載入預設主題
  const savedTheme = localStorage.getItem("theme");
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  
  if (savedTheme) {
    document.documentElement.setAttribute("data-theme", savedTheme);
  } else if (systemPrefersDark) {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.setAttribute("data-theme", "light");
  }

  // 綁定點擊事件
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      const newTheme = currentTheme === "dark" ? "light" : "dark";
      
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("theme", newTheme);
    });
  }
}


