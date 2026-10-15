// 你的 Google Apps Script Web App 部署完整網址
const GAS_API_URL = "https://script.google.com/macros/s/AKfycby6pULHa_sTORND-VBwHgn0Mme_V0UaYK2j8l5KQx2Gdt8R3qAcmpQq_C59BnUMUF_B/exec";

document.addEventListener("DOMContentLoaded", async () => {
  // 1. 動態載入共用頁首與頁尾（自動適應 GitHub Pages 路徑）
  await loadComponent("site-header-container", "components/header.html");
  await loadComponent("site-footer-container", "components/footer.html");

  // 2. 初始化深淺色模式與抽屜選單
  initThemeSwitcher();
  initSideDrawer();

  // 3. 取得網址列中的文章 ID，並向 API 請求該篇文章資料進行動態渲染
  await fetchAndRenderArticleDetail();
});

// 核心函式：讀取特定文章並動態渲染積木
async function fetchAndRenderArticleDetail() {
  const container = document.getElementById("article-main-container");
  
  const urlParams = new URLSearchParams(window.location.search);
  const articleId = urlParams.get("id");
  const shortCode = urlParams.get("short");

  if (!articleId && !shortCode) {
    if (container) container.innerHTML = `<p style="text-align:center; padding: 40px; color: var(--text-muted);">找不到指定的文章編號。</p>`;
    return;
  }

  try {
    const response = await fetch(GAS_API_URL);
    const result = await response.json();

    if (result.status !== "success") {
      throw new Error(result.message || "無法取得資料");
    }

    const articles = result.articles || [];
    const article = articles.find(item => item.id === articleId || item.short_code === shortCode);

    if (!article) {
      if (container) container.innerHTML = `<p style="text-align:center; padding: 40px; color: var(--text-muted);">找不到這篇報導，可能已被移除或網址有誤。</p>`;
      return;
    }

    // 填充標題、分類與詮釋資料
    document.title = `${article.title} - 松山新聞社 SNA`;
    
    const catEl = document.getElementById("article-category");
    const titleEl = document.getElementById("article-title");
    const metaEl = document.getElementById("article-meta");
    
    if (catEl) catEl.textContent = article.category || "一般";
    if (titleEl) titleEl.textContent = article.title;
    if (metaEl) metaEl.textContent = `發布時間：${article.publish_date} · 作者：${article.author || 'SNA 編輯部'} (代碼: ${article.short_code || '無'})`;

    // 核心：解析 layout_json 並動態渲染積木
    const blocksContainer = document.getElementById("article-blocks");
    if (blocksContainer && article.layout_json) {
      let blocks = [];
      try {
        blocks = typeof article.layout_json === "string" ? JSON.parse(article.layout_json) : article.layout_json;
      } catch (e) {
        console.error("layout_json 格式錯誤，無法解析:", e);
        blocksContainer.innerHTML = `<p style="color: red; text-align: center; padding: 20px;">文章排版資料解析失敗。</p>`;
        return;
      }

      blocksContainer.innerHTML = blocks.map(block => {
        if (block.type === "text") {
          return `<p class="block-text">${block.content}</p>`;
        } else if (block.type === "image") {
          return `
            <figure class="block-image">
              <img src="${block.url}" alt="${block.caption || '新聞圖片'}">
              ${block.caption ? `<figcaption>${block.caption}</figcaption>` : ''}
            </figure>
          `;
        } else if (block.type === "quote") {
          return `<blockquote class="block-quote">${block.content}</blockquote>`;
        }
        return '';
      }).join('');
    }

  } catch (error) {
    console.error("載入文章內頁失敗:", error);
    if (container) container.innerHTML = `<p style="text-align:center; padding: 40px; color: var(--text-muted);">載入文章發生錯誤，請稍後再試。</p>`;
  }
}

// 智慧路徑組件載入函式（完美適配 GitHub Pages /sna/ 子目錄）
async function loadComponent(containerId, filePath) {
  try {
    const isGitHubPages = window.location.hostname.includes("github.io");
    const basePath = isGitHubPages ? "/sna/" : "/";
    const fullPath = filePath.startsWith("/") ? filePath : basePath + filePath;

    const response = await fetch(fullPath);
    if (!response.ok) throw new Error(`無法載入 ${fullPath} (狀態碼: ${response.status})`);
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


