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
});

// 自動調整 textarea 高度的通用函式
function autoResizeTextarea(textarea) {
  textarea.style.height = 'auto'; // 先重設高度以正確計算內容高度
  textarea.style.height = (textarea.scrollHeight + 2) + 'px'; // 依據實際內容高度設定
}

// 動態新增積木
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
      <button type="button" class="btn btn-danger" onclick="document.getElementById('${blockId}').remove()">移除</button>
    </div>
  `;
  
  if (type === 'text') {
    innerHTML += `
      <textarea class="form-control auto-resize" rows="2" placeholder="輸入段落內容...">${data.content || ''}</textarea>
    `;
  } else if (type === 'image') {
    innerHTML += `
      <input type="url" class="form-control img-url" placeholder="圖片網址 URL" value="${data.url || ''}" style="margin-bottom: 10px;">
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

  // 針對剛建立的 textarea 綁定自動增高事件，並初始化高度
  const textareas = div.querySelectorAll('.auto-resize');
  textareas.forEach(textarea => {
    if (textarea.value) {
      autoResizeTextarea(textarea); // 如果有預設資料（如修改時），先撐開
    }
    textarea.addEventListener('input', function() {
      autoResizeTextarea(this);
    });
  });
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