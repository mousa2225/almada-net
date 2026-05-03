// ══════════════════════════════════════════════════════════════
// المدى نت — Shared Application Module
// ══════════════════════════════════════════════════════════════
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, doc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp, query, orderBy, getDoc, setDoc, getDocs
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDdYIiZcithhvDRLwHwahV6-W_puXHN4rs",
  authDomain: "almadadashboard.firebaseapp.com",
  projectId: "almadadashboard",
  storageBucket: "almadadashboard.firebasestorage.app",
  messagingSenderId: "172655018085",
  appId: "1:172655018085:web:6b956408061985c3ccc68c"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export {
  collection, addDoc, doc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp, query, orderBy, getDoc, setDoc, getDocs
};

// ══════════════════════════════════════════════════════════════
// Settings & Currency Management
// ══════════════════════════════════════════════════════════════

// Default settings
const DEFAULT_SETTINGS = {
  netName: "شبكة المدى نت",
  ownerName: "",
  baseCurrency: "SAR",
  displayCurrency: "SAR",
  exchangeRates: { SAR: 1, USD: 0.27, YER: 67.5, AED: 0.98 }
};

let _settings = { ...DEFAULT_SETTINGS };
let _settingsListeners = [];

// Load settings from Firestore (real-time)
export function watchSettings(callback) {
  const unsub = onSnapshot(doc(db, "settings", "main"), (snap) => {
    if (snap.exists()) {
      _settings = { ..._settings, ...snap.data() };
    }
    _settingsListeners.forEach(cb => cb(_settings));
    if (callback) callback(_settings);
  });
  return unsub;
}

export function getSettings() { return _settings; }

export async function saveSettings(updates) {
  await setDoc(doc(db, "settings", "main"), { ..._settings, ...updates, updatedAt: serverTimestamp() }, { merge: true });
}

// ══════════════════════════════════════════════════════════════
// Currency formatting & conversion
// ══════════════════════════════════════════════════════════════

const CURRENCY_INFO = {
  SAR: { symbol: "ر.س", name: "ريال سعودي", flag: "🇸🇦" },
  USD: { symbol: "$",   name: "دولار أمريكي", flag: "🇺🇸" },
  YER: { symbol: "ر.ي", name: "ريال يمني", flag: "🇾🇪" },
  AED: { symbol: "د.إ", name: "درهم إماراتي", flag: "🇦🇪" }
};

export function getCurrencyInfo(code) { return CURRENCY_INFO[code] || CURRENCY_INFO.SAR; }
export function getAllCurrencies() { return CURRENCY_INFO; }

// Convert amount from base currency (stored in DB) to display currency
export function convertFromBase(amountInBase) {
  const rate = _settings.exchangeRates?.[_settings.displayCurrency] || 1;
  return amountInBase * rate;
}

// Convert amount from display currency to base currency (for storage)
export function convertToBase(amountInDisplay) {
  const rate = _settings.exchangeRates?.[_settings.displayCurrency] || 1;
  return amountInDisplay / rate;
}

// Format with display currency symbol
export function fmt(amountInBase, opts = {}) {
  const display = convertFromBase(amountInBase || 0);
  const info = getCurrencyInfo(_settings.displayCurrency);
  const num = display.toLocaleString("en-US", {
    minimumFractionDigits: opts.decimals ?? 0,
    maximumFractionDigits: opts.decimals ?? 0
  });
  return `${num} ${info.symbol}`;
}

export function fmtNoSymbol(amountInBase, opts = {}) {
  const display = convertFromBase(amountInBase || 0);
  return display.toLocaleString("en-US", {
    minimumFractionDigits: opts.decimals ?? 0,
    maximumFractionDigits: opts.decimals ?? 0
  });
}

export function getCurrencySymbol() {
  return getCurrencyInfo(_settings.displayCurrency).symbol;
}

// ══════════════════════════════════════════════════════════════
// UI Helpers
// ══════════════════════════════════════════════════════════════

export function esc(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function toast(msg, type = "info") {
  let wrap = document.getElementById("__toastWrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "__toastWrap";
    wrap.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none";
    document.body.appendChild(wrap);
  }
  const t = document.createElement("div");
  const colors = {
    success: { bg: "rgba(16,185,129,.12)", border: "rgba(16,185,129,.4)", text: "#10b981", icon: "✓" },
    error:   { bg: "rgba(239,68,68,.12)",  border: "rgba(239,68,68,.4)",  text: "#ef4444", icon: "✕" },
    info:    { bg: "rgba(59,130,246,.12)", border: "rgba(59,130,246,.4)", text: "#3b82f6", icon: "ℹ" },
    warn:    { bg: "rgba(245,158,11,.12)", border: "rgba(245,158,11,.4)", text: "#f59e0b", icon: "⚠" }
  };
  const c = colors[type] || colors.info;
  t.style.cssText = `background:${c.bg};border:1px solid ${c.border};border-radius:12px;padding:12px 18px;font-size:13px;color:var(--text);font-family:inherit;backdrop-filter:blur(20px);box-shadow:0 10px 30px rgba(0,0,0,.3);display:flex;align-items:center;gap:10px;pointer-events:auto;animation:toastSlide .3s cubic-bezier(.34,1.56,.64,1)`;
  t.innerHTML = `<span style="color:${c.text};font-size:16px;font-weight:700">${c.icon}</span><span>${esc(msg)}</span>`;
  wrap.appendChild(t);
  setTimeout(() => {
    t.style.transition = "all .3s ease";
    t.style.opacity = "0";
    t.style.transform = "translateY(10px)";
    setTimeout(() => t.remove(), 350);
  }, 3000);
}

// Inject toast keyframes once
if (!document.getElementById("__toastStyles")) {
  const s = document.createElement("style");
  s.id = "__toastStyles";
  s.textContent = `@keyframes toastSlide{from{opacity:0;transform:translateY(20px) scale(.9)}to{opacity:1;transform:translateY(0) scale(1)}}`;
  document.head.appendChild(s);
}

export function confirmDialog(message, danger = false) {
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(8px);z-index:99999;display:flex;align-items:center;justify-content:center;animation:fadeIn .2s ease";
    const modal = document.createElement("div");
    modal.style.cssText = "background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:28px;width:380px;max-width:92vw;text-align:center;animation:popIn .25s cubic-bezier(.34,1.56,.64,1)";
    modal.innerHTML = `
      <div style="font-size:42px;margin-bottom:12px">${danger ? '⚠️' : '❓'}</div>
      <div style="font-size:15px;font-weight:600;margin-bottom:6px;color:var(--text)">${danger ? 'تأكيد الحذف' : 'تأكيد'}</div>
      <div style="font-size:13px;color:var(--text2);line-height:1.6;margin-bottom:20px">${esc(message)}</div>
      <div style="display:flex;gap:10px;justify-content:center">
        <button class="cancel-btn" style="background:none;border:1px solid var(--border);color:var(--text2);border-radius:9px;padding:9px 22px;font-family:inherit;font-size:13px;cursor:pointer;transition:all .2s">إلغاء</button>
        <button class="ok-btn" style="background:${danger?'#ef4444':'var(--accent)'};border:none;color:#fff;border-radius:9px;padding:9px 22px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;transition:all .2s">${danger?'حذف':'موافق'}</button>
      </div>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    if (!document.getElementById("__confirmStyles")) {
      const s = document.createElement("style"); s.id = "__confirmStyles";
      s.textContent = `@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes popIn{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}`;
      document.head.appendChild(s);
    }
    const close = (result) => {
      overlay.style.animation = "fadeIn .2s ease reverse";
      modal.style.animation = "popIn .2s ease reverse";
      setTimeout(() => { overlay.remove(); resolve(result); }, 200);
    };
    modal.querySelector(".cancel-btn").onclick = () => close(false);
    modal.querySelector(".ok-btn").onclick = () => close(true);
    overlay.addEventListener("click", e => { if (e.target === overlay) close(false); });
  });
}

// ══════════════════════════════════════════════════════════════
// Sidebar component (injected by each page)
// ══════════════════════════════════════════════════════════════

export function renderSidebar(activePage) {
  const items = [
    { section: "الرئيسية" },
    { id: "dashboard",  href: "dashboard.html",   icon: "◉", label: "لوحة التحكم" },
    { id: "topology",   href: "topology.html",    icon: "◈", label: "توبولوجيا الشبكة" },
    { section: "الأجهزة" },
    { id: "devices",    href: "devices.html",     icon: "▤", label: "إدارة الأجهزة" },
    { id: "subnets",    href: "subnets.html",     icon: "▦", label: "الشبكات الفرعية" },
    { section: "المالية" },
    { id: "finances",   href: "finances.html",    icon: "◆", label: "المعاملات المالية" },
    { id: "purchases",  href: "purchases.html",   icon: "▥", label: "المشتريات" },
    { id: "reports",    href: "reports.html",     icon: "▣", label: "التقارير" },
    { section: "النظام" },
    { id: "settings",   href: "settings.html",    icon: "✦", label: "الإعدادات" }
  ];

  const html = items.map(it => {
    if (it.section) return `<div class="nav-sec">${it.section}</div>`;
    const active = it.id === activePage ? " active" : "";
    return `<a href="${it.href}" class="nav-item${active}"><span class="nav-icon">${it.icon}</span>${it.label}</a>`;
  }).join("");

  const settings = getSettings();
  return `
    <div class="sidebar-logo">
      <div class="logo-mark">
        <svg viewBox="0 0 40 40" width="36" height="36"><circle cx="20" cy="20" r="6" fill="currentColor" opacity=".9"/><circle cx="20" cy="20" r="14" fill="none" stroke="currentColor" stroke-width="2" opacity=".5"/><circle cx="20" cy="20" r="19" fill="none" stroke="currentColor" stroke-width="1" opacity=".25"/></svg>
      </div>
      <div class="logo-text">
        <div class="logo-name" id="sbNetName">${esc(settings.netName)}</div>
        <div class="logo-tag">إدارة الشبكة</div>
      </div>
    </div>
    <nav class="sidebar-nav">${html}</nav>
    <div class="sidebar-footer">
      <div class="conn-pill">
        <span class="pulse-dot"></span>
        <div>
          <div class="conn-name">متصل</div>
          <div class="conn-sub">Firebase Cloud</div>
        </div>
      </div>
    </div>
  `;
}

// ══════════════════════════════════════════════════════════════
// Modal helper
// ══════════════════════════════════════════════════════════════

export function openModal(id) {
  const m = document.getElementById(id);
  if (m) {
    m.classList.add("open");
    document.body.style.overflow = "hidden";
  }
}

export function closeModal(id) {
  const m = document.getElementById(id);
  if (m) {
    m.classList.remove("open");
    document.body.style.overflow = "";
  }
}

// Close on overlay click
document.addEventListener("click", e => {
  if (e.target.classList && e.target.classList.contains("modal-overlay")) {
    e.target.classList.remove("open");
    document.body.style.overflow = "";
  }
});

// ESC key closes modals
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    document.querySelectorAll(".modal-overlay.open").forEach(m => {
      m.classList.remove("open");
      document.body.style.overflow = "";
    });
  }
});
