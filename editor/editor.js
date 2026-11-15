// ==========================================
//   SNA 新聞編輯與修改後台邏輯控制碼 (editor/editor.js)
// ==========================================

const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzvdZebFO9zsqGfxw3ROM36rB5KfOWwuQ7G7AShSh0FpqgsGKpEENwf3-BUw1QmnbQ/exec";

document.addEventListener("DOMContentLoaded", async () => {
  console.log("SNA 新聞編輯後台初始化中...");

  // 1. 初始化共用導覽列、深淺色切換與側邊抽屜
  renderHeader();
  initThemeSwitcher();
  initSideDrawer();

  // 2. 載入共用頁尾
  await loadComponent("site-footer-container", "../components/footer.html");

  // 3. 綁定文章編號輸入框的「自動讀取」事件（當使用者輸入完 ID 離開焦點時觸發）
  const articleIdInput = document.getElementById("article_id");
  if (articleIdInput) {
    articleIdInput.addEventListener("blur", async () => {
      const targetId = articleIdInput.value.trim();
      if (targetId) {
        await loadExistingArticleToEditor(targetId);
      }
    });
  }

  // 4. 綁定表單提交（更新/發布文章）事件
  const form = document.getElementById("article-form");
  if (form) {
    form.addEventListener("submit", handleArticleSubmit);
  }

  // 預設一開始給一個空白段落積木
  addBlock('text');
});

// 共用組件載入函式
async function loadComponent(containerId, filePath) {
  try {
    const response = await fetch(filePath);
    if (!response.ok) throw new Error(`無法載入 ${filePath}`);
    const html = await response.text();
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = html;
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

// 核心功能：根據輸入的 ID 讀取既有文章資料並還原到表單與積木中
async function loadExistingArticleToEditor(articleId) {
  startLoadingBar();
  try {
    // 優先從快取找尋
    let article = null;
    const cachedData = localStorage.getItem("sna_articles_cache");
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      const articles = parsed.articles || [];
      article = articles.find(item => String(item.id) === String(articleId));
    }

    // 如果快取沒有，直接向 API 請求
    if (!article) {
      const response = await fetch(GAS_API_URL);
      const result = await response.json();
      if (result.status === "success" && result.articles) {
        article = result.articles.find(item => String(item.id) === String(articleId));
        localStorage.setItem("sna_articles_cache", JSON.stringify(result));
      }
    }

    if (article) {
      console.log("成功找到既有文章，正在載入編輯器:", article);
      
      // 填入基本欄位
      document.getElementById("title").value = article.title || "";
      document.getElementById("category").value = article.category || "自治";
      document.getElementById("author").value = article.author || "SNA 新聞組";
      document.getElementById("cover_image").value = article.cover_image || "";
      document.getElementById("short_id_hidden").value = article.short_code || "";

      // 還原積木排版
      const container = document.getElementById("blocks-container");
      container.innerHTML = ""; // 清空目前積木

      try {
        let blocks = typeof article.layout_json === "string" ? JSON.parse(article.layout_json) : article.layout_json;
        if (Array.isArray(blocks) && blocks.length > 0) {
          blocks.forEach(block => addBlock(block.type, block));
        } else {
          addBlock('text');
        }
      } catch (e) {
        console.warn("解析 layout_json 失敗，轉為純文字積木", e);
        addBlock('text', { content: article.layout_json || "" });
      }

      showCustomModal("讀取成功", `已成功載入文章「${article.title}」，您可以直接修改內容並重新發布。`);
    } else {
      console.log("找不到此 ID 的文章，將視為新文章建立。");
    }

    finishLoadingBar();
  } catch (error) {
    console.error("載入文章發生錯誤:", error);
    errorLoadingBar();
  }
}

// 動態新增積木函式
function addBlock(type, data = {}) {
  const container = document.getElementById("blocks-container");
  const blockDiv = document.createElement("div");
  blockDiv.className = "block-item";
  blockDiv.dataset.type = type;

  let innerHTML = `
    <div class="block-header">
      <span>${getBlockTypeName(type)} 積木</span>
      <div>
        <button type="button" class="block-drag-handle" title="上下移動">☰</button>
        <button type="button" class="btn btn-danger" onclick="this.closest('.block-item').remove()">刪除</button>
      </div>
    </div>
  `;

  if (type === "text") {
    innerHTML += `<textarea class="form-control" placeholder="請輸入段落文字..." rows="3">${escapeHtml(data.content || '')}</textarea>`;
  } else if (type === "image") {
    innerHTML += `
      <input type="url" class="form-control" placeholder="圖片網址 (https://...)" value="${escapeHtml(data.url || '')}" style="margin-bottom: 10px;">
      <input type="text" class="form-control" placeholder="圖片說明文字 (選填)" value="${escapeHtml(data.caption || '')}">
    `;
  } else if (type === "quote") {
    innerHTML += `
      <textarea class="form-control" placeholder="引言內容..." rows="2" style="margin-bottom: 10px;">${escapeHtml(data.content || '')}</textarea>
      <input type="text" class="form-control" placeholder="引言作者 / 出處 (選填)" value="${escapeHtml(data.author || '')}">
    `;
  }

  blockDiv.innerHTML = innerHTML;
  container.appendChild(blockDiv);
}

function getBlockTypeName(type) {
  switch (type) {
    case 'text': return '文字段落';
    case 'image': return '圖片';
    case 'quote': return '引言';
    default: return '未知';
  }
}

// 收集積木資料並提交至 Google Apps Script API
async function handleArticleSubmit(e) {
  e.preventDefault();

  const id = document.getElementById("article_id").value.trim();
  const title = document.getElementById("title").value.trim();
  const category = document.getElementById("category").value;
  const author = document.getElementById("author").value.trim();
  const cover_image = document.getElementById("cover_image").value.trim();
  const short_code = document.getElementById("short_id_hidden").value.trim();

  // 收集所有積木內容
  const blockItems = document.querySelectorAll(".block-item");
  const layout_json = [];

  blockItems.forEach(item => {
    const type = item.dataset.type;
    if (type === "text") {
      const content = item.querySelector("textarea").value.trim();
      if (content) layout_json.push({ type: "text", content });
    } else if (type === "image") {
      const inputs = item.querySelectorAll("input");
      const url = inputs[0].value.trim();
      const caption = inputs[1].value.trim();
      if (url) layout_json.push({ type: "image", url, caption });
    } else if (type === "quote") {
      const content = item.querySelector("textarea").value.trim();
      const authorField = item.querySelector("input").value.trim();
      if (content) layout_json.push({ type: "quote", content, author: authorField });
    }
  });

  if (layout_json.length === 0) {
    showCustomModal("提示", "請至少新增一個有內容的積木！");
    return;
  }

  const payload = {
    id,
    title,
    category,
    author,
    cover_image,
    short_code,
    layout_json: JSON.stringify(layout_json)
  };

  startLoadingBar();

  try {
    const response = await fetch(GAS_API_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const result = await response.json();

    if (result.status === "success") {
      // 成功後清除快取，確保首頁與列表能抓到最新資料
      localStorage.removeItem("sna_articles_cache");
      finishLoadingBar();
      showCustomModal("發布成功", "文章已成功同步至雲端試算表！", () => {
        window.location.href = "../html/all_articles.html";
      });
    } else {
      errorLoadingBar();
      showCustomModal("發布失敗", `伺服器回應異常：${result.message || '未知錯誤'}`);
    }
  } catch (error) {
    console.error("提交失敗:", error);
    errorLoadingBar();
    showCustomModal("連線錯誤", "無法連線至雲端後台 API，請檢查網路連線。");
  }
}

// 智慧分段彈窗相關邏輯
function openSmartSplitModal() {
  let smartModal = document.getElementById("smart-split-modal");
  if (!smartModal) {
    smartModal = document.createElement("div");
    smartModal.className = "modal-overlay";
    smartModal.id = "smart-split-modal";
    smartModal.innerHTML = `
      <div class="modal-box" style="max-width: 500px;">
        <div class="modal-title">智慧貼上與分段</div>
        <div class="modal-desc">請將完整文章貼於下方。系統將會自動以「換行」為單位，將每一段文字獨立轉化為文字段落積木。</div>
        <textarea id="smart-paste-text" class="form-control" rows="8" placeholder="在此貼上文章內容..."></textarea>
        <div class="modal-actions" style="margin-top: 20px;">
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('smart-split-modal').classList.remove('active')">取消</button>
          <button type="button" class="btn btn-primary" onclick="processSmartSplit()">確認生成積木</button>
        </div>
      </div>
    `;
    document.body.appendChild(smartModal);
  }
  smartModal.classList.add("active");
  document.getElementById("smart-paste-text").value = "";
}

function processSmartSplit() {
  const text = document.getElementById("smart-paste-text").value;
  if (!text.trim()) {
    alert("請先輸入或貼上文字！");
    return;
  }

  const paragraphs = text.split(/\r?\n+/).map(p => p.trim()).filter(p => p.length > 0);
  paragraphs.forEach(p => {
    addBlock('text', { content: p });
  });

  document.getElementById("smart-split-modal").classList.remove("active");
}

// 共用自訂彈窗
function showCustomModal(title, desc, callback) {
  const modal = document.getElementById("custom-modal");
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-desc").textContent = desc;
  const actions = document.getElementById("modal-actions");
  
  actions.innerHTML = `<button type="button" class="btn btn-primary" id="modal-ok-btn">確定</button>`;
  modal.classList.add("active");

  document.getElementById("modal-ok-btn").onclick = () => {
    modal.classList.remove("active");
    if (callback) callback();
  };
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