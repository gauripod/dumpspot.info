// Small shared helpers. No DOM framework, just functions.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const DAY = 86400000;

export function genId() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  const dt = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
  const tm = `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  const r = Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, "0");
  return `DS-${dt}-${tm}-${r}`;
}

const viewerTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
const isIST = viewerTz === "Asia/Calcutta" || viewerTz === "Asia/Kolkata";

export function fmtTs(iso) {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: true });
  if (isIST) return `${date} · ${time} IST`;
  const ist = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
  return `${date} · ${time} [${ist} IST]`;
}

export function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function fmtDate(iso, opts = { day: "2-digit", month: "short" }) {
  return new Date(iso).toLocaleDateString(undefined, opts);
}

export function ago(iso) {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return fmtDate(iso, { day: "2-digit", month: "short", year: "2-digit" });
}

export function normLocation(str) {
  if (!str) return "";
  return str.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function looksLikeAbbr(str) {
  const s = str.trim();
  return s.length <= 4 && s === s.toUpperCase() && /^[A-Z]+$/.test(s);
}

export const pad = (n, w = 3) => String(n).padStart(w, "0");
export const fmtN = (n) => Number(n || 0).toLocaleString("en-IN");

// Deterministic PRNG from a string (report id → same tree every time).
export function seeded(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 1280;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" })),
        "image/webp",
        0.82,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

// Set a number in an element. (Numbers no longer animate: motion is kept for explaining changes.)
export function countTo(el, to, { fmt = fmtN } = {}) {
  if (el) el.textContent = fmt(to);
}

export function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

export const store = {
  get(k, d = null) {
    try {
      const v = localStorage.getItem(k);
      return v == null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
};
