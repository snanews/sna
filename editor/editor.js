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

  // 4. 綁定表單提交（更新文章）事件
  const form = document.getElementById("article-form");
  if (form) {
    form.addEventListener("submit", handleFormSubmitClick);
  }

  // 預設一開始給一個空白段落積木
  addBlock('text');
});

// 共用組件載入函式
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

// 自動調整 textarea 高度的通用函式
function autoResizeTextarea(textarea) {
  textarea.style.height = 'auto'; // 先重設高度以正確計算內容高度
  textarea.style.height = (textarea.scrollHeight + 2) + 'px'; // 依據實際內容高度設定
}

// 核心功能：根據輸入的 ID 讀取既有文章資料並還原到表單與積木中
async function loadExistingArticleToEditor(articleId) {
  startLoadingBar();
  try {
    let article = null;
    const cachedData = localStorage.getItem("sna_articles_cache");
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      const articles = parsed.articles || [];
      article = articles.find(item => String(item.id) === String(articleId));
    }

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
      
      document.getElementById("title").value = article.title || "";
      document.getElementById("category").value = article.category || "自治";
      document.getElementById("author").value = article.author || "SNA 新聞組";
      document.getElementById("cover_image").value = article.cover_image || "";
      
      const shortIdInput = document.getElementById("short_id_hidden");
      if (shortIdInput) shortIdInput.value = article.short_code || "";

      const container = document.getElementById("blocks-container");
      container.innerHTML = "";

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

      showModal({
        title: "讀取成功",
        desc: `已成功載入文章「${article.title}」，您可以直接修改內容並更新。`,
        showCancel: false,
        confirmText: "確定"
      });
    } else {
      console.log("找不到此 ID 的文章，將視為新文章建立。");
    }

    finishLoadingBar();
  } catch (error) {
    console.error("載入文章發生錯誤:", error);
    errorLoadingBar();
  }
}

// 動態新增積木（具備自動調整高度與標準樣式）
function addBlock(type, data = {}) {
  const container = document.getElementById("blocks-container");
  const blockId = 'block_' + Date.now() + Math.random().toString(36).substring(2, 7);
  const div = document.createElement("div");
  div.className = "block-item";
  div.dataset.type = type;
  div.id = blockId;

  let typeName = "文字段落";
  if (type === 'image') typeName = "圖片積木";
  if (type === 'quote') typeName = "引言積木";

  let innerHTML = `
    <div class="block-header">
      <span>[ ${typeName} ]</span>
      <div>
        <button type="button" class="block-drag-handle" title="上下移動" style="background:none; border:none; cursor:grab; color:var(--text-muted); font-weight:bold; font-size:1.1rem; padding:0 6px;">☰</button>
        <button type="button" class="btn btn-danger" onclick="document.getElementById('${blockId}').remove()">移除</button>
      </div>
    </div>
  `;

  if (type === 'text') {
    innerHTML += `
      <textarea class="form-control auto-resize" rows="2" placeholder="輸入段落內容...">${escapeHtml(data.content || '')}</textarea>
    `;
  } else if (type === 'image') {
    innerHTML += `
      <input type="url" class="form-control img-url" placeholder="圖片網址 URL" value="${escapeHtml(data.url || '')}" style="margin-bottom: 10px;">
      <input type="text" class="form-control img-caption" placeholder="圖片說明文字 (Caption)" value="${escapeHtml(data.caption || '')}">
    `;
  } else if (type === 'quote') {
    innerHTML += `
      <textarea class="form-control quote-content auto-resize" rows="2" placeholder="引言內容..." style="margin-bottom: 10px;">${escapeHtml(data.content || '')}</textarea>
      <input type="text" class="form-control quote-author" placeholder="引言出處 / 作者" value="${escapeHtml(data.author || '')}">
    `;
  }

  div.innerHTML = innerHTML;
  container.appendChild(div);

  // 自動綁定 textarea 高度調整事件並初始化高度
  const textareas = div.querySelectorAll('.auto-resize');
  textareas.forEach(textarea => {
    if (textarea.value) {
      autoResizeTextarea(textarea);
    }
    textarea.addEventListener('input', function () {
      autoResizeTextarea(this);
    });
  });
}

// 點擊送出時，跳出高質感確認彈窗
function handleFormSubmitClick(e) {
  e.preventDefault();
  const title = document.getElementById("title").value;
  const articleId = document.getElementById("article_id").value;

  showModal({
    title: "確認更新文章",
    desc: `您即將更新文章：<br><strong>「${title}」</strong><br>(編號: ${articleId})<br><br>確定要將變更同步至雲端試算表嗎？`,
    showCancel: true,
    confirmText: "確認更新",
    onConfirm: executeUpdate
  });
}

// 執行更新至 GAS 的核心邏輯
async function executeUpdate() {
  showModal({ title: "更新中...", desc: "正在同步資料至雲端資料庫，請稍候...", showCancel: false });

  const id = document.getElementById("article_id").value;
  const title = document.getElementById("title").value;
  const category = document.getElementById("category").value;
  const author = document.getElementById("author").value;
  const cover_image = document.getElementById("cover_image").value;
  const short_code = document.getElementById("short_id_hidden") ? document.getElementById("short_id_hidden").value : "";

  try {
    const blockElements = document.querySelectorAll(".block-item");
    const layoutBlocks = [];

    blockElements.forEach(el => {
      const type = el.dataset.type;
      if (type === 'text') {
        const content = el.querySelector("textarea").value;
        if (content) layoutBlocks.push({ type: "text", content });
      } else if (type === 'image') {
        const url = el.querySelector(".img-url").value;
        const caption = el.querySelector(".img-caption").value;
        if (url) layoutBlocks.push({ type: "image", url, caption });
      } else if (type === 'quote') {
        const content = el.querySelector(".quote-content").value;
        const author = el.querySelector(".quote-author").value;
        if (content) layoutBlocks.push({ type: "quote", content, author });
      }
    });

    if (layoutBlocks.length === 0) {
      showModal({ title: "提示", desc: "請至少新增一個有內容的積木！", showCancel: false });
      return;
    }

    const payload = {
      id,
      title,
      short_code,
      category,
      author,
      cover_image,
      layout_json: JSON.stringify(layoutBlocks)
    };

    const res = await fetch(GAS_API_URL, {
      method: "POST",
      redirect: "follow",
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (result.status === "success") {
      localStorage.removeItem("sna_articles_cache");
      showModal({
        title: "更新成功",
        desc: `文章已成功同步至雲端試算表！`,
        showCancel: false,
        confirmText: "確定",
        onConfirm: () => {
          closeModal();
          window.location.href = "../html/all_articles.html";
        }
      });
    } else {
      showModal({ title: "更新失敗", desc: result.message || "未知錯誤", showCancel: false });
    }

  } catch (err) {
    console.error(err);
    showModal({ title: "連線異常", desc: "無法連線至 GAS 後台，請檢查網路或 API 設定。", showCancel: false });
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
        <div class="modal-desc" style="text-align: left !important; line-height: 1.6 !important;">請將完整文章貼於下方。系統將會自動以「換行」為單位，將每一段文字獨立轉化為文字段落積木。</div>
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

// 控制自訂置中彈窗的顯示
function showModal({ title, desc, showCancel, confirmText = "確定", onConfirm }) {
  const overlay = document.getElementById("custom-modal");
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-desc").innerHTML = desc;

  const actionsEl = document.getElementById("modal-actions");
  let html = `<button type="button" class="btn btn-primary" id="modal-confirm-btn" style="width: auto !important; padding: 10px 24px !important; color: #fff !important;">${confirmText}</button>`;
  if (showCancel) {
    html += `<button type="button" class="btn btn-secondary" id="modal-cancel-btn">取消</button>`;
  }
  actionsEl.innerHTML = html;

  document.getElementById("modal-confirm-btn").onclick = () => {
    if (onConfirm) onConfirm();
    else closeModal();
  };

  if (showCancel) {
    document.getElementById("modal-cancel-btn").onclick = closeModal;
  }

  overlay.classList.add("active");
}

function closeModal() {
  document.getElementById("custom-modal").classList.remove("active");
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

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 控制頂部進度條控制函式
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