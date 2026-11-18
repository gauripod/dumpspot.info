// Toasts, hash router, tab underline, keyboard shortcuts.
import { $, $$, esc } from "../lib/util.js";
import { BRAND } from "./brand.js";

export function toast(msg, kind = "info", ms) {
  const host = $("#toasts");
  const el = document.createElement("div");
  el.className = `toast toast-${kind}`;
  el.innerHTML = `<span class="toast-dot">${kind === "err" ? "" : BRAND}</span><span>${esc(msg)}</span>`;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add("in"));
  setTimeout(() => {
    el.classList.remove("in");
    setTimeout(() => el.remove(), 400);
  }, ms || (kind === "err" ? 4600 : 3200));
}

// Routes: #/map  #/ledger  #/garden  #/ranks  #/report  #/r/<id>
const views = {};
let current = null;
export const registerView = (name, hooks) => (views[name] = hooks);

export function go(path) {
  if (location.hash !== "#/" + path) location.hash = "/" + path;
  else route();
}

export function route() {
  const h = location.hash.replace(/^#\/?/, "") || "map";
  const [name, arg] = h.split("/");
  if (name === "r" && arg) {
    if (!current) show("map");
    views.detail?.enter(decodeURIComponent(arg));
    return;
  }
  views.detail?.leave?.();
  show(views[name] ? name : "map");
}

function show(name) {
  if (current === name) return;
  const prev = current;
  current = name;
  const swap = () => {
    $$(".view").forEach((v) => v.classList.toggle("on", v.dataset.view === name));
    $$(".tab").forEach((t) => t.classList.toggle("on", t.dataset.go === name || t.dataset.also === name));
    document.body.dataset.view = name;
    moveInk();
    window.__lenis ? window.__lenis.scrollTo(0, { immediate: true }) : window.scrollTo(0, 0);
  };
  // Pages cross-fade with the browser's View Transitions where supported; elsewhere they just swap.
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prev && document.startViewTransition && !reduced && !document.hidden) {
    const vt = document.startViewTransition(swap);
    vt.ready.catch(() => {});
    vt.finished.catch(() => {});
  }
  else swap();
  if (prev) views[prev]?.leave?.();
  views[name]?.enter?.();
  reveal(document.querySelector(`.view[data-view="${name}"]`));
}

// Sections rise into place once, as they scroll into view. Skipped on the full-bleed map and garden
// (they have their own choreography) and when motion is reduced.
let revealIO = null;
export function reveal(root) {
  if (!root || ["map", "garden"].includes(root.dataset.view) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  revealIO?.disconnect();
  revealIO = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        revealIO.unobserve(e.target);
      }),
    { rootMargin: "0px 0px -8% 0px" },
  );
  const els = root.querySelectorAll(".page > *, .chapters > li, .roles > *, .spec-grid > *, .sys-sec > .sys-row, .about-end");
  const seen = new Map();
  els.forEach((el) => {
    if (el.classList.contains("in") || !el.getClientRects().length) return;
    const p = el.parentElement, i = seen.get(p) || 0;
    seen.set(p, i + 1);
    el.classList.add("rv");
    el.style.setProperty("--i", Math.min(i, 6));
    revealIO.observe(el);
  });
}
export const currentView = () => current;

export function moveInk() {
  const on = $(".tab.on");
  const ink = $(".tab-ink");
  if (!ink) return;
  if (!on) {
    ink.style.opacity = 0;
    return;
  }
  const p = on.parentElement.getBoundingClientRect();
  const r = on.getBoundingClientRect();
  ink.style.opacity = 1;
  ink.style.transform = `translateX(${r.left - p.left}px)`;
  ink.style.width = r.width + "px";
}

export function initShell({ onCity }) {
  window.addEventListener("hashchange", route);
  window.addEventListener("resize", moveInk);
  $$("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));
  const more = $("#more-btn"), menu = $("#more-menu");
  const setMenu = (open) => {
    menu.classList.toggle("open", open);
    more.setAttribute("aria-expanded", open);
  };
  more.addEventListener("click", (e) => (e.stopPropagation(), setMenu(!menu.classList.contains("open"))));
  document.addEventListener("click", (e) => !e.target.closest(".menu") && setMenu(false));
  menu.addEventListener("click", (e) => e.target.closest("a") && setMenu(false));
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t.matches("input, textarea, select, [contenteditable]")) {
      if (e.key === "Escape") t.blur();
      return;
    }
    const k = e.key.toLowerCase();
    const map = { e: "map", m: "map", g: "garden", r: "report" };
    if (map[k]) go(map[k]);
    else if (k === "l") go(current === "ledger" ? "map" : "ledger");
    else if (k === "c") onCity();
    else if (k === "/") {
      e.preventDefault();
      go("ledger");
      setTimeout(() => $("#ledger-q")?.focus(), 60);
    } else if (k === "escape") {
      if (location.hash.startsWith("#/r/")) history.back();
    }
  });
}
