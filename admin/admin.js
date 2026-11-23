// ==========================================
//   SNA 新聞發布後台邏輯控制碼 (admin.js)
// ==========================================

const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzvdZebFO9zsqGfxw3ROM36rB5KfOWwuQ7G7AShSh0FpqgsGKpEENwf3-BUw1QmnbQ/exec"; //[span_2](start_span)[span_2](end_span)

document.addEventListener("DOMContentLoaded", async () => {
  await loadComponent("site-header-container", "../components/header.html"); //[span_3](start_span)[span_3](end_span)
  await loadComponent("site-footer-container", "../components/footer.html"); //[span_4](start_span)[span_4](end_span)

  renderHeader(); //[span_5](start_span)[span_5](end_span)
  initThemeSwitcher(); //[span_6](start_span)[span_6](end_span)
  initSideDrawer(); //[span_7](start_span)[span_7](end_span)

  const coverInput = document.getElementById("cover_image");
  if (coverInput) {
    coverInput.addEventListener("blur", function () {
      this.value = convertGoogleDriveLink(this.value);
    });
  }

  const form = document.getElementById("article-form");
  if (form) {
    form.addEventListener("submit", handleFormSubmitClick); //[span_8](start_span)[span_8](end_span)
  }

  initBlocksContainerInteractions();
});

// 共用組件載入函式（自動修正 Header/Footer 內部相對連結）
async function loadComponent(containerId, filePath) {
  try {
    const isGitHubPages = window.location.hostname.includes("github.io"); //[span_9](start_span)[span_9](end_span)
    const basePath = isGitHubPages ? "/sna/" : "/"; //[span_10](start_span)[span_10](end_span)

    let fullPath = filePath;
    if (!filePath.startsWith("../") && !filePath.startsWith("/")) { //[span_11](start_span)[span_11](end_span)
      fullPath = basePath + filePath; //[span_12](start_span)[span_12](end_span)
    }

    const response = await fetch(fullPath); //[span_13](start_span)[span_13](end_span)
    if (!response.ok) throw new Error(`無法載入 ${fullPath}`); //[span_14](start_span)[span_14](end_span)
    const html = await response.text(); //[span_15](start_span)[span_15](end_span)
    const container = document.getElementById(containerId); //[span_16](start_span)[span_16](end_span)

    if (container) {
      container.innerHTML = html; //[span_17](start_span)[span_17](end_span)

      if (containerId === "site-header-container") { //[span_18](start_span)[span_18](end_span)
        const logoLink = container.querySelector(".site-logo"); //[span_19](start_span)[span_19](end_span)
        const homeTab = container.querySelector(".category-tab[href='index.html']"); //[span_20](start_span)[span_20](end_span)
        const drawerHome = container.querySelector(".drawer-link[href='index.html']"); //[span_21](start_span)[span_21](end_span)

        const relativeHomePath = window.location.pathname.includes("/admin/") ||
          window.location.pathname.includes("/articles/") ||
          window.location.pathname.includes("/html/") ||
          window.location.pathname.includes("/editor/")
          ? "../index.html"
          : "index.html"; //[span_22](start_span)[span_22](end_span)

        if (logoLink) logoLink.setAttribute("href", relativeHomePath); //[span_23](start_span)[span_23](end_span)
        if (homeTab) homeTab.setAttribute("href", relativeHomePath); //[span_24](start_span)[span_24](end_span)
        if (drawerHome) drawerHome.setAttribute("href", relativeHomePath); //[span_25](start_span)[span_25](end_span)
      }

      if (containerId === "site-footer-container") { //[span_26](start_span)[span_26](end_span)
        const footerLinks = container.querySelectorAll("a"); //[span_27](start_span)[span_27](end_span)
        footerLinks.forEach(link => {
          const href = link.getAttribute("href"); //[span_28](start_span)[span_28](end_span)
          if (href && href === "index.html") { //[span_29](start_span)[span_29](end_span)
            link.setAttribute("href", "../index.html"); //[span_30](start_span)[span_30](end_span)
          }
        });
      }
    }
  } catch (error) {
    console.error("載入組件失敗:", error); //[span_31](start_span)[span_31](end_span)
  }
}

// 自動調整 textarea 高度的通用函式
function autoResizeTextarea(textarea) {
  textarea.style.height = "auto"; //[span_32](start_span)[span_32](end_span)
  textarea.style.height = (textarea.scrollHeight + 2) + "px"; //[span_33](start_span)[span_33](end_span)
}

// 動態新增積木（具備自動調整高度、拖曳排序與雲端硬碟圖片支援）
function addBlock(type, data = {}) {
  const container = document.getElementById("blocks-container"); //[span_34](start_span)[span_34](end_span)
  if (!container) return;

  const blockId = "block_" + Date.now() + Math.random().toString(36).substring(2, 7); //[span_35](start_span)[span_35](end_span)[span_36](start_span)[span_36](end_span)
  const div = document.createElement("div"); //[span_37](start_span)[span_37](end_span)[span_38](start_span)[span_38](end_span)
  div.className = "block-item"; //[span_39](start_span)[span_39](end_span)[span_40](start_span)[span_40](end_span)
  div.dataset.type = type; //[span_41](start_span)[span_41](end_span)[span_42](start_span)[span_42](end_span)
  div.id = blockId; //[span_43](start_span)[span_43](end_span)[span_44](start_span)[span_44](end_span)
  div.draggable = true; //[span_45](start_span)[span_45](end_span)

  let typeName = "文字段落"; //[span_46](start_span)[span_46](end_span)[span_47](start_span)[span_47](end_span)
  if (type === "image") typeName = "圖片積木"; //[span_48](start_span)[span_48](end_span)[span_49](start_span)[span_49](end_span)
  if (type === "quote") typeName = "引言積木"; //[span_50](start_span)[span_50](end_span)[span_51](start_span)[span_51](end_span)

  let innerHTML = `
    <div class="block-header" style="display: flex; align-items: center; justify-content: space-between;">
      <div style="display: flex; align-items: center;">
        <button type="button" class="block-drag-handle" title="按住拖曳排序" style="background:none; border:none; cursor:grab; color:var(--text-muted); font-weight:bold; font-size:1.1rem; padding:0 6px; margin-right:4px;">☰</button>
        <span>[ ${typeName} ]</span>
      </div>
      <button type="button" class="btn btn-danger" onclick="document.getElementById('${blockId}').remove()">移除</button>
    </div>
  `; //[span_52](start_span)[span_52](end_span)

  if (type === "text") { //[span_53](start_span)[span_53](end_span)[span_54](start_span)[span_54](end_span)
    innerHTML += `
      <textarea class="form-control auto-resize" rows="2" placeholder="輸入段落內容...">${escapeHtml(data.content || "")}</textarea>
    `; //[span_55](start_span)[span_55](end_span)
  } else if (type === "image") { //[span_56](start_span)[span_56](end_span)[span_57](start_span)[span_57](end_span)
    innerHTML += `
      <input type="url" class="form-control img-url" placeholder="圖片網址 URL (支援 Google 雲端硬碟自動轉換)" value="${escapeHtml(data.url || "")}" style="margin-bottom: 10px;">
      <input type="text" class="form-control img-caption" placeholder="圖片說明文字 (Caption)" value="${escapeHtml(data.caption || "")}">
    `; //[span_58](start_span)[span_58](end_span)
  } else if (type === "quote") { //[span_59](start_span)[span_59](end_span)[span_60](start_span)[span_60](end_span)
    innerHTML += `
      <textarea class="form-control quote-content auto-resize" rows="2" placeholder="引言內容..." style="margin-bottom: 10px;">${escapeHtml(data.content || "")}</textarea>
      <input type="text" class="form-control quote-author" placeholder="引言出處 / 作者" value="${escapeHtml(data.author || "")}">
    `; //[span_61](start_span)[span_61](end_span)
  }

  div.innerHTML = innerHTML; //[span_62](start_span)[span_62](end_span)[span_63](start_span)[span_63](end_span)
  container.appendChild(div); //[span_64](start_span)[span_64](end_span)[span_65](start_span)[span_65](end_span)

  div.addEventListener("dragstart", () => {
    div.classList.add("dragging"); //[span_66](start_span)[span_66](end_span)
  });

  div.addEventListener("dragend", () => {
    div.classList.remove("dragging"); //[span_67](start_span)[span_67](end_span)
  });

  const textareas = div.querySelectorAll(".auto-resize"); //[span_68](start_span)[span_68](end_span)[span_69](start_span)[span_69](end_span)
  textareas.forEach(textarea => {
    if (textarea.value) {
      autoResizeTextarea(textarea); //[span_70](start_span)[span_70](end_span)[span_71](start_span)[span_71](end_span)
    }
    textarea.addEventListener("input", function () {
      autoResizeTextarea(this); //[span_72](start_span)[span_72](end_span)[span_73](start_span)[span_73](end_span)
    });
  });
}

// 初始化積木容器的拖曳排序與圖片連結自動轉換監聽
function initBlocksContainerInteractions() {
  const container = document.getElementById("blocks-container"); //[span_74](start_span)[span_74](end_span)
  if (!container) return; //[span_75](start_span)[span_75](end_span)

  container.addEventListener("dragover", e => {
    e.preventDefault(); //[span_76](start_span)[span_76](end_span)
    const draggingItem = document.querySelector(".dragging"); //[span_77](start_span)[span_77](end_span)
    if (!draggingItem) return; //[span_78](start_span)[span_78](end_span)

    const siblings = [...container.querySelectorAll(".block-item:not(.dragging)")]; //[span_79](start_span)[span_79](end_span)
    const nextSibling = siblings.find(sibling => {
      const box = sibling.getBoundingClientRect(); //[span_80](start_span)[span_80](end_span)
      return e.clientY <= box.top + box.height / 2; //[span_81](start_span)[span_81](end_span)
    });

    if (nextSibling) {
      container.insertBefore(draggingItem, nextSibling); //[span_82](start_span)[span_82](end_span)
    } else {
      container.appendChild(draggingItem); //[span_83](start_span)[span_83](end_span)
    }
  });

  container.addEventListener("blur", function (e) {
    if (e.target && e.target.classList.contains("img-url")) { //[span_84](start_span)[span_84](end_span)
      e.target.value = convertGoogleDriveLink(e.target.value); //[span_85](start_span)[span_85](end_span)
    }
  }, true);
}

// 點擊送出時，先跳出確認彈窗
function handleFormSubmitClick(e) {
  e.preventDefault(); //[span_86](start_span)[span_86](end_span)
  const title = document.getElementById("title").value.trim(); //[span_87](start_span)[span_87](end_span)
  const articleId = document.getElementById("article_id").value.trim(); //[span_88](start_span)[span_88](end_span)

  showModal({
    title: "確認發布文章",
    desc: `您即將發布文章：<br><strong>「${escapeHtml(title)}」</strong><br>(編號: ${escapeHtml(articleId)})<br><br>確定要寫入至 Google 試算表嗎？`,
    showCancel: true,
    confirmText: "確認發布",
    onConfirm: executePublish
  }); //[span_89](start_span)[span_89](end_span)
}

// 執行發布至 GAS 的核心邏輯
async function executePublish() {
  showModal({ title: "發布中...", desc: "正在計算短代碼並上傳至雲端資料庫，請稍候...", showCancel: false });
  startLoadingBar();

  const id = document.getElementById("article_id").value.trim();
  const title = document.getElementById("title").value.trim();
  const category = document.getElementById("category").value;
  const author = document.getElementById("author").value.trim();
  const coverInput = document.getElementById("cover_image");
  const cover_image = convertGoogleDriveLink(coverInput ? coverInput.value.trim() : "");
  if (coverInput) coverInput.value = cover_image;
  const featuredInput = document.getElementById("is_featured");
  const is_featured = featuredInput ? featuredInput.checked : true;

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
    const short_id = yearShort + String(sequenceNum).padStart(3, "0");

    const pad = (n) => String(n).padStart(2, "0");
    const publish_date = `${yearFull}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} · ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const blockElements = document.querySelectorAll(".block-item");
    const layoutBlocks = [];

    blockElements.forEach(el => {
      const type = el.dataset.type;
      if (type === "text") {
        const content = el.querySelector("textarea").value;
        if (content) layoutBlocks.push({ type: "text", content });
      } else if (type === "image") {
        const imgUrlInput = el.querySelector(".img-url");
        const url = convertGoogleDriveLink(imgUrlInput ? imgUrlInput.value.trim() : "");
        if (imgUrlInput) imgUrlInput.value = url;
        const caption = el.querySelector(".img-caption").value;
        if (url) layoutBlocks.push({ type: "image", url, caption });
      } else if (type === "quote") {
        const content = el.querySelector(".quote-content").value;
        const quoteAuthor = el.querySelector(".quote-author").value;
        if (content) layoutBlocks.push({ type: "quote", content, author: quoteAuthor });
      }
    });

    const payload = {
      id,
      title,
      short_code: short_id,
      category,
      author,
      cover_image,
      is_featured,
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
      localStorage.removeItem("sna_articles_cache");
      finishLoadingBar();
      showModal({
        title: "發布成功",
        desc: `文章已成功寫入試算表！<br>短代碼: ${short_id}<br>時間: ${publish_date}`,
        showCancel: false,
        confirmText: "確定",
        onConfirm: () => {
          document.getElementById("article-form").reset();
          if (featuredInput) featuredInput.checked = true;
          document.getElementById("blocks-container").innerHTML = "";
          addBlock("text");
          closeModal();
        }
      });
    } else {
      errorLoadingBar();
      showModal({ title: "發布失敗", desc: result.message || "未知錯誤", showCancel: false });
    }
  } catch (err) {
    console.error(err);
    errorLoadingBar();
    showModal({ title: "連線異常", desc: "無法連線至 GAS 後台，請檢查網路或 API 設定。", showCancel: false });
  }
}

// 控制自訂置中彈窗的顯示
function showModal({ title, desc, showCancel, confirmText = "確定", onConfirm }) {
  const overlay = document.getElementById("custom-modal"); //[span_130](start_span)[span_130](end_span)
  document.getElementById("modal-title").textContent = title; //[span_131](start_span)[span_131](end_span)
  document.getElementById("modal-desc").innerHTML = desc; //[span_132](start_span)[span_132](end_span)

  const actionsEl = document.getElementById("modal-actions"); //[span_133](start_span)[span_133](end_span)
  let html = `<button type="button" class="btn btn-primary" id="modal-confirm-btn" style="width: auto !important; padding: 10px 24px !important; color: #fff !important;">${escapeHtml(confirmText)}</button>`; //[span_134](start_span)[span_134](end_span)
  if (showCancel) {
    html += `<button type="button" class="btn btn-secondary" id="modal-cancel-btn">取消發布</button>`; //[span_135](start_span)[span_135](end_span)
  }
  actionsEl.innerHTML = html; //[span_136](start_span)[span_136](end_span)

  document.getElementById("modal-confirm-btn").onclick = () => {
    if (onConfirm) onConfirm(); //[span_137](start_span)[span_137](end_span)
    else closeModal(); //[span_138](start_span)[span_138](end_span)
  };

  if (showCancel) {
    document.getElementById("modal-cancel-btn").onclick = closeModal; //[span_139](start_span)[span_139](end_span)
  }

  overlay.classList.add("active"); //[span_140](start_span)[span_140](end_span)
}

function closeModal() {
  document.getElementById("custom-modal").classList.remove("active"); //[span_141](start_span)[span_141](end_span)
}

// Google 雲端硬碟圖片共用連結轉換
function convertGoogleDriveLink(url) {
  if (!url) return url; //[span_142](start_span)[span_142](end_span)
  let fileId = ""; //[span_143](start_span)[span_143](end_span)
  const matchD = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/); //[span_144](start_span)[span_144](end_span)
  const matchIdParam = url.match(/[?&]id=([a-zA-Z0-9_-]+)/); //[span_145](start_span)[span_145](end_span)

  if (matchD && matchD[1]) {
    fileId = matchD[1]; //[span_146](start_span)[span_146](end_span)
  } else if (matchIdParam && matchIdParam[1]) {
    fileId = matchIdParam[1]; //[span_147](start_span)[span_147](end_span)
  }

  if (fileId) {
    return `https://lh3.googleusercontent.com/d/${fileId}`; //[span_148](start_span)[span_148](end_span)
  }
  return url; //[span_149](start_span)[span_149](end_span)
}

// 深淺色模式切換
function initThemeSwitcher() {
  const themeToggleBtn = document.getElementById("theme-toggle"); //[span_150](start_span)[span_150](end_span)
  const savedTheme = localStorage.getItem("theme"); //[span_151](start_span)[span_151](end_span)
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches; //[span_152](start_span)[span_152](end_span)

  if (savedTheme) {
    document.documentElement.setAttribute("data-theme", savedTheme); //[span_153](start_span)[span_153](end_span)
  } else if (systemPrefersDark) {
    document.documentElement.setAttribute("data-theme", "dark"); //[span_154](start_span)[span_154](end_span)
  } else {
    document.documentElement.setAttribute("data-theme", "light"); //[span_155](start_span)[span_155](end_span)
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme"); //[span_156](start_span)[span_156](end_span)
      const newTheme = currentTheme === "dark" ? "light" : "dark"; //[span_157](start_span)[span_157](end_span)
      document.documentElement.setAttribute("data-theme", newTheme); //[span_158](start_span)[span_158](end_span)
      localStorage.setItem("theme", newTheme); //[span_159](start_span)[span_159](end_span)
    });
  }
}

// 側邊抽屜選單互動控制
function initSideDrawer() {
  const menuBtn = document.getElementById("menu-btn"); //[span_160](start_span)[span_160](end_span)
  const closeBtn = document.getElementById("drawer-close-btn"); //[span_161](start_span)[span_161](end_span)
  const overlay = document.getElementById("drawer-overlay"); //[span_162](start_span)[span_162](end_span)
  const drawer = document.getElementById("side-drawer"); //[span_163](start_span)[span_163](end_span)

  function openDrawer() {
    if (drawer) drawer.classList.add("active"); //[span_164](start_span)[span_164](end_span)
    if (overlay) overlay.classList.add("active"); //[span_165](start_span)[span_165](end_span)
    document.body.style.overflow = "hidden"; //[span_166](start_span)[span_166](end_span)
  }

  function closeDrawer() {
    if (drawer) drawer.classList.remove("active"); //[span_167](start_span)[span_167](end_span)
    if (overlay) overlay.classList.remove("active"); //[span_168](start_span)[span_168](end_span)
    document.body.style.overflow = ""; //[span_169](start_span)[span_169](end_span)
  }

  if (menuBtn) menuBtn.addEventListener("click", openDrawer); //[span_170](start_span)[span_170](end_span)
  if (closeBtn) closeBtn.addEventListener("click", closeDrawer); //[span_171](start_span)[span_171](end_span)
  if (overlay) overlay.addEventListener("click", closeDrawer); //[span_172](start_span)[span_172](end_span)
}

// 頂部進度條控制函式
function startLoadingBar() {
  const bar = document.getElementById("global-loading-bar"); //[span_173](start_span)[span_173](end_span)
  if (!bar) return; //[span_174](start_span)[span_174](end_span)

  bar.classList.add("loading", "loading-pulse"); //[span_175](start_span)[span_175](end_span)
  bar.style.width = "30%"; //[span_176](start_span)[span_176](end_span)

  setTimeout(() => { if (bar.classList.contains("loading")) bar.style.width = "65%"; }, 400); //[span_177](start_span)[span_177](end_span)
  setTimeout(() => { if (bar.classList.contains("loading")) bar.style.width = "85%"; }, 1200); //[span_178](start_span)[span_178](end_span)
}

function finishLoadingBar() {
  const bar = document.getElementById("global-loading-bar"); //[span_179](start_span)[span_179](end_span)
  if (!bar) return; //[span_180](start_span)[span_180](end_span)

  bar.style.width = "100%"; //[span_181](start_span)[span_181](end_span)
  setTimeout(() => {
    bar.style.opacity = "0"; //[span_182](start_span)[span_182](end_span)
    setTimeout(() => {
      bar.classList.remove("loading", "loading-pulse"); //[span_183](start_span)[span_183](end_span)
      bar.style.width = "0%"; //[span_184](start_span)[span_184](end_span)
    }, 300);
  }, 200);
}

function errorLoadingBar() {
  const bar = document.getElementById("global-loading-bar"); //[span_185](start_span)[span_185](end_span)
  if (!bar) return; //[span_186](start_span)[span_186](end_span)
  bar.style.backgroundColor = "#e74c3c"; //[span_187](start_span)[span_187](end_span)
  finishLoadingBar(); //[span_188](start_span)[span_188](end_span)
}

// 智慧分段彈窗相關邏輯
function openSmartSplitModal() {
  showModal({
    title: "智慧貼上與分段",
    desc: `請將記事本中的整篇新聞貼在下方。系統會自動以空白行（段落間隔）為您切開，並自動建立對應的多個文字積木：<br><br>
      <textarea id="smart-paste-text" class="form-control" rows="8" placeholder="在此貼上整篇新聞內容..." style="resize: vertical;"></textarea>
    `,
    showCancel: true,
    confirmText: "確認自動分段",
    onConfirm: executeSmartSplit
  }); //[span_189](start_span)[span_189](end_span)
}

function executeSmartSplit() {
  const textareaEl = document.getElementById("smart-paste-text"); //[span_190](start_span)[span_190](end_span)
  const rawText = textareaEl ? textareaEl.value : ""; //[span_191](start_span)[span_191](end_span)

  if (!rawText.trim()) {
    showModal({
      title: "提示",
      desc: "請先輸入或貼上文章內容！",
      showCancel: false,
      confirmText: "確定"
    }); //[span_192](start_span)[span_192](end_span)
    return;
  }

  const paragraphs = rawText
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0); //[span_193](start_span)[span_193](end_span)

  if (paragraphs.length === 0) {
    showModal({
      title: "提示",
      desc: "沒有偵測到有效段落。",
      showCancel: false,
      confirmText: "確定"
    }); //[span_194](start_span)[span_194](end_span)
    return;
  }

  paragraphs.forEach(text => {
    addBlock("text", { content: text }); //[span_195](start_span)[span_195](end_span)
  });

  closeModal(); //[span_196](start_span)[span_196](end_span)
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;"); //[span_197](start_span)[span_197](end_span)
}