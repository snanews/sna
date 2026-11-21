// ==========================================
//   SNA 全站共用獨立導覽列與側邊選單生成模組 (js/header.js)
// ==========================================

const AUTH_STORAGE_KEY = "sna_admin_auth_expires";
const AUTH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 驗證有效期限：7 天
const TARGET_HASH = "f9dac9859d4eb9f8eb5afd9313f0467d6abb38ba641969b5e14d0ae867b762ce"; // 對應 "admin"

let __snaDeferredInstallPrompt = null;

function isAdminAuthenticated() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return false;

  const expiresAt = Number(raw);
  if (!expiresAt || Date.now() > expiresAt) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return false;
  }
  return true;
}

function setAdminAuthenticated() {
  localStorage.setItem(AUTH_STORAGE_KEY, String(Date.now() + AUTH_TTL_MS));
}

function clearAdminAuthenticated() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

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
    currentPath.includes("/articles/") && !
    currentPath.includes("/editor/"));
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
    <div class="top-bar" style="display: flex; align-items: center; justify-content: space-between;">
      <div style="display: flex; align-items: center; gap: 6px;">
        <button class="menu-btn" id="menu-btn" aria-label="開啟選單">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <span id="left-install-spacer" aria-hidden="true" style="display: inline-block; width: 0px; height: 36px; flex: 0 0 auto; pointer-events: none;"></span>
      </div>

      <a href="${basePath}index.html" class="site-logo" style="flex: 1; text-align: center; white-space: nowrap; display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
      <img
        src="${basePath}images/sna-logo.png"
        alt="SNA"
        width="47"
        height="17"
        class="site-logo-img"
        style="width: 47px; height: 17px; min-width: 47px; max-width: 47px; flex: 0 0 47px; object-fit: contain; display: block;"
      >
        <span>松山新聞社</span>
      </a>

      <div class="header-actions" id="header-right-actions" style="display: flex; align-items: center; gap: 6px;">
        <span id="install-app-btn-slot" style="display: inline-flex; align-items: center; justify-content: center; width: 0px; height: 36px; overflow: hidden;"></span>
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

  // 4. 初始化下載應用程式按鈕（若已安裝則自動移除）
  initInstallAppButton();

  // 自動在網頁 <head> 注入 PWA Manifest 與行動裝置主題色
  if (!document.getElementById("pwa-manifest-link")) {
    const manifestLink = document.createElement("link");
    manifestLink.id = "pwa-manifest-link";
    manifestLink.rel = "manifest";
    manifestLink.href = `${basePath}manifest.json`;
    document.head.appendChild(manifestLink);

    const themeColorMeta = document.createElement("meta");
    themeColorMeta.name = "theme-color";
    themeColorMeta.content = "#1b5e20";
    document.head.appendChild(themeColorMeta);
  }

  applyHeaderLogoStyle();
  centerHeaderBrandGroup();
  applyFavicon(basePath);
}

function isAppAlreadyInstalled() {
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const isIosStandalone = window.navigator.standalone === true;
  return isStandalone || isIosStandalone;
}

function removeInstallButton() {
  const btn = document.getElementById("install-app-btn");
  if (btn) {
    btn.remove();
  }
  const slot = document.getElementById("install-app-btn-slot");
  if (slot) {
    slot.style.width = "0px";
    slot.style.overflow = "hidden";
  }
}

function createInstallButton(slot) {
  if (!slot || document.getElementById("install-app-btn")) return;

  slot.style.width = "36px";
  slot.style.overflow = "visible";

  const btn = document.createElement("button");
  btn.id = "install-app-btn";
  btn.type = "button";
  btn.className = "theme-toggle-btn";
  btn.setAttribute("aria-label", "下載應用程式");
  btn.title = "下載應用程式";

  btn.innerHTML = `
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
  `;

  btn.addEventListener("click", async () => {
    if (__snaDeferredInstallPrompt) {
      __snaDeferredInstallPrompt.prompt();
      const choiceResult = await __snaDeferredInstallPrompt.userChoice;
      __snaDeferredInstallPrompt = null;
      if (choiceResult.outcome === "accepted") {
        removeInstallButton();
      }
      return;
    }

    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    if (isIos && !isAppAlreadyInstalled()) {
      alert("請點選瀏覽器下方的「分享」按鈕，再選擇「加入主畫面」即可安裝應用程式。");
    }
  });

  slot.appendChild(btn);
}

function initInstallAppButton() {
  if (isAppAlreadyInstalled()) {
    removeInstallButton();
    return;
  }

  const slot = document.getElementById("install-app-btn-slot");
  if (!slot) return;

  const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  if (__snaDeferredInstallPrompt || isIos) {
    createInstallButton(slot);
  } else {
    slot.style.width = "0px";
  }
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  __snaDeferredInstallPrompt = e;
  if (!isAppAlreadyInstalled()) {
    const slot = document.getElementById("install-app-btn-slot");
    if (slot) createInstallButton(slot);
  }
});

window.addEventListener("appinstalled", () => {
  __snaDeferredInstallPrompt = null;
  removeInstallButton();
});

function ensureAuthModalDom() {
  if (document.getElementById("auth-modal-overlay")) return;

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
        <button id="auth-cancel-btn" type="button" style="
          padding: 8px 16px; background: none; border: 1px solid var(--border-color);
          border-radius: 6px; color: var(--text-primary); cursor: pointer; font-size: 0.9rem;
        ">取消</button>
        <button id="auth-submit-btn" type="button" style="
          padding: 8px 16px; background-color: var(--accent-color); border: none;
          border-radius: 6px; color: #ffffff; cursor: pointer; font-size: 0.9rem; font-weight: 600;
        ">確認進入</button>
      </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);
}

// 獨立權限守衛函式：支援連結跳轉與頁面進入驗證
function requireAdminAuth(options = {}) {
  const {
    destinationUrl = null,
    onSuccess = null,
    allowCancelRedirectHome = false,
    homePath = "../index.html"
  } = options;

  if (isAdminAuthenticated()) {
    if (typeof onSuccess === "function") onSuccess();
    if (destinationUrl) window.location.href = destinationUrl;
    return;
  }

  ensureAuthModalDom();

  const overlay = document.getElementById("auth-modal-overlay");
  const box = document.getElementById("auth-modal-box");
  const input = document.getElementById("admin-password-input");
  const errorMsg = document.getElementById("auth-error-msg");
  const cancelBtn = document.getElementById("auth-cancel-btn");
  const submitBtn = document.getElementById("auth-submit-btn");

  input.value = "";
  errorMsg.textContent = "";
  overlay.style.opacity = "1";
  overlay.style.visibility = "visible";
  box.style.transform = "scale(1)";
  setTimeout(() => input.focus(), 100);

  function closeModal() {
    overlay.style.opacity = "0";
    overlay.style.visibility = "hidden";
    box.style.transform = "scale(0.95)";
  }

  function handleCancel() {
    closeModal();
    if (allowCancelRedirectHome) {
      window.location.replace(homePath);
    }
  }

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
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    if (hashHex === TARGET_HASH) {
      setAdminAuthenticated();
      closeModal();
      if (typeof onSuccess === "function") onSuccess();
      if (destinationUrl) window.location.href = destinationUrl;
    } else {
      errorMsg.textContent = "密碼錯誤，請重新輸入";
      input.value = "";
      input.focus();
    }
  }

  cancelBtn.onclick = handleCancel;
  overlay.onclick = (e) => {
    if (e.target === overlay) handleCancel();
  };
  input.onkeydown = (e) => {
    if (e.key === "Enter") verifyPassword();
  };
  submitBtn.onclick = verifyPassword;
}

// 密碼驗證彈窗與安全性邏輯（支援多個後台入口）
function setupAdminAuthModal(basePath) {
  const adminLink = document.getElementById("admin-login-link");
  const editorLink = document.getElementById("editor-login-link");

  if (!adminLink && !editorLink) return;

  ensureAuthModalDom();

  const bindLink = (el, url) => {
    if (!el) return;
    el.onclick = (e) => {
      e.preventDefault();
      requireAdminAuth({ destinationUrl: url });
    };
  };

  bindLink(adminLink, `${basePath}admin/index.html`);
  bindLink(editorLink, `${basePath}editor/index.html`);
}

// 3. 側邊抽屜選單互動控制（已修正捲軸消失導致畫面晃動的問題）
function initSideDrawer() {
  const menuBtn = document.getElementById("menu-btn");
  const closeBtn = document.getElementById("drawer-close-btn");
  const overlay = document.getElementById("drawer-overlay");
  const drawer = document.getElementById("side-drawer");

  if (!menuBtn || !drawer) return;

  let isDrawerOpen = false;
  let prevBodyPaddingRight = "";
  let prevBodyOverflow = "";
  let prevHtmlOverflow = "";

  function openDrawer() {
    if (isDrawerOpen) return;
    isDrawerOpen = true;

    const docEl = document.documentElement;
    const hasVerticalScrollbar = docEl.scrollHeight > docEl.clientHeight;
    const scrollbarWidth = hasVerticalScrollbar
      ? Math.max(0, window.innerWidth - docEl.clientWidth)
      : 0;

    prevBodyPaddingRight = document.body.style.paddingRight;
    prevBodyOverflow = document.body.style.overflow;
    prevHtmlOverflow = docEl.style.overflow;

    if (scrollbarWidth > 0) {
      const currentPadding = parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;
      document.body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
    }

    docEl.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    drawer.classList.add("active");
    if (overlay) overlay.classList.add("active");
  }

  function closeDrawer() {
    if (!isDrawerOpen) return;
    isDrawerOpen = false;

    drawer.classList.remove("active");
    if (overlay) overlay.classList.remove("active");
    document.documentElement.style.overflow = prevHtmlOverflow;
    document.body.style.overflow = prevBodyOverflow;
    document.body.style.paddingRight = prevBodyPaddingRight;
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

  applyHeaderLogoStyle();
  if (typeof centerHeaderBrandGroup === "function") {
    centerHeaderBrandGroup();
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      const newTheme = currentTheme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("theme", newTheme);
      applyHeaderLogoStyle();
      if (typeof centerHeaderBrandGroup === "function") {
        centerHeaderBrandGroup();
      }
    });
  }
}

// 自動註冊 Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // 根據是否為子頁面動態決定 sw.js 的相對路徑
    const currentPath = window.location.pathname;
    const isSubPage = currentPath.includes("/admin/") ||
      currentPath.includes("/articles/") ||
      currentPath.includes("/html/") ||
      currentPath.includes("/editor/");
    const swPath = isSubPage ? "../sw.js" : "./sw.js";

    navigator.serviceWorker.register(swPath)
      .then((reg) => console.log("Service Worker 註冊成功:", reg.scope))
      .catch((err) => console.log("Service Worker 註冊失敗:", err));
  });
}

function syncLeftInstallSpacer() {
  const spacer = document.getElementById("left-install-spacer");
  const installBtn = document.getElementById("install-app-btn");
  if (!spacer) return;

  const nextWidth = installBtn
    ? `${Math.round(installBtn.getBoundingClientRect().width || 36)}px`
    : "0px";

  if (spacer.style.width !== nextWidth) {
    spacer.style.width = nextWidth;
    spacer.style.flexBasis = nextWidth;
  }
}

function applyHeaderLogoStyle() {
  const logoImg = document.querySelector(".site-logo-img");
  if (!logoImg) return;

  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const fixedHeight = 17;
  const fixedWidth = 47;

  logoImg.style.width = `${fixedWidth}px`;
  logoImg.style.height = `${fixedHeight}px`;
  logoImg.style.minWidth = `${fixedWidth}px`;
  logoImg.style.maxWidth = `${fixedWidth}px`;
  logoImg.style.flex = `0 0 ${fixedWidth}px`;
  logoImg.style.objectFit = "contain";
  logoImg.style.display = "inline-block";
  logoImg.style.alignSelf = "flex-end";
  logoImg.style.transform = "translateY(-7px)";
  logoImg.style.backgroundColor = "transparent";
  logoImg.style.padding = "0";
  logoImg.style.borderRadius = "0";
  logoImg.style.filter = isDark
    ? "brightness(0) invert(1)"
    : "brightness(0)";
}

function centerHeaderBrandGroup() {
  const logoLink = document.querySelector(".site-logo");
  const topBar = document.querySelector(".top-bar");
  if (!logoLink || !topBar) return;

  topBar.style.display = "flex";
  topBar.style.alignItems = "center";
  topBar.style.justifyContent = "space-between";

  logoLink.style.flex = "1";
  logoLink.style.display = "inline-flex";
  logoLink.style.alignItems = "flex-end";
  logoLink.style.justifyContent = "center";
  logoLink.style.gap = "8px";
  logoLink.style.whiteSpace = "nowrap";

  syncLeftInstallSpacer();
}

function applyFavicon(basePath = "") {
  const iconHref = `${basePath}images/SNA-Label.png`;

  let iconLink = document.querySelector('link[rel="icon"]');
  if (!iconLink) {
    iconLink = document.createElement("link");
    iconLink.rel = "icon";
    document.head.appendChild(iconLink);
  }
  iconLink.type = "image/SNA-Label.png";
  iconLink.href = iconHref;

  let appleTouchLink = document.querySelector('link[rel="apple-touch-icon"]');
  if (!appleTouchLink) {
    appleTouchLink = document.createElement("link");
    appleTouchLink.rel = "apple-touch-icon";
    document.head.appendChild(appleTouchLink);
  }
  appleTouchLink.href = iconHref;
}
