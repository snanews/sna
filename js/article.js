// 你的 Google Apps Script Web App 部署完整網址
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzvdZebFO9zsqGfxw3ROM36rB5KfOWwuQ7G7AShSh0FpqgsGKpEENwf3-BUw1QmnbQ/exec";

document.addEventListener("DOMContentLoaded", async () => {
  console.log("SNA 文章內頁初始化中...");

  // 1. 呼叫共用 js/header.js 的渲染與初始化函式
  renderHeader();
  initThemeSwitcher();
  initSideDrawer();

  // 2. 取得網址列的 id 參數並載入文章內容
  const urlParams = new URLSearchParams(window.location.search);
  const articleId = urlParams.get("id");

  if (!articleId) {
    showErrorState("找不到文章編號 (Missing Article ID)");
    return;
  }

  await fetchAndRenderArticle(articleId);
});

// 核心函式：向 GAS API 請求資料並找出對應文章進行渲染 (支援快取與進度條)
async function fetchAndRenderArticle(articleId) {
  const cachedData = localStorage.getItem("sna_articles_cache");
  let foundInCache = false;

  if (cachedData) {
    try {
      const parsed = JSON.parse(cachedData);
      const articles = parsed.articles || [];
      const cachedArticle = articles.find(item => String(item.id) === String(articleId));

      if (cachedArticle) {
        renderArticleHeader(cachedArticle);
        renderArticleBlocks(cachedArticle.layout_json);
        foundInCache = true;
      }
    } catch (e) {
      console.warn("讀取快取失敗:", e);
    }
  }

  startLoadingBar();

  try {
    const response = await fetch(GAS_API_URL);
    const result = await response.json();

    if (result.status !== "success") {
      if (!foundInCache) showErrorState("無法取得資料庫文章清單");
      errorLoadingBar();
      return;
    }

    const articles = result.articles || [];
    localStorage.setItem("sna_articles_cache", JSON.stringify(result));

    const article = articles.find(item => String(item.id) === String(articleId));

    if (!article) {
      if (!foundInCache) showErrorState("找不到此篇文章，可能已被移除或網址有誤。");
      errorLoadingBar();
      return;
    }

    renderArticleHeader(article);
    renderArticleBlocks(article.layout_json);
    finishLoadingBar();

  } catch (error) {
    console.error("載入文章發生錯誤:", error);
    if (!foundInCache) {
      showErrorState("連線至資料庫發生異常，請稍後再試。");
    }
    errorLoadingBar();
  }
}

// A. 渲染文章頂部詮釋資料
function renderArticleHeader(article) {
  document.title = `${article.title} - 松山新聞社 SNA`;

  const categoryEl = document.getElementById("article-category");
  const titleEl = document.getElementById("article-title");
  const metaEl = document.getElementById("article-meta");

  if (categoryEl) categoryEl.textContent = article.category || "未分類";
  if (titleEl) titleEl.textContent = article.title || "無標題";
  if (metaEl) {
    metaEl.innerHTML = `<span>${article.publish_date || ''} · ${article.author || 'SNA 編輯組'}</span>${article.views ? `<span> · 點閱 ${article.views} 次</span>` : ''}`;
  }
}

// B. 解析並渲染模組化積木排版 (layout_json)
function renderArticleBlocks(layoutJsonStr) {
  const container = document.getElementById("article-blocks");
  if (!container) return;

  if (!layoutJsonStr) {
    container.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 20px;">這篇文章尚無詳細內文排版。</p>`;
    return;
  }

  try {
    let blocks = typeof layoutJsonStr === "string" ? JSON.parse(layoutJsonStr) : layoutJsonStr;

    if (!Array.isArray(blocks) || blocks.length === 0) {
      container.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 20px;">內文積木格式為空。</p>`;
      return;
    }

    container.innerHTML = blocks.map(block => {
      switch (block.type) {
        case "text":
          return `<p class="article-paragraph">${escapeHtml(block.content || '')}</p>`;
        
        case "image":
          return `
            <figure class="article-figure">
              <img src="${escapeHtml(block.url || '')}" alt="${escapeHtml(block.caption || '文章圖片')}">
              ${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ''}
            </figure>
          `;
        
        case "quote":
          return `
            <blockquote class="article-quote">
              <p>${escapeHtml(block.content || '')}</p>
              ${block.author ? `<cite>— ${escapeHtml(block.author)}</cite>` : ''}
            </blockquote>
          `;
        
        default:
          return `<div class="article-unknown-block">${escapeHtml(block.content || '')}</div>`;
      }
    }).join('');

  } catch (e) {
    console.error("解析 layout_json 失敗:", e);
    container.innerHTML = `<div class="article-paragraph">${escapeHtml(layoutJsonStr)}</div>`;
  }
}

function showErrorState(message) {
  const titleEl = document.getElementById("article-title");
  const container = document.getElementById("article-blocks");
  const categoryEl = document.getElementById("article-category");

  if (categoryEl) categoryEl.textContent = "系統提示";
  if (titleEl) titleEl.textContent = "無法載入文章";
  if (container) {
    container.innerHTML = `<p style="color: #e74c3c; text-align: center; padding: 30px; font-weight: 500;">${escapeHtml(message)}</p>`;
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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