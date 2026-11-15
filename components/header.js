// ==========================================
//   SNA 全站共用獨立導覽列與側邊選單生成模組 (js/header.js)
// ==========================================

function renderHeader() {
  const currentPath = window.location.pathname;
  const isSubPage = currentPath.includes("/admin/") ||
    currentPath.includes("/articles/") ||
    currentPath.includes("/html/") ||
    currentPath.includes("/editor/");
  const basePath = isSubPage ? "../" : "";

  // 判斷當前頁面以高亮對應的導覽項目
  const isHome = currentPath.endsWith("/") || (currentPath.endsWith("index.html") && !
    currentPath.includes("/html/") && !
    currentPath.includes("/admin/") && !
    currentPath.includes("/articles/"))  && !
    currentPath.includes("/editor/");
  const isAllArticles = currentPath.includes("all_articles.html");
  const isAdmin = currentPath.includes("/admin/");
  const isEditor = currentPath.includes("/editor/");
  const isAutonomy = currentPath.includes("autonomy_articles.html");
  const isRights = currentPath.includes("rights_articles.html");
  const isCampus = currentPath.includes("campus_articles.html");
  const isOthers = currentPath.includes("others_articles.html");

  const headerContainer = document.getElementById("site-header-container");
  if (!headerContainer) return;

  // 1. 頂部導覽列與分類列
  headerContainer.innerHTML = `
    <div class="top-bar">
      <button class="menu-btn" id="menu-btn" aria-label="開啟選單">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      <a href="${basePath}index.html" class="site-logo">松山新聞社</a>

      <div class="header-actions">
        <button class="theme-toggle-btn" id="theme-toggle" aria-label="切換深淺色模式">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        </button>
      </div>
    </div>

    <nav class="category-nav">
      <a href="${basePath}index.html" class="category-tab ${isHome ? 'active' : ''}">首頁</a>
      <a href="${basePath}html/autonomy_articles.html" class="category-tab ${isAutonomy ? 'active' : ''}">自治</a>
      <a href="${basePath}html/rights_articles.html" class="category-tab ${isRights ? 'active' : ''}">學權</a>
      <a href="${basePath}html/campus_articles.html" class="category-tab ${isCampus ? 'active' : ''}">校園</a>
      <a href="${basePath}html/others_articles.html" class="category-tab ${isOthers ? 'active' : ''}">其他</a>
    </nav>

    <div class="top-loading-bar-container">
      <div class="top-loading-bar" id="global-loading-bar"></div>
    </div>
  `;

  // 2. 側邊抽屜選單與背景遮罩
  if (!document.getElementById("side-drawer")) {
    const overlay = document.createElement("div");
    overlay.className = "drawer-overlay";
    overlay.id = "drawer-overlay";

    const drawer = document.createElement("aside");
    drawer.className = "side-drawer";
    drawer.id = "side-drawer";
    drawer.innerHTML = `
      <div class="drawer-header">
        <span class="drawer-title">導覽選單</span>
        <button class="drawer-close-btn" id="drawer-close-btn" aria-label="關閉選單">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <nav class="drawer-nav">
        <ul class="drawer-menu">
          <li class="drawer-item"><a href="${basePath}index.html" class="drawer-link ${isHome ? 'active' : ''}">首頁</a></li>
          <li class="drawer-item"><a href="${basePath}html/all_articles.html" class="drawer-link ${isAllArticles ? 'active' : ''}">所有新聞報導</a></li>
          <li class="drawer-item"><a href="#" class="drawer-link">常用表件與規章</a></li>
          <li class="drawer-divider"></li>
          <li class="drawer-section-label">新聞分類</li>
          <li class="drawer-item"><a href="${basePath}html/autonomy_articles.html" class="drawer-link ${isAutonomy ? 'active' : ''}">自治議題</a></li>
          <li class="drawer-item"><a href="${basePath}html/rights_articles.html" class="drawer-link ${isRights ? 'active' : ''}">學生權益</a></li>
          <li class="drawer-item"><a href="${basePath}html/campus_articles.html" class="drawer-link ${isCampus ? 'active' : ''}">校園生活</a></li>
          <li class="drawer-item"><a href="${basePath}html/others_articles.html" class="drawer-link ${isOthers ? 'active' : ''}">其他報導</a></li>
          <li class="drawer-divider"></li>
          <li class="drawer-section-label">關於我們</li>
          <li class="drawer-item"><a href="#" class="drawer-link">社團簡介與組織章程</a></li>
          <li class="drawer-item"><a href="#" class="drawer-link">勘誤與新聞倫理規範</a></li>
          <li class="drawer-divider"></li>
          <li class="drawer-section-label">開發人員</li>
          <!-- 區分兩個不同的 ID 供驗證系統綁定 -->
          <li class="drawer-item"><a href="${basePath}admin/index.html" id="admin-login-link" class="drawer-link ${isAdmin ? 'active' : ''}">新聞發布後台</a></li>
          <li class="drawer-item"><a href="${basePath}editor/index.html" id="editor-login-link" class="drawer-link ${isEditor ? 'active' : ''}">新聞編輯後台</a></li>
        </ul>
      </nav>

      <div class="drawer-footer">
        <p>松山新聞社 SNA © 2026</p>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
  }

  // 3. 註冊後台與編輯器按鈕的密碼驗證彈窗事件
  setupAdminAuthModal(basePath);
}

// 密碼驗證彈窗與安全性邏輯（支援多個後台入口）
function setupAdminAuthModal(basePath) {
  const adminLink = document.getElementById("admin-login-link");
  const editorLink = document.getElementById("editor-login-link");
  
  if (!adminLink && !editorLink) return;

  // 建立自訂密碼彈窗 DOM（如果尚未建立）
  if (!document.getElementById("auth-modal-overlay")) {
    const modalOverlay = document.createElement("div");
    modalOverlay.id = "auth-modal-overlay";
    modalOverlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background-color: rgba(0, 0, 0, 0.6); z-index: 999;
      display: flex; align-items: center; justify-content: center;
      opacity: 0; visibility: hidden; transition: opacity 0.2s ease, visibility 0.2s ease;
    `;

    modalOverlay.innerHTML = `
      <div id="auth-modal-box" style="
        background-color: var(--bg-card); border: 1px solid var(--border-color);
        border-radius: 12px; padding: 24px; width: 320px; max-width: 90vw;
        box-shadow: 0 8px 24px rgba(0,0,0,0.2); transform: scale(0.95); transition: transform 0.2s ease;
      ">
        <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 8px; color: var(--text-primary);">後台權限驗證</h3>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 16px;">請輸入開發人員密碼以進入後台。</p>
        <input type="password" id="admin-password-input" placeholder="請輸入密碼..." style="
          width: 100%; padding: 10px 12px; border: 1px solid var(--border-color);
          border-radius: 8px; background-color: var(--bg-secondary); color: var(--text-primary);
          font-size: 0.95rem; outline: none; margin-bottom: 8px; box-sizing: border-box;
        ">
        <div id="auth-error-msg" style="font-size: 0.75rem; color: #e74c3c; margin-bottom: 16px; min-height: 16px;"></div>
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button id="auth-cancel-btn" style="
            padding: 8px 16px; background: none; border: 1px solid var(--border-color);
            border-radius: 6px; color: var(--text-primary); cursor: pointer; font-size: 0.9rem;
          ">取消</button>
          <button id="auth-submit-btn" style="
            padding: 8px 16px; background-color: var(--accent-color); border: none;
            border-radius: 6px; color: #ffffff; cursor: pointer; font-size: 0.9rem; font-weight: 600;
          ">確認進入</button>
        </div>
      </div>
    `;
    document.body.appendChild(modalOverlay);
  }

  const overlay = document.getElementById("auth-modal-overlay");
  const box = document.getElementById("auth-modal-box");
  const input = document.getElementById("admin-password-input");
  const errorMsg = document.getElementById("auth-error-msg");
  const cancelBtn = document.getElementById("auth-cancel-btn");
  const submitBtn = document.getElementById("auth-submit-btn");

  let targetRedirectUrl = `${basePath}admin/index.html`;

  function openModal(e, destinationUrl) {
    e.preventDefault();
    targetRedirectUrl = destinationUrl;

    // 檢查 sessionStorage 是否已經驗證過
    if (sessionStorage.getItem("sna_admin_authenticated") === "true") {
      window.location.href = targetRedirectUrl;
      return;
    }
    input.value = "";
    errorMsg.textContent = "";
    overlay.style.opacity = "1";
    overlay.style.visibility = "visible";
    box.style.transform = "scale(1)";
    setTimeout(() => input.focus(), 100);
  }

  function closeModal() {
    overlay.style.opacity = "0";
    overlay.style.visibility = "hidden";
    box.style.transform = "scale(0.95)";
  }

  const TARGET_HASH = "f9dac9859d4eb9f8eb5afd9313f0467d6abb38ba641969b5e14d0ae867b762ce"; // 對應 "admin"

  async function verifyPassword() {
    const pwd = input.value;
    if (!pwd) {
      errorMsg.textContent = "請輸入密碼";
      return;
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(pwd);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (hashHex === TARGET_HASH) {
      sessionStorage.setItem("sna_admin_authenticated", "true");
      closeModal();
      window.location.href = targetRedirectUrl;
    } else {
      errorMsg.textContent = "密碼錯誤，請重新輸入";
      input.value = "";
      input.focus();
    }
  }

  // 綁定兩者點擊事件
  if (adminLink) {
    adminLink.onclick = (e) => openModal(e, `${basePath}admin/index.html`);
  }
  if (editorLink) {
    editorLink.onclick = (e) => openModal(e, `${basePath}editor/index.html`);
  }

  cancelBtn.onclick = closeModal;
  overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

  input.onkeydown = (e) => {
    if (e.key === "Enter") verifyPassword();
  };
  submitBtn.onclick = verifyPassword;
}

// 3. 側邊抽屜選單互動控制（已修正捲軸消失導致畫面晃動的問題）
function initSideDrawer() {
  const menuBtn = document.getElementById("menu-btn");
  const closeBtn = document.getElementById("drawer-close-btn");
  const overlay = document.getElementById("drawer-overlay");
  const drawer = document.getElementById("side-drawer");

  if (!menuBtn || !drawer) return;

  function openDrawer() {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    drawer.classList.add("active");
    if (overlay) overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    drawer.classList.remove("active");
    if (overlay) overlay.classList.remove("active");
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
  }

  menuBtn.onclick = openDrawer;
  if (closeBtn) closeBtn.onclick = closeDrawer;
  if (overlay) overlay.onclick = closeDrawer;
}

// 4. 深淺色模式切換
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