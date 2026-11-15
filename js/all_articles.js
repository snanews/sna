// 你的 Google Apps Script Web App 部署完整網址
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzvdZebFO9zsqGfxw3ROM36rB5KfOWwuQ7G7AShSh0FpqgsGKpEENwf3-BUw1QmnbQ/exec";

document.addEventListener("DOMContentLoaded", async () => {
    console.log("SNA 所有新聞頁面初始化中...");

    // 1. 動態渲染共用導覽列、深淺色切換與側邊抽屜
    renderHeader();
    initThemeSwitcher();
    initSideDrawer();

    // 2. 非同步載入共用頁尾（footer.html）
    await loadComponent("site-footer-container", "../components/footer.html");

    // 2. 抓取所有新聞並由舊到新渲染
    await fetchAndRenderAllArticles();


});


// 共用組件載入函式（專門用來載入頁尾）
async function loadComponent(containerId, filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`無法載入 ${filePath}`);
        const html = await response.text();
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = html;

            // 如果是載入 Footer，自動校正內部指向首頁的連結（因為身處 /html/ 資料夾內）
            if (containerId === "site-footer-container") {
                const footerLinks = container.querySelectorAll("a");
                footerLinks.forEach(link => {
                    const href = link.getAttribute("href");
                    if (href && href === "index.html") {
                        link.setAttribute("href", "../index.html");
                    }
                });
            }
        }
    } catch (error) {
        console.error("載入組件失敗:", error);
    }
}

async function fetchAndRenderAllArticles() {
    const container = document.getElementById("all-articles-container");

    // 1. 快取優先機制
    const cachedData = localStorage.getItem("sna_articles_cache");
    if (cachedData) {
        try {
            const parsed = JSON.parse(cachedData);
            renderSortedArticles(parsed.articles || []);
        } catch (e) {
            console.warn("讀取快取失敗:", e);
        }
    }

    startLoadingBar();

    try {
        const response = await fetch(GAS_API_URL);
        const result = await response.json();

        if (result.status === "success") {
            const articles = result.articles || [];
            localStorage.setItem("sna_articles_cache", JSON.stringify(result));

            // 渲染最新資料
            renderSortedArticles(articles);
            finishLoadingBar();
        } else {
            console.error("API 回傳異常:", result.message);
            if (container) container.innerHTML = `<p style="color: #e74c3c; padding: 20px 0;">無法取得新聞列表。</p>`;
            errorLoadingBar();
        }
    } catch (error) {
        console.error("連線異常:", error);
        if (container) container.innerHTML = `<p style="color: #e74c3c; padding: 20px 0;">連線伺服器失敗，請稍後再試。</p>`;
        errorLoadingBar();
    }
}

// 關鍵函式：將新聞按 publish_date 「由舊到新」排序並渲染 (舊的在上/前，新的在下/後)
// 輔助函式：從 layout_json 抓取第一段文字作為預覽摘要
function getArticleExcerpt(layoutJsonStr) {
    if (!layoutJsonStr) return "點擊閱讀完整報導內容...";
    try {
        let blocks = typeof layoutJsonStr === "string" ? JSON.parse(layoutJsonStr) : layoutJsonStr;
        if (Array.isArray(blocks)) {
            const textBlock = blocks.find(b => b.type === "text" && b.content);
            if (textBlock) {
                return textBlock.content.length > 60 ? textBlock.content.substring(0, 60) + "..." : textBlock.content;
            }
        }
    } catch (e) {
        if (typeof layoutJsonStr === "string") {
            return layoutJsonStr.length > 60 ? layoutJsonStr.substring(0, 60) + "..." : layoutJsonStr;
        }
    }
    return "點擊閱讀完整報導內容...";
}

// 核心函式：將新聞按 publish_date 「由舊到新」排序並渲染
function renderSortedArticles(articles) {
    const container = document.getElementById("all-articles-container");
    if (!container) return;

    if (articles.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted); padding: 20px 0;">目前尚無任何新聞報導。</p>`;
        return;
    }

    const sortedArticles = [...articles].sort((a, b) => {
        const parseDate = (dateStr) => {
            if (!dateStr) return 0;
            const cleanStr = dateStr.replace('·', '').trim();
            return new Date(cleanStr).getTime() || 0;
        };
        return parseDate(b.publish_date) - parseDate(a.publish_date);
    });
    
    const articleLinkPath = "../articles/index.html";

    container.innerHTML = sortedArticles.map(item => {
        const excerpt = getArticleExcerpt(item.layout_json);
        // 檢查是否有獨立縮圖，若無則使用預設社徽圖片
        const coverImg = item.cover_image && item.cover_image.trim() !== "" ? item.cover_image : "../images/icon.jpg";

        return `
      <article class="news-card">
        <img src="${coverImg}" alt="縮圖" class="news-card-img">
        <div class="news-card-body">
          <div>
            <h3 class="news-card-title">
              <a href="${articleLinkPath}?id=${item.id}">${item.title}</a>
            </h3>
            <p class="news-card-desc">${excerpt}</p>
          </div>
          <span class="news-card-meta">${item.publish_date} · ${item.author || 'SNA 編輯組'} · 點閱 ${item.views || 0} 次</span>
        </div>
      </article>
    `;
    }).join('');
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