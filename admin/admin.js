// ==========================================
//   SNA 新聞發布後台邏輯控制碼 (admin.js)
//   ==========================================

const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzvdZebFO9zsqGfxw3ROM36rB5KfOWwuQ7G7AShSh0FpqgsGKpEENwf3-BUw1QmnbQ/exec";

document.addEventListener("DOMContentLoaded", async () => {
  await loadComponent("site-header-container", "../components/header.html");
  await loadComponent("site-footer-container", "../components/footer.html");

  initThemeSwitcher();
  initSideDrawer();

  addBlock('text');
  document.getElementById("article-form").addEventListener("submit", handleFormSubmitClick);

  // 加上這段：讓封面圖片輸入框在失去焦點時自動轉換 Google 雲端硬碟連結
  const coverInput = document.getElementById("cover_image");
  if (coverInput) {
    coverInput.addEventListener("blur", function () {
      this.value = convertGoogleDriveLink(this.value);
    });
  }
});

// 自動調整 textarea 高度的通用函式
function autoResizeTextarea(textarea) {
  textarea.style.height = 'auto'; // 先重設高度以正確計算內容高度
  textarea.style.height = (textarea.scrollHeight + 2) + 'px'; // 依據實際內容高度設定
}

// 動態新增積木（支援帶入預設內容，並自動加入拖曳排序與拖曳握把）
function addBlock(type, data = {}) {
  const container = document.getElementById("blocks-container");
  const blockId = 'block_' + Date.now() + Math.random().toString(36).substring(2, 7);
  const div = document.createElement("div");
  div.className = "block-item";
  div.dataset.type = type;
  div.id = blockId;
  div.draggable = true; // 允許拖曳

  let typeName = "文字段落";
  if (type === 'image') typeName = "圖片積木";
  if (type === 'quote') typeName = "引言積木";

  let innerHTML = `
    <div class="block-header" style="display: flex; align-items: center; justify-content: space-between;">
      <div style="display: flex; align-items: center;">
        <button type="button" class="block-drag-handle" title="按住拖曳排序">☰</button>
        <span>[ ${typeName} ]</span>
      </div>
      <button type="button" class="btn btn-danger" onclick="document.getElementById('${blockId}').remove()">移除</button>
    </div>
  `;

  if (type === 'text') {
    innerHTML += `
      <textarea class="form-control auto-resize" rows="2" placeholder="輸入段落內容...">${data.content || ''}</textarea>
    `;
  } else if (type === 'image') {
    innerHTML += `
      <input type="url" class="form-control img-url" placeholder="圖片網址 URL (支援 Google 雲端硬碟自動轉換)" value="${data.url || ''}" style="margin-bottom: 10px;">
      <input type="text" class="form-control img-caption" placeholder="圖片說明文字 (Caption)" value="${data.caption || ''}">
    `;
  } else if (type === 'quote') {
    innerHTML += `
      <textarea class="form-control quote-content auto-resize" rows="2" placeholder="引言內容..." style="margin-bottom: 10px;">${data.content || ''}</textarea>
      <input type="text" class="form-control quote-author" placeholder="引言出處 / 作者" value="${data.author || ''}">
    `;
  }

  div.innerHTML = innerHTML;
  container.appendChild(div);

  // 綁定拖曳事件 (Drag and Drop)
  div.addEventListener('dragstart', () => {
    div.classList.add('dragging');
  });

  div.addEventListener('dragend', () => {
    div.classList.remove('dragging');
  });

  // 針對剛建立的 textarea 綁定自動增高事件，並初始化高度
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

// 支援整個容器內的上下拖曳排序與圖片連結自動轉換監聽
const container = document.getElementById("blocks-container");
if (container) {
  container.addEventListener('dragover', e => {
    e.preventDefault();
    const draggingItem = document.querySelector('.dragging');
    if (!draggingItem) return;
    const siblings = [...container.querySelectorAll('.block-item:not(.dragging)')];

    const nextSibling = siblings.find(sibling => {
      const box = sibling.getBoundingClientRect();
      return e.clientY <= box.top + box.height / 2;
    });

    if (nextSibling) {
      container.insertBefore(draggingItem, nextSibling);
    } else {
      container.appendChild(draggingItem);
    }
  });

  // 讓動態產生的圖片積木網址也能自動轉換 Google 雲端硬碟連結
  container.addEventListener("blur", function (e) {
    if (e.target && e.target.classList.contains("img-url")) {
      e.target.value = convertGoogleDriveLink(e.target.value);
    }
  }, true);
}

// 開啟智慧分段彈窗
function openSmartSplitModal() {
  showModal({
    title: "智慧貼上與分段",
    desc: `請將記事本中的整篇新聞貼在下方。系統會自動以空白行（段落間隔）為您切開，並自動建立對應的多個文字積木：<br><br>
      <textarea id="smart-paste-text" class="form-control" rows="8" placeholder="在此貼上整篇新聞內容..." style="resize: vertical;"></textarea>
    `,
    showCancel: true,
    confirmText: "確認自動分段",
    onConfirm: executeSmartSplit
  });
}

// 執行智慧分段邏輯
function executeSmartSplit() {
  const rawText = document.getElementById("smart-paste-text").value;
  if (!rawText.trim()) {
    alert("請先輸入或貼上文章內容！");
    return;
  }

  // 以一個或多個空行（包含空白字元）作為段落切割依據
  const paragraphs = rawText.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);

  if (paragraphs.length === 0) {
    alert("沒有偵測到有效段落。");
    return;
  }

  // 逐一建立文字積木
  paragraphs.forEach(text => {
    addBlock('text', { content: text });
  });

  closeModal();
}

// 點擊送出時，先跳出確認彈窗
function handleFormSubmitClick(e) {
  e.preventDefault();
  const title = document.getElementById("title").value;
  const articleId = document.getElementById("article_id").value;

  showModal({
    title: "確認發布文章",
    desc: `您即將發布文章：<br><strong>「${title}」</strong><br>(編號: ${articleId})<br><br>確定要寫入至 Google 試算表嗎？`,
    showCancel: true,
    confirmText: "確認發布",
    onConfirm: executePublish
  });
}

// 執行發布至 GAS 的核心邏輯
async function executePublish() {
  showModal({ title: "發布中...", desc: "正在計算短代碼並上傳至雲端資料庫，請稍候...", showCancel: false });

  const id = document.getElementById("article_id").value;
  const title = document.getElementById("title").value;
  const category = document.getElementById("category").value;
  const author = document.getElementById("author").value;
  const cover_image = document.getElementById("cover_image").value;

  try {
    const resCheck = await fetch(GAS_API_URL);
    const resultCheck = await resCheck.json();
    const articles = (resultCheck.status === "success" && resultCheck.articles) ? resultCheck.articles : [];

    const now = new Date();
    const yearFull = now.getFullYear();
    const yearShort = String(yearFull).slice(-2);

    const currentYearArticles = articles.filter(item => {
      return item.publish_date && item.publish_date.startsWith(String(yearFull));
    });
    const sequenceNum = currentYearArticles.length + 1;
    const short_id = yearShort + String(sequenceNum).padStart(3, '0');

    const pad = (n) => String(n).padStart(2, '0');
    const publish_date = `${yearFull}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} · ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

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

    const payload = {
      id,
      title,
      short_code: short_id,
      category,
      author,
      cover_image,
      publish_date,
      views: 0,
      layout_json: JSON.stringify(layoutBlocks)
    };

    const res = await fetch(GAS_API_URL, {
      method: "POST",
      redirect: "follow",
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (result.status === "success") {
      showModal({
        title: "發布成功",
        desc: `文章已成功寫入試算表！<br>短代碼: ${short_id}<br>時間: ${publish_date}`,
        showCancel: false,
        confirmText: "確定",
        onConfirm: () => {
          document.getElementById("article-form").reset();
          document.getElementById("blocks-container").innerHTML = "";
          addBlock('text');
          closeModal();
        }
      });
    } else {
      showModal({ title: "發布失敗", desc: result.message, showCancel: false });
    }

  } catch (err) {
    console.error(err);
    showModal({ title: "連線異常", desc: "無法連線至 GAS 後台，請檢查網路或 API 設定。", showCancel: false });
  }
}

// 控制自訂置中彈窗的顯示
function showModal({ title, desc, showCancel, confirmText = "確定", onConfirm }) {
  const overlay = document.getElementById("custom-modal");
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-desc").innerHTML = desc;

  const actionsEl = document.getElementById("modal-actions");
  let html = `<button type="button" class="btn btn-primary" id="modal-confirm-btn" style="width: auto !important; padding: 10px 24px !important; color: #fff !important;">${confirmText}</button>`;
  if (showCancel) {
    html += `<button type="button" class="btn btn-secondary" id="modal-cancel-btn">取消發布</button>`;
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

// 共用組件載入函式
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

// 控制頂部進度條控制函式
function startLoadingBar() {
  const bar = document.getElementById("global-loading-bar");
  if (!bar) return;

  bar.classList.add("loading", "loading-pulse");
  bar.style.width = "30%";

  // 模擬緩慢推進至 85%（給使用者流暢的載入預期）
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

// 自動將 Google 雲端硬碟共用連結轉換為直連圖片格式 (lh3.googleusercontent.com)
function convertGoogleDriveLink(url) {
  if (!url) return url;

  let fileId = "";

  // 支援 /file/d/FILE_ID/view 或 ?id=FILE_ID 等常見格式
  const matchD = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  const matchIdParam = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);

  if (matchD && matchD[1]) {
    fileId = matchD[1];
  } else if (matchIdParam && matchIdParam[1]) {
    fileId = matchIdParam[1];
  }

  // 如果成功抓到 File ID，就組合成目標格式
  if (fileId) {
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  return url; // 如果不是 Google 雲端連結，就保持原樣
}