const LOCK_INSPECT =
  typeof LOCK_INSPECT_ENV !== "undefined" ? LOCK_INSPECT_ENV : false;

if (LOCK_INSPECT) {
  document.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("keydown", (e) => {
    if (
      (e.ctrlKey || e.metaKey) &&
      ["u", "s", "a"].includes(e.key.toLowerCase())
    )
      e.preventDefault();
    if (e.key === "F12") e.preventDefault();
  });
}

let db = null;
function getDb() {
  if (!db)
    db = window._db.createClient(
      window.DB_URL || DB_URL,
      window.DB_KEY || DB_KEY,
    );
  return db;
}

async function registerBoundaryCorrection() {
  const isLocal =
    location.hostname === "localhost" || location.hostname === "127.0.0.1";
  const hasSwSupport = "serviceWorker" in navigator;
  const api = window.IndiaBoundaryCorrector;

  if (!hasSwSupport || !api?.registerCorrectionServiceWorker) return null;

  try {
    const sw = await api.registerCorrectionServiceWorker("./sw.js", {
      controllerTimeout: 5000,
      forceReinstall: isLocal,
      pmtilesUrl:
        "https://cdn.jsdelivr.net/npm/@india-boundary-corrector/service-worker@0.2.1/dist/india_boundary_corrections.pmtiles",
    });
    window.boundaryCorrectionSw = sw;
    return sw;
  } catch (e) {
    console.warn("[DumpSpot] India boundary correction setup failed:", e);
    return null;
  }
}

async function initApp() {
  sizeViews();
  await registerBoundaryCorrection();
  initMap();
  initUpload();
  maybeShowWelcome();
}

function maybeShowWelcome() {
  if (sessionStorage.getItem("ds_welcomed")) return;
  sessionStorage.setItem("ds_welcomed", "1");
  const msgs = [
    "Welcome back. Have a great day ahead 🌱",
    "Good to see you. Stay aware, stay vocal 📍",
    "Hey there. Every report matters 💚",
    "Welcome to DumpSpot. Let's clean this up 🗺️",
  ];
  setTimeout(() => {
    Toastify({
      text: msgs[Math.floor(Math.random() * msgs.length)],
      duration: 3500,
      gravity: "bottom",
      position: "center",
      stopOnFocus: true,
      style: {
        background: "#0d140d",
        border: "1px solid #2e452e",
        color: "#ddeedd",
        fontFamily: "'Space Mono',monospace",
        fontSize: ".72rem",
        letterSpacing: ".3px",
        borderRadius: "6px",
        padding: ".65rem 1.1rem",
      },
    }).showToast();
  }, 700);
}

function toast(msg, err) {
  Toastify({
    text: msg,
    duration: err ? 4000 : 3000,
    gravity: "bottom",
    position: "center",
    style: {
      background: err ? "#3a0a18" : "#0d140d",
      border: err ? "1px solid #ff2d78" : "1px solid #2e452e",
      color: err ? "#ff6a9a" : "#ddeedd",
      fontFamily: "'Space Mono',monospace",
      fontSize: ".7rem",
      borderRadius: "6px",
    },
  }).showToast();
}

const ICONS = {
  bin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>`,
  flame: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2c0 0-4 4-4 8a4 4 0 008 0c0-2-1-4-1-4s-1 3-3 3-2-2-2-2 2-1 2-5z"/></svg>`,
  drop: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3L5 14a7 7 0 0014 0L12 3z"/></svg>`,
  brick: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="7" width="20" height="5" rx="1"/><rect x="2" y="12" width="9" height="5" rx="1"/><rect x="13" y="12" width="9" height="5" rx="1"/></svg>`,
  bolt: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>`,
  cross: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="9" y="2" width="6" height="20" rx="1"/><rect x="2" y="9" width="20" height="6" rx="1"/></svg>`,
  bone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><ellipse cx="9" cy="4.5" rx="1.8" ry="2.2"/><ellipse cx="15" cy="4.5" rx="1.8" ry="2.2"/><ellipse cx="5.5" cy="9.5" rx="1.5" ry="1.8"/><ellipse cx="18.5" cy="9.5" rx="1.5" ry="1.8"/><path d="M12 22c-2.8 0-6-2.5-6-6 0-2 1.5-3.5 3-4.5 1-.7 2-1 3-1s2 .3 3 1c1.5 1 3 2.5 3 4.5 0 3.5-3.2 6-6 6z"/></svg>`,
  photo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`,
};

const CATS = [
  { key: "Plastic waste", icon: "bin", label: "Plastic" },
  { key: "Food waste", icon: "bin", label: "Food waste" },
  { key: "Construction", icon: "brick", label: "Debris" },
  { key: "Nala / Sewage", icon: "drop", label: "Nala / Sewage" },
  { key: "Burning garbage", icon: "flame", label: "Burning" },
  { key: "E-waste", icon: "bolt", label: "E-waste" },
  { key: "Medical waste", icon: "cross", label: "Medical" },
  { key: "Animal waste", icon: "bone", label: "Animal" },
  { key: "Mixed / general", icon: "bin", label: "Mixed" },
];

function catIcon(key) {
  const c = CATS.find((x) => x.key === key);
  return c ? ICONS[c.icon] : ICONS.bin;
}
function pinIcon(cats) {
  return !cats || !cats.length ? ICONS.bin : catIcon(cats[0]);
}

function genId() {
  const d = new Date();
  const dt = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const tm = `${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}${String(d.getSeconds()).padStart(2, "0")}`;
  const r = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .toUpperCase()
    .padStart(4, "0");
  return `DS-${dt}-${tm}-${r}`;
}

function fmtTs(iso) {
  const d = new Date(iso);
  const localDate = d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const localTime = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const viewerTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const isIST = viewerTz === "Asia/Calcutta" || viewerTz === "Asia/Kolkata";
  if (isIST) {
    return localDate + " · " + localTime + " IST";
  }
  const istTime = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
  return localDate + " · " + localTime + " [" + istTime + " IST]";
}

function normLocation(str) {
  if (!str) return "";
  return str
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function looksLikeAbbr(str) {
  const s = str.trim();
  return s.length <= 4 && s === s.toUpperCase() && /^[A-Z]+$/.test(s);
}

let reports = [],
  map,
  mLayer,
  detMap = null,
  curView = "map",
  prevPage = "pg-feed";
const PAGES = ["pg-feed", "pg-detail", "pg-report"];

function goPage(id, from) {
  PAGES.forEach((p) => document.getElementById(p).classList.remove("on"));
  document.querySelectorAll(".ntab").forEach((t) => t.classList.remove("on"));
  document.getElementById(id).classList.add("on");
  if (id === "pg-feed")
    document.getElementById("ntab-feed").classList.add("on");
  if (id === "pg-report")
    document.getElementById("ntab-report").classList.add("on");
  if (from) prevPage = from;
  if (id === "pg-feed" && map) setTimeout(() => map.invalidateSize(), 80);
  window.scrollTo(0, 0);
}
function goBack() {
  goPage(prevPage || "pg-feed");
}
function openDetail(id) {
  const r = reports.find((x) => x.id === id);
  if (!r) return;
  prevPage = "pg-feed";
  renderDetail(r);
  goPage("pg-detail");
}

async function fetchReports() {
  setFeedLoading(true);
  try {
    const { data, error } = await getDb()
      .from("reports")
      .select("*, report_photos(url, position)")
      .order("ts", { ascending: false });
    if (error) throw error;
    reports = data.map((r) => ({
      ...r,
      photos: (r.report_photos || [])
        .sort((a, b) => a.position - b.position)
        .map((p) => p.url),
    }));
  } catch (e) {
    toast("Could not load reports. Check your connection.", true);
    reports = [];
  }
  setFeedLoading(false);
  buildStateFilter();
  applyFilters();
}

function setFeedLoading(on) {
  const el = document.getElementById("feed-loading");
  if (el) el.style.display = on ? "flex" : "none";
}

function initMap() {
  map = L.map("map", { zoomControl: true, scrollWheelZoom: true }).setView(
    [20.5937, 78.9629],
    3,
  );
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    {
      attribution: "© OpenStreetMap © CARTO",
      subdomains: "abcd",
      maxZoom: 19,
    },
  ).addTo(map);
  mLayer = L.layerGroup().addTo(map);
  buildCatFilter();
  fetchReports();
  locateUser();
}

async function locateUser() {
  const isLocal =
    location.hostname === "localhost" || location.hostname === "127.0.0.1";
  const providers = [
    !isLocal && {
      url: "https://ipapi.co/json/",
      parse: (d) => ({ lat: d.latitude, lng: d.longitude }),
    },
    {
      url: "https://get.geojs.io/v1/ip/geo.json",
      parse: (d) => ({
        lat: parseFloat(d.latitude),
        lng: parseFloat(d.longitude),
      }),
    },
  ].filter(Boolean);
  for (const p of providers) {
    try {
      const res = await fetch(p.url);
      const data = await res.json();
      const loc = p.parse(data);
      if (loc.lat && loc.lng && !isNaN(loc.lat) && !isNaN(loc.lng)) {
        map.setView([loc.lat, loc.lng], 4);
        return;
      }
    } catch (e) {}
  }
}

function makePinIcon(cats) {
  return L.divIcon({
    className: "",
    html: `<div class="dpin">${pinIcon(cats)}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  });
}

function renderMarkers(data) {
  mLayer.clearLayers();
  data.forEach((r) => {
    const m = L.marker([r.lat, r.lng], { icon: makePinIcon(r.cats) }).addTo(
      mLayer,
    );
    m.bindPopup(buildPopHTML(r), { maxWidth: 260, minWidth: 210 });
    m.on("popupopen", () => {
      const btn = document.getElementById("pu-btn-" + r.id);
      if (btn) btn.onclick = () => openDetail(r.id);
    });
  });
}

function buildPopHTML(r) {
  const imgEl =
    r.photos && r.photos.length
      ? `<div class="pu-img"><img src="${r.photos[0]}"></div>`
      : `<div class="pu-img">${ICONS.photo}</div>`;
  const cats = (r.cats || [])
    .map((c) => `<span class="pu-cat">${catIcon(c)}<span>${c}</span></span>`)
    .join("");
  return `<div>${imgEl}<div class="pu-body"><div class="pu-loc">${r.specific}</div><div class="pu-area">${r.area}, ${r.state}</div>${cats ? `<div class="pu-cats">${cats}</div>` : ""}${r.notes ? `<div style="font-size:.72rem;color:var(--mu);margin-top:.28rem;line-height:1.4;">${r.notes}</div>` : ""}<div class="pu-meta"><span class="pu-by">by ${r.reporter}</span><span class="pu-date">${fmtTs(r.ts)}</span></div><button class="pu-link" id="pu-btn-${r.id}">View full report →</button></div></div>`;
}

function sevClass(sev) {
  if (!sev || !sev.length) return "sev-none";
  const s = sev[0].toLowerCase();
  if (s.includes("block")) return "sev-blocking";
  if (s.includes("severe")) return "sev-severe";
  if (s.includes("moderate")) return "sev-moderate";
  return "sev-minor";
}

function groupByTime(data) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yestStart = new Date(todayStart - 86400000);
  const weekStart = new Date(todayStart - 6 * 86400000);
  const groups = { today: [], yesterday: [], thisWeek: [], older: {} };
  data.forEach((r) => {
    const d = new Date(r.ts);
    if (d >= todayStart) groups.today.push(r);
    else if (d >= yestStart) groups.yesterday.push(r);
    else if (d >= weekStart) groups.thisWeek.push(r);
    else {
      const key = d.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      });
      if (!groups.older[key]) groups.older[key] = [];
      groups.older[key].push(r);
    }
  });
  return groups;
}

function renderLCard(r) {
  const sc = sevClass(r.sev);
  const chips = (r.cats || [])
    .map((c) => `<span class="chip">${catIcon(c)}<span>${c}</span></span>`)
    .join("");
  const timeStr = new Date(r.ts).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `<div class="lcard ${sc}" onclick="openDetail('${r.id}')">
    <div class="lcard-main">
      <div class="lcard-loc"><span class="lcard-loc-inner">${r.specific}</span></div>
      <div class="lcard-area">${r.area}, ${r.state}</div>
      ${chips ? `<div class="lcard-chips">${chips}</div>` : ""}
    </div>
    <div class="lcard-meta">
      <span class="lcard-by">by ${r.reporter}</span>
      <span class="lcard-time">${timeStr}</span>
    </div>
  </div>`;
}

function renderGroup(label, items, cls) {
  if (!items || !items.length) return "";
  const sorted = [...items].sort((a, b) => new Date(b.ts) - new Date(a.ts));
  return `<div class="clist-group">
    <div class="clist-heading ${cls}">
      <span class="clist-heading-label">${label}</span>
      <span class="clist-heading-count">${items.length} report${items.length > 1 ? "s" : ""}</span>
    </div>
    ${sorted.map(renderLCard).join("")}
  </div>`;
}

function renderWall(data) {
  const el = document.getElementById("clist");
  if (!data.length) {
    el.innerHTML = '<div class="list-empty">No spots match this filter.</div>';
    return;
  }
  const g = groupByTime(data);
  let html = "";
  if (g.today.length) html += renderGroup("Today", g.today, "today");
  else if (g.yesterday.length)
    html += renderGroup("Yesterday", g.yesterday, "yesterday");
  if (g.today.length && g.yesterday.length)
    html += renderGroup("Yesterday", g.yesterday, "yesterday");
  if (g.thisWeek.length)
    html += renderGroup("This week", g.thisWeek, "this-week");
  Object.keys(g.older)
    .sort((a, b) => new Date("01 " + b) - new Date("01 " + a))
    .forEach((k) => {
      html += renderGroup(k, g.older[k], "older");
    });
  el.innerHTML = html;
}

function buildStateFilter() {
  const el = document.getElementById("fs-state");
  const current = el.value;
  el.innerHTML = '<option value="">All states</option>';
  [...new Set(reports.map((r) => r.state))].sort().forEach((s) => {
    const o = document.createElement("option");
    o.value = s;
    o.textContent = s;
    el.appendChild(o);
  });
  if (current) el.value = current;
}

function buildCatFilter() {
  const el = document.getElementById("fs-cat");
  CATS.forEach((c) => {
    const o = document.createElement("option");
    o.value = c.key;
    o.textContent = c.label;
    el.appendChild(o);
  });
  document.getElementById("cgrid").innerHTML = CATS.map(
    (c) =>
      `<div class="ccard" data-cat="${c.key}" onclick="toggleCat(this,'${c.key}')"><div class="ccard-ico">${ICONS[c.icon]}</div><div class="ccard-lbl">${c.label}</div></div>`,
  ).join("");
}

function applyFilters() {
  const state = document.getElementById("fs-state").value;
  const cat = document.getElementById("fs-cat").value;
  const areaEl = document.getElementById("fs-area");
  const prev = areaEl.value;
  areaEl.innerHTML = '<option value="">All areas</option>';
  [
    ...new Set(
      reports.filter((r) => !state || r.state === state).map((r) => r.area),
    ),
  ]
    .sort()
    .forEach((a) => {
      const o = document.createElement("option");
      o.value = a;
      o.textContent = a;
      areaEl.appendChild(o);
    });
  if (prev) areaEl.value = prev;
  const area = areaEl.value;
  const filtered = reports.filter((r) => {
    if (state && r.state !== state) return false;
    if (area && r.area !== area) return false;
    if (cat && !(r.cats || []).includes(cat)) return false;
    return true;
  });
  const n = filtered.length;
  document.getElementById("cnt-n").textContent = n;
  const sp = document.querySelector(".cnt span");
  if (sp) sp.textContent = n === 1 ? "spot" : "spots";
  renderMarkers(filtered);
  renderWall(filtered);
}

function setView(v) {
  curView = v;
  document.getElementById("map-wrap").style.display =
    v === "map" ? "flex" : "none";
  document.getElementById("list-wrap").classList.toggle("on", v === "list");
  document.getElementById("btn-map").classList.toggle("on", v === "map");
  document.getElementById("btn-list").classList.toggle("on", v === "list");
  if (v === "map" && map) setTimeout(() => map.invalidateSize(), 60);
}

function sizeViews() {
  const tb = document.querySelector(".toolbar");
  const h = window.innerHeight - 70 - (tb ? tb.offsetHeight : 40);
  const mw = document.getElementById("map-wrap");
  const lw = document.getElementById("list-wrap");
  if (mw) mw.style.height = h + "px";
  if (lw) lw.style.height = h + "px";
}

function renderDetail(r) {
  let photos = "";
  if (r.photos && r.photos.length) {
    const n = Math.min(r.photos.length, 6);
    const cls = ["", "n1", "n2", "n3", "n4", "n5", "n6"][n] || "n6";
    photos = `<div class="det-photos ${cls}">${r.photos
      .slice(0, 6)
      .map((p, i) => `<img class="det-photo dp${i}" src="${p}">`)
      .join("")}</div>`;
  } else {
    photos = `<div class="det-nophoto">${ICONS.photo}</div>`;
  }
  const cats = (r.cats || [])
    .map((c) => `<div class="det-cat">${catIcon(c)}<span>${c}</span></div>`)
    .join("");
  const types = (r.type || [])
    .map((t) => `<span class="det-tag">${t}</span>`)
    .join("");
  const sevs = (r.sev || [])
    .map((s) => `<span class="det-tag">${s}</span>`)
    .join("");
  document.getElementById("det-content").innerHTML = `
    ${photos}
    <div class="det-id-badge">Report ID <span>${r.id}</span></div>
    <div class="det-area">${r.area}, ${r.state}</div>
    <div class="det-loc">${r.specific}</div>
    <div class="det-timestamp">Submitted ${fmtTs(r.ts)} &nbsp;&middot;&nbsp; by ${r.reporter}</div>
    <div class="form-grid" style="margin-top:1.25rem;">
      <div class="form-col">
        <div class="det-sec-label sl-loc" style="margin-bottom:.45rem;">Location</div>
        <div style="font-family:var(--fb);font-size:.85rem;color:#8ab08a;font-weight:500;">${r.state} &middot; ${r.area}</div>
        ${r.notes ? `<div class="det-sec-label sl-loc" style="margin-top:1.1rem;margin-bottom:.45rem;">Notes</div><div class="det-notes">${r.notes}</div>` : ""}
      </div>
      <div class="form-col">
        ${types ? `<div class="det-sec-label sl-site" style="margin-bottom:.45rem;">Type of site</div><div class="det-tags" style="margin-bottom:.85rem;">${types}</div>` : ""}
        ${sevs ? `<div class="det-sec-label sl-sev" style="margin-bottom:.45rem;">Severity</div><div class="det-tags">${sevs}</div>` : ""}
      </div>
      <div class="form-col">
        ${cats ? `<div class="det-sec-label sl-cat" style="margin-bottom:.45rem;">Garbage category</div><div class="det-cats">${cats}</div>` : ""}
      </div>
    </div>`;
  const mm = document.getElementById("det-mini-map");
  mm.innerHTML = "";
  mm.style.display = "block";
  if (detMap) {
    try {
      detMap.remove();
    } catch (e) {}
    detMap = null;
  }
  setTimeout(() => {
    detMap = L.map("det-mini-map", {
      zoomControl: false,
      scrollWheelZoom: false,
      dragging: false,
      touchZoom: false,
      doubleClickZoom: false,
    }).setView([r.lat, r.lng], 14);
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      { subdomains: "abcd", maxZoom: 19 },
    ).addTo(detMap);
    L.circle([r.lat, r.lng], {
      radius: 400,
      color: "#ff2d78",
      fillColor: "#ff2d78",
      fillOpacity: 0.08,
      weight: 1.5,
      opacity: 0.6,
    }).addTo(detMap);
    L.marker([r.lat, r.lng], { icon: makePinIcon(r.cats) }).addTo(detMap);
    detMap.invalidateSize();
  }, 80);
}

let locTimer = null,
  locLat = null,
  locLng = null;

function onLocInput(val) {
  clearTimeout(locTimer);
  const box = document.getElementById("loc-results");
  if (val.length < 3) {
    box.classList.remove("open");
    box.innerHTML = "";
    return;
  }
  box.innerHTML = '<div class="loc-searching">Searching…</div>';
  box.classList.add("open");
  locTimer = setTimeout(() => searchLoc(val), 500);
}

async function searchLoc(q) {
  const box = document.getElementById("loc-results");
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=5&accept-language=en`,
    );
    const data = await res.json();
    if (!data.length) {
      box.innerHTML =
        '<div class="loc-searching">No results. Type your location manually.</div>';
      return;
    }
    box.innerHTML = data
      .map(
        (item) =>
          `<div class="loc-result-item" onclick="pickLoc('${item.display_name.replace(/'/g, "\\'")}',${item.lat},${item.lon})">${item.display_name.split(",")[0]}<small>${item.display_name}</small></div>`,
      )
      .join("");
  } catch (e) {
    box.innerHTML =
      '<div class="loc-searching">Search unavailable. Type manually.</div>';
  }
}

function pickLoc(name, lat, lng) {
  const parts = name
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const short = parts.slice(0, 2).join(", ");
  document.getElementById("rspec").value = short;
  locLat = parseFloat(lat);
  locLng = parseFloat(lng);
  const box = document.getElementById("loc-results");
  box.classList.remove("open");
  box.innerHTML = "";
  initPinMap(locLat, locLng);
}

function openGoogleMaps() {
  window.open("https://www.google.com/maps", "_blank");
}

document.addEventListener("click", (e) => {
  if (!e.target.closest(".loc-search-wrap")) {
    const box = document.getElementById("loc-results");
    if (box) box.classList.remove("open");
  }
});

const selTags = { type: [], sev: [] };
const selCats = [];

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".tag").forEach((t) => {
    t.addEventListener("click", () => {
      const g = t.dataset.g;
      t.classList.toggle("on");
      const v = t.textContent.trim();
      if (t.classList.contains("on")) selTags[g].push(v);
      else selTags[g] = selTags[g].filter((x) => x !== v);
    });
  });
});

function toggleCat(el, key) {
  el.classList.toggle("on");
  if (el.classList.contains("on")) selCats.push(key);
  else {
    const i = selCats.indexOf(key);
    if (i > -1) selCats.splice(i, 1);
  }
}

function compressImage(file) {
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
        (blob) =>
          resolve(
            new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), {
              type: "image/webp",
            }),
          ),
        "image/webp",
        0.82,
      );
    };
    img.src = url;
  });
}

const upFiles = [];
const flaggedImageIndices = new Set();

function initUpload() {
  const ua = document.getElementById("uparea"),
    ui = document.getElementById("photo-input");
  ua.addEventListener("dragover", (e) => {
    e.preventDefault();
    ua.classList.add("drag");
  });
  ua.addEventListener("dragleave", () => ua.classList.remove("drag"));
  ua.addEventListener("drop", (e) => {
    e.preventDefault();
    ua.classList.remove("drag");
    addFiles([...e.dataTransfer.files]);
  });
  ui.addEventListener("change", () => {
    addFiles([...ui.files]);
    ui.value = "";
  });
}

async function addFiles(fs) {
  const eligible = fs
    .filter((f) => f.type.startsWith("image/"))
    .slice(0, 6 - upFiles.length);
  for (const f of eligible) {
    const compressed = await compressImage(f);
    if (upFiles.length < 6) upFiles.push(compressed);
  }
  renderPreviews();
}

function renderPreviews() {
  const pg = document.getElementById("pgrid"),
    uc = document.getElementById("upcount"),
    ua = document.getElementById("uparea"),
    ui = document.getElementById("photo-input");
  pg.innerHTML = "";
  if (!upFiles.length) {
    pg.style.display = "none";
    uc.textContent = "";
    return;
  }
  pg.style.display = "grid";
  upFiles.forEach((f, i) => {
    const d = document.createElement("div");
    d.className = "pitem";
    const img = document.createElement("img");
    img.src = URL.createObjectURL(f);
    const btn = document.createElement("button");
    btn.className = "prm";
    btn.textContent = "✕";
    btn.onclick = () => {
      upFiles.splice(i, 1);
      renderPreviews();
    };
    d.appendChild(img);
    d.appendChild(btn);
    pg.appendChild(d);
  });
  uc.textContent = `${upFiles.length}/6 photo${upFiles.length > 1 ? "s" : ""}`;
  const full = upFiles.length >= 6;
  ui.disabled = full;
  ua.style.opacity = full ? "0.5" : "1";
  ua.style.pointerEvents = full ? "none" : "";
}

async function submitReport() {
  const name = document.getElementById("rname").value.trim();
  const state = normLocation(document.getElementById("rstate").value);
  const area = normLocation(document.getElementById("rarea").value);
  const specific = normLocation(document.getElementById("rspec").value);
  if (!name || !state || !area || !specific) {
    toast("Fill in name, state, area and location.", true);
    return;
  }
  if (!upFiles.length) {
    toast("Add at least one photo.", true);
    return;
  }

  const notes = document.getElementById("rnotes").value.trim();
  const textErrors = checkTextSpam(name, state, area, specific, notes);
  if (textErrors.length > 0) {
    textErrors.forEach((msg) => toast(msg, true));
    return;
  }
  if (looksLikeAbbr(document.getElementById("rstate").value.trim()))
    toast(
      "State looks like an abbreviation — write the full state name.",
      true,
    );
  if (looksLikeAbbr(document.getElementById("rarea").value.trim()))
    toast("Area looks like an abbreviation — write the full area name.", true);

  const btn = document.querySelector(".sub-btn");

  btn.textContent = "Checking photos…";
  btn.disabled = true;
  const imgResults = await checkAllImages(upFiles);
  const newFlags = imgResults.filter(
    (r) => !flaggedImageIndices.has(r.index - 1),
  );
  if (newFlags.length > 0) {
    newFlags.forEach((r) => {
      flaggedImageIndices.add(r.index - 1);
      toast(
        "Photo " +
          r.index +
          ": " +
          r.issues[0] +
          " — remove it or submit again to override.",
        true,
      );
    });
    btn.textContent = "Submit Report";
    btn.disabled = false;
    return;
  }
  if (flaggedImageIndices.size > 0) {
    const stillFlagged = [...flaggedImageIndices].filter(
      (i) => i < upFiles.length,
    );
    if (stillFlagged.length > 0) {
      stillFlagged
        .slice()
        .reverse()
        .forEach((i) => {
          upFiles.splice(i, 1);
          flaggedImageIndices.delete(i);
        });
      renderPreviews();
      toast("Flagged photos removed. Submitting remaining photos.", false);
    }
  }
  if (!upFiles.length) {
    toast("No valid photos remaining. Please add at least one.", true);
    btn.textContent = "Submit Report";
    btn.disabled = false;
    return;
  }

  btn.textContent = "Uploading…";
  try {
    const id = genId();
    const photoUrls = [];
    for (let i = 0; i < upFiles.length; i++) {
      const file = upFiles[i];
      const path = `${id}/${i + 1}.webp`;
      const { error: upErr } = await getDb()
        .storage.from("report-photos")
        .upload(path, file, { contentType: "image/webp", upsert: false });
      if (upErr) throw upErr;
      const { data: urlData } = getDb()
        .storage.from("report-photos")
        .getPublicUrl(path);
      photoUrls.push({ url: urlData.publicUrl, position: i + 1 });
    }
    let resolvedLat = locLat;
    let resolvedLng = locLng;
    if (resolvedLat === null || resolvedLng === null) {
      const query = [specific, area, state].filter(Boolean).join(", ");
      try {
        const gRes = await fetch(
          "https://nominatim.openstreetmap.org/search?q=" +
            encodeURIComponent(query) +
            "&format=json&limit=1&accept-language=en",
        );
        const gData = await gRes.json();
        if (gData && gData.length) {
          resolvedLat = parseFloat(gData[0].lat);
          resolvedLng = parseFloat(gData[0].lon);
        }
      } catch (e) {}
    }
    if (resolvedLat === null || resolvedLng === null) {
      toast(
        "Could not determine coordinates — please search and select your location from the dropdown.",
        true,
      );
      btn.textContent = "Submit Report";
      btn.disabled = false;
      return;
    }
    if (!locLat || !locLng) initPinMap(resolvedLat, resolvedLng);
    const codes = getLocationCode(resolvedLat, resolvedLng);
    const { error: repErr } = await getDb()
      .from("reports")
      .insert({
        id,
        reporter: name,
        state,
        area,
        specific,
        type: selTags.type,
        cats: selCats,
        sev: selTags.sev,
        notes: document.getElementById("rnotes").value.trim(),
        lat: resolvedLat,
        lng: resolvedLng,
        digipin: codes.digipin || null,
        pluscode: codes.pluscode || null,
        ts: new Date().toISOString(),
      });
    if (repErr) throw repErr;
    const { error: photoErr } = await getDb()
      .from("report_photos")
      .insert(
        photoUrls.map((p) => ({
          report_id: id,
          url: p.url,
          position: p.position,
        })),
      );
    if (photoErr) throw photoErr;
    await fetchReports();
    document.getElementById("form-screen").style.display = "none";
    document.getElementById("succ").classList.add("on");
    document.getElementById("succ-id").textContent = "ID: " + id;
  } catch (e) {
    toast("Submit failed: " + (e.message || "unknown error"), true);
    btn.textContent = "Submit Report";
    btn.disabled = false;
  }
}

function resetForm() {
  ["rname", "rstate", "rarea", "rspec", "rnotes"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  document.querySelectorAll(".tag.on").forEach((t) => t.classList.remove("on"));
  document
    .querySelectorAll(".ccard.on")
    .forEach((c) => c.classList.remove("on"));
  Object.keys(selTags).forEach((k) => (selTags[k] = []));
  selCats.length = 0;
  upFiles.length = 0;
  locLat = null;
  locLng = null;
  flaggedImageIndices.clear();
  const pw = document.getElementById("pin-confirm-wrap");
  if (pw) pw.style.display = "none";
  if (pinMap) {
    try {
      pinMap.remove();
    } catch (e) {}
    pinMap = null;
    pinMarker = null;
  }
  renderPreviews();
  document.getElementById("form-screen").style.display = "";
  document.getElementById("succ").classList.remove("on");
  const btn = document.querySelector(".sub-btn");
  btn.textContent = "Submit Report";
  btn.disabled = false;
  const ua = document.getElementById("uparea"),
    ui = document.getElementById("photo-input");
  if (ui) ui.disabled = false;
  if (ua) {
    ua.style.opacity = "1";
    ua.style.pointerEvents = "";
  }
}

window.addEventListener("load", () => {
  initApp();
});
window.addEventListener("resize", sizeViews);
const DP_CHARS = "FCJ9RELEEBEMG8D7VT6KH5LNQP4SZ3Y2X1W0";

function encodeDigipin(lat, lng) {
  if (lat < 2.5 || lat > 38.5 || lng < 63.5 || lng > 99.5) return null;
  const ROWS = 4,
    COLS = 4;
  let minLat = 2.5,
    maxLat = 38.5,
    minLng = 63.5,
    maxLng = 99.5;
  let pin = "";
  for (let level = 0; level < 8; level++) {
    const dLat = (maxLat - minLat) / ROWS;
    const dLng = (maxLng - minLng) / COLS;
    const row = Math.min(ROWS - 1, Math.floor((lat - minLat) / dLat));
    const col = Math.min(COLS - 1, Math.floor((lng - minLng) / dLng));
    const gridRow = ROWS - 1 - row;
    const charIdx = gridRow * COLS + col;
    pin += DP_CHARS[charIdx];
    minLat = minLat + row * dLat;
    maxLat = minLat + dLat;
    minLng = minLng + col * dLng;
    maxLng = minLng + dLng;
    if (level === 2 || level === 5) pin += "-";
  }
  return pin;
}

function encodePlusCode(lat, lng) {
  try {
    const A = "23456789CFGHJMPQRVWX";
    const BASE = 20;
    lat = Math.max(-90, Math.min(90, lat));
    lng = Math.max(-180, Math.min(180, lng));
    if (lat === 90) lat -= 1e-7;
    const latV = Math.floor((lat + 90) * 8000);
    const lngV = Math.floor((lng + 180) * 8000);
    let latCode = "",
      lngCode = "";
    let av = latV,
      lv = lngV;
    for (let i = 0; i < 5; i++) {
      latCode = A[av % BASE] + latCode;
      av = Math.floor(av / BASE);
      lngCode = A[lv % BASE] + lngCode;
      lv = Math.floor(lv / BASE);
    }
    let code = "";
    for (let i = 0; i < 5; i++) code += latCode[i] + lngCode[i];
    return code.slice(0, 8) + "+" + code.slice(8, 13);
  } catch (e) {
    return null;
  }
}

function getLocationCode(lat, lng) {
  const dp = encodeDigipin(lat, lng);
  const pc = encodePlusCode(lat, lng);
  return { digipin: dp, pluscode: pc };
}

let pinMap = null,
  pinMarker = null,
  revGeoTimer = null;

function initPinMap(lat, lng) {
  const wrap = document.getElementById("pin-confirm-wrap");
  wrap.style.display = "block";
  if (pinMap) {
    try {
      pinMap.remove();
    } catch (e) {}
    pinMap = null;
    pinMarker = null;
  }
  setTimeout(() => {
    pinMap = L.map("pin-confirm-map", {
      zoomControl: true,
      scrollWheelZoom: false,
    }).setView([lat, lng], 16);
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        subdomains: "abcd",
        maxZoom: 19,
      },
    ).addTo(pinMap);
    const icon = L.divIcon({
      className: "",
      html: `<div class="dpin" style="cursor:grab;">${ICONS.drop}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });
    pinMarker = L.marker([lat, lng], { icon, draggable: true }).addTo(pinMap);
    pinMarker.on("dragend", () => {
      const p = pinMarker.getLatLng();
      locLat = p.lat;
      locLng = p.lng;
      updatePinInfo(p.lat, p.lng);
    });
    pinMap.on("click", (e) => {
      pinMarker.setLatLng(e.latlng);
      locLat = e.latlng.lat;
      locLng = e.latlng.lng;
      updatePinInfo(e.latlng.lat, e.latlng.lng);
    });
    updatePinInfo(lat, lng);
    pinMap.invalidateSize();
  }, 80);
}

function updatePinInfo(lat, lng) {
  const codes = getLocationCode(lat, lng);
  const dpEl = document.getElementById("pin-digipin");
  if (dpEl) {
    const parts = [];
    if (codes.digipin) parts.push("DigiPin: " + codes.digipin);
    if (codes.pluscode) parts.push("Plus Code: " + codes.pluscode);
    dpEl.textContent = parts.join("  ·  ");
  }
  clearTimeout(revGeoTimer);
  revGeoTimer = setTimeout(() => reverseGeocode(lat, lng), 600);
}

async function reverseGeocode(lat, lng) {
  const el = document.getElementById("pin-revgeo");
  if (!el) return;
  el.textContent = "Locating…";
  try {
    const res = await fetch(
      "https://nominatim.openstreetmap.org/reverse?lat=" +
        lat +
        "&lon=" +
        lng +
        "&format=json&accept-language=en",
    );
    const d = await res.json();
    if (!d || !d.address) {
      el.textContent = "";
      return;
    }
    const a = d.address;
    const parts = [
      a.road || a.pedestrian || a.footway || a.path,
      a.suburb || a.neighbourhood || a.quarter,
      a.city || a.town || a.village || a.county,
      a.state,
      a.country,
    ].filter(Boolean);
    const label = parts.length ? parts.slice(0, 4).join(", ") : "";
    el.textContent = label ? "📍 " + label : "";
    if (label) {
      const rspec = document.getElementById("rspec");
      if (rspec) rspec.value = normLocation(parts.slice(0, 2).join(", "));
    }
  } catch (e) {
    el.textContent = "";
  }
}

async function validateLocationField(val, fieldType) {
  if (!val || val.trim().length < 3) return;
  try {
    const res = await fetch(
      "https://nominatim.openstreetmap.org/search?q=" +
        encodeURIComponent(val.trim()) +
        "&format=json&addressdetails=1&limit=1&accept-language=en",
    );
    const data = await res.json();
    if (!data || !data.length) return;
    const a = data[0].address;
    if (fieldType === "state") {
      const isCity = !!(a.city || a.town || a.village || a.suburb);
      const isState = !!(a.state && !a.city && !a.town);
      if (isCity && !isState) {
        const stateHint = a.state ? ' Did you mean "' + a.state + '"?' : "";
        toast(
          'State field: "' + val.trim() + '" looks like a city.' + stateHint,
          true,
        );
      }
    } else if (fieldType === "area") {
      const isState =
        !!a.state && !(a.city || a.town || a.village || a.suburb || a.county);
      if (isState) {
        const cityHint = a.county
          ? ' Try a district like "' + a.county + '".'
          : "";
        toast(
          'Area field: "' + val.trim() + '" looks like a state.' + cityHint,
          true,
        );
      }
    }
  } catch (e) {}
}

const ABUSE = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "bastard",
  "cunt",
  "dick",
  "cock",
  "pussy",
  "whore",
  "slut",
  "nigger",
  "nigga",
  "faggot",
  "retard",
  "rape",
  "raping",
  "raped",
  "molest",
  "ur mom",
  "your mom",
  "yo mama",
  "yo momma",
  "teri maa",
  "teri ma",
  "teri behen",
  "teri behan",
  "madarchod",
  "madarjaat",
  "bhenchod",
  "bhen ke",
  "bhenke",
  "behenchod",
  "chutiya",
  "chutiye",
  "chut",
  "lund",
  "gaand",
  "randi",
  "haramzada",
  "haramzadi",
  "haramkhor",
  "sala",
  "saala",
  "saali",
  "kamina",
  "kamine",
  "kaminey",
  "kutte",
  "kutiya",
  "mc",
  "bc",
  "mf",
  "stfu",
  "gtfo",
  "kys",
  "nsfw",
  "boobs",
  "tits",
  "naked",
  "nude",
  "porn",
  "sex",
  "sexy",
  "sexi",
  "horny",
  "boner",
  "lmao lmfao",
  "fake report",
  "nothing here",
  "bakwaas",
  "bekar",
  "faltu",
  "jhoot",
  "jhoothi",
  "jhootha",
  "bewakoof",
  "pagal",
  "ullu",
  "ulloo",
  "harami",
  "sala kutta",
  "suar",
  "suwar",
  "shiz",
  "shiit",
  "fuuk",
  "fuk",
  "fck",
  "azz",
  "a55",
  "b1tch",
  "fvck",
  "wtf",
  "wth",
  "shut up",
  "shutup",
  "idgaf",
  "idfc",
  "stfu",
  "gtfo",
  "kys",
  "tf",
  "bs",
  "pos",
  "nonsense",
  "rubbish",
  "this is stupid",
  "not real",
  "doesnt exist",
];

const GIBBERISH_PATTERNS = [
  /^(.)\1{3,}$/,
  /^[qwrtypsdfghjklzxcvbnm]{5,}$/i,
  /^[aeiou]{4,}$/i,
  /^(asdf|qwer|zxcv|hjkl|uiop|1234|abcd|wxyz)/i,
];

function containsAbuse(str) {
  if (!str) return null;
  const s = str
    .toLowerCase()
    .replace(/[*@#!$%^&]/g, "")
    .replace(/0/g, "o")
    .replace(/3/g, "e")
    .replace(/1/g, "i")
    .replace(/4/g, "a");
  for (const w of ABUSE) {
    if (s.includes(w)) return w;
  }
  return null;
}

function isGibberish(str) {
  if (!str) return true;
  const s = str.trim();
  if (s.length <= 2) return true;
  for (const r of GIBBERISH_PATTERNS) {
    if (r.test(s)) return true;
  }
  const clean = s.toLowerCase().replace(/\s/g, "");
  if (clean.length > 6 && new Set(clean).size <= 2) return true;
  return false;
}

function checkTextSpam(name, state, area, specific, notes) {
  const errors = [];
  const required = [
    { label: "reporter name", val: name },
    { label: "state", val: state },
    { label: "area", val: area },
    { label: "location", val: specific },
  ];
  for (const f of required) {
    const abuse = containsAbuse(f.val);
    if (abuse) {
      errors.push(f.label + " contains inappropriate language");
      continue;
    }
    if (isGibberish(f.val))
      errors.push(f.label + " does not look like a real value");
  }
  if (notes) {
    const notesAbuse = containsAbuse(notes);
    if (notesAbuse) errors.push("notes contain inappropriate language");
    const noteWords = notes.trim().split(/\s+/);
    const gibWords = noteWords.filter((w) => w.length > 2 && isGibberish(w));
    if (gibWords.length >= 1)
      errors.push(
        "notes appear to contain gibberish — please describe what you see clearly",
      );
  }
  return errors;
}

async function analyseImage(file) {
  return new Promise(function (resolve) {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = function () {
      URL.revokeObjectURL(url);
      const W = 80,
        H = 80;
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, W, H);
      const d = ctx.getImageData(0, 0, W, H).data;
      const total = W * H;

      const buckets = {};
      const greys = [];
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i],
          g = d[i + 1],
          b = d[i + 2];

        const grey = Math.round((r + g + b) / 3);
        greys.push(grey);
        const key =
          Math.round(r / 32) * 32 +
          "," +
          Math.round(g / 32) * 32 +
          "," +
          Math.round(b / 32) * 32;
        buckets[key] = (buckets[key] || 0) + 1;
      }
      const topBucket = Math.max.apply(null, Object.values(buckets));
      const dominance = topBucket / total;
      const mean =
        greys.reduce(function (a, b) {
          return a + b;
        }, 0) / greys.length;
      const variance =
        greys.reduce(function (a, v) {
          return a + Math.pow(v - mean, 2);
        }, 0) / greys.length;
      const issues = [];
      if (dominance > 0.75)
        issues.push("appears to be a blank or solid-colour image");
      if (variance < 100) issues.push("appears to have no real detail");
      const saturations = [];
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i],
          g = d[i + 1],
          b = d[i + 2];
        const mx = Math.max(r, g, b),
          mn = Math.min(r, g, b);
        saturations.push(mx === 0 ? 0 : (mx - mn) / mx);
      }
      const avgSat =
        saturations.reduce((a, b) => a + b, 0) / saturations.length;
      const highSatPx = saturations.filter((s) => s > 0.6).length / total;
      const veryHighSatPx = saturations.filter((s) => s > 0.85).length / total;
      const lowSatPx = saturations.filter((s) => s < 0.1).length / total;
      const isIllustration =
        (avgSat > 0.38 && highSatPx > 0.28 && variance > 300) ||
        (veryHighSatPx > 0.25 && lowSatPx > 0.3);
      if (isIllustration) {
        issues.push(
          "photo looks like an illustration or artwork — please upload a real photo of the location",
        );
      }
      resolve({ ok: issues.length === 0, issues: issues });
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      resolve({ ok: true, issues: [] });
    };
    img.src = url;
  });
}

let faceApiReady = false;
async function loadFaceApi() {
  if (faceApiReady || typeof faceapi === "undefined") return false;
  try {
    await Promise.race([
      faceapi.nets.tinyFaceDetector.loadFromUri(
        "https://justadudewhohacks.github.io/face-api.js/models",
      ),
      new Promise((_, rej) =>
        setTimeout(() => rej(new Error("timeout")), 8000),
      ),
    ]);
    faceApiReady = true;
    return true;
  } catch (e) {
    console.warn("[DumpSpot] face-api models failed to load:", e.message);
    return false;
  }
}

async function checkFaceInImage(file) {
  if (typeof faceapi === "undefined") return { ok: true };
  const loaded = await loadFaceApi();
  if (!loaded) return { ok: true };
  try {
    const img = await faceapi.bufferToImage(file);
    const det = await faceapi.detectAllFaces(
      img,
      new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.45 }),
    );
    if (det.length > 0)
      return {
        ok: false,
        issues: [
          "photo appears to show a person — please upload a photo of the location, not people",
        ],
      };
  } catch (e) {
    console.warn("[DumpSpot] face detection error:", e.message);
  }
  return { ok: true };
}

async function checkAllImages(files) {
  const results = [];
  for (let i = 0; i < files.length; i++) {
    const analysis = await analyseImage(files[i]);
    const face = await checkFaceInImage(files[i]);
    const issues = analysis.issues.concat(face.issues || []);
    if (issues.length) results.push({ index: i + 1, issues: issues });
  }
  return results;
}
