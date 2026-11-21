// 你的 Google Apps Script Web App 部署完整網址
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzvdZebFO9zsqGfxw3ROM36rB5KfOWwuQ7G7AShSh0FpqgsGKpEENwf3-BUw1QmnbQ/exec"; //[cite: 12]

document.addEventListener("DOMContentLoaded", async () => {
  console.log("SNA 文章內頁初始化中...");

  await loadComponent("site-header-container", "../components/header.html");
  await loadComponent("site-footer-container", "../components/footer.html");

  // 1. 呼叫共用 js/header.js 的渲染與初始化函式
  renderHeader();
  initThemeSwitcher();
  initSideDrawer();
  renderCopyLinkButton();
  

  // 2. 取得網址列的 id 參數並載入文章內容
  const urlParams = new URLSearchParams(window.location.search);
  const articleId = urlParams.get("id");

  if (!articleId) {
    showErrorState("找不到文章編號 (Missing Article ID)");
    return;
  }

  await fetchAndRenderArticle(articleId);
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

// 核心函式：向 GAS API 請求資料並找出對應文章進行渲染 (支援快取與進度條)
async function fetchAndRenderArticle(articleId) {
  const cachedData = localStorage.getItem("sna_articles_cache");
  let foundInCache = false;
  let activeArticle = null;

  if (cachedData) {
    try {
      const parsed = JSON.parse(cachedData);
      const articles = parsed.articles || [];
      const cachedArticle = articles.find(item => String(item.id) === String(articleId));

      if (cachedArticle) {
        activeArticle = cachedArticle;
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
      if (!foundInCache) {
        showErrorState("無法取得資料庫文章清單");
        errorLoadingBar();
        return;
      }
      finishLoadingBar();
      scheduleArticleViewCount(articleId, activeArticle);
      return;
    }

    const articles = result.articles || [];
    localStorage.setItem("sna_articles_cache", JSON.stringify(result));

    const article = articles.find(item => String(item.id) === String(articleId));

    if (!article) {
      if (!foundInCache) {
        showErrorState("找不到此篇文章，可能已被移除或網址有誤。");
        errorLoadingBar();
        return;
      }
      finishLoadingBar();
      scheduleArticleViewCount(articleId, activeArticle);
      return;
    }

    activeArticle = article;
    renderArticleHeader(article);
    renderArticleBlocks(article.layout_json);
    finishLoadingBar();

    // 確認文章已成功載入後，啟動停留防跳出與背景回報點閱計數
    scheduleArticleViewCount(articleId, activeArticle);

  } catch (error) {
    console.error("載入文章發生錯誤:", error);
    if (!foundInCache) {
      showErrorState("連線至資料庫發生異常，請稍後再試。");
      errorLoadingBar();
      return;
    }
    finishLoadingBar();
    scheduleArticleViewCount(articleId, activeArticle);
  }
}

// 點閱率防秒跳出、去重與非阻塞回報邏輯
function scheduleArticleViewCount(articleId, articleObj) {
  if (!articleId || !articleObj) return;
  if (window.__snaViewTrackerBound === String(articleId)) return;
  window.__snaViewTrackerBound = String(articleId);

  const sessionKey = `sna_viewed_${articleId}`;
  if (sessionStorage.getItem(sessionKey)) return;

  const DWELL_TIME_MS = 6000; // 停留滿 6 秒才算有效閱讀
  let qualified = false;
  let optimisticallyUpdated = false;
  let sent = false;

  function applyOptimisticViewIncrement() {
    if (optimisticallyUpdated) return;
    optimisticallyUpdated = true;

    const currentViews = Number(articleObj.views || 0);
    const nextViews = currentViews + 1;
    articleObj.views = nextViews;
    renderArticleHeader(articleObj);

    // 同步更新 localStorage 快取中的 views，讓回首頁或切分頁時也能看到最新數字
    const cachedRaw = localStorage.getItem("sna_articles_cache");
    if (cachedRaw) {
      try {
        const parsed = JSON.parse(cachedRaw);
        if (Array.isArray(parsed.articles)) {
          parsed.articles = parsed.articles.map(item =>
            String(item.id) === String(articleId) ? { ...item, views: nextViews } : item
          );
          localStorage.setItem("sna_articles_cache", JSON.stringify(parsed));
        }
      } catch (e) {
        console.warn("更新快取點閱數失敗:", e);
      }
    }
  }

  function flushViewToBackend() {
    if (!qualified || sent) return;
    sent = true;
    sessionStorage.setItem(sessionKey, "1");

    const payload = JSON.stringify({
      action: "increment_view",
      id: String(articleId).trim()
    });

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "text/plain;charset=utf-8" });
      navigator.sendBeacon(GAS_API_URL, blob);
    } else {
      fetch(GAS_API_URL, {
        method: "POST",
        redirect: "follow",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: payload,
        keepalive: true
      }).catch(() => {});
    }
  }

  let timer = setTimeout(() => {
    qualified = true;
    applyOptimisticViewIncrement();
    if (document.visibilityState === "hidden") {
      flushViewToBackend();
    }
  }, DWELL_TIME_MS);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      if (!qualified) {
        // 若在 6 秒內就切走或縮起視窗，取消計時（視為跳出）
        clearTimeout(timer);
      } else {
        flushViewToBackend();
      }
    } else if (document.visibilityState === "visible" && !qualified && !sent) {
      // 若使用者很快又切回來且尚未達標，重新起算停留時間
      clearTimeout(timer);
      timer = setTimeout(() => {
        qualified = true;
        applyOptimisticViewIncrement();
      }, DWELL_TIME_MS);
    }
  });

  window.addEventListener("pagehide", () => {
    clearTimeout(timer);
    if (qualified) {
      flushViewToBackend();
    }
  });
}

// A. 渲染文章頂部詮釋資料
function renderArticleHeader(article) {
  document.title = `${article.title} - 松山新聞社 SNA`;

  const categoryEl = document.getElementById("article-category");
  const titleEl = document.getElementById("article-title");
  const metaInfoEl = document.getElementById("article-meta-info");

  if (categoryEl) categoryEl.textContent = article.category || "未分類";
  if (titleEl) titleEl.textContent = article.title || "無標題";
  if (metaInfoEl) {
    metaInfoEl.textContent = `${article.publish_date || ''} · ${article.author || 'SNA 編輯組'}${article.views ? ` · 點閱 ${article.views} 次` : ''}`;
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

async function copyTextToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
  return copied;
}

function renderCopyLinkButton(containerId = "article-share-container") {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "copy-link-btn";
  btn.setAttribute("aria-label", "複製文章連結");

  const linkIconSvg = `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
    </svg>
  `;

  const checkIconSvg = `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  `;

  btn.innerHTML = `${linkIconSvg}<span class="copy-link-text">複製連結</span>`;

  let resetTimer = null;

  btn.addEventListener("click", async () => {
    const shareUrl = window.location.href;
    const textEl = btn.querySelector(".copy-link-text");

    try {
      const ok = await copyTextToClipboard(shareUrl);
      if (!ok) throw new Error("copy failed");

      btn.classList.add("is-copied");
      btn.innerHTML = `${checkIconSvg}<span class="copy-link-text">已複製連結</span>`;
    } catch (err) {
      btn.classList.remove("is-copied");
      btn.innerHTML = `${linkIconSvg}<span class="copy-link-text">複製失敗</span>`;
    }

    if (resetTimer) clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      btn.classList.remove("is-copied");
      btn.innerHTML = `${linkIconSvg}<span class="copy-link-text">複製連結</span>`;
      if (textEl) textEl.textContent = "複製連結";
    }, 2000);
  });

  container.appendChild(btn);
}