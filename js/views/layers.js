// Open-data overlays for the Explore map. Each layer answers a question about the reports:
//   Bins & recycling (OpenStreetMap / Overpass): are piles far from public bins?
//   PM2.5 now (Open-Meteo, CAMS):                where burning meets bad air
//   Rain, last 7 days (Open-Meteo):              rain vs drain / sewage overflow
//   Your data (CSV / GeoJSON, stays in browser): compare anything against reports
import { $, $$, esc, fmtN } from "../lib/util.js";
import { haversine } from "../lib/geo.js";
import { S, on } from "../core/state.js";
import { ICONS } from "../ui/icons.js";
import { toast } from "../ui/shell.js";

const L = {
  bins: { name: "Bins & recycling", icon: "recycle", src: "OpenStreetMap · Overpass", on: false, data: null, note: "" },
  air: { name: "Air · PM2.5 now", icon: "air", src: "Open-Meteo · Copernicus CAMS", on: false, data: null, note: "" },
  rain: { name: "Rain · last 7 days", icon: "rain", src: "Open-Meteo", on: false, data: null, note: "" },
  csv: { name: "Your data", icon: "csv", src: "Your file · stays in this browser", on: false, data: null, note: "" },
};
let map = null;
const EMPTY = { type: "FeatureCollection", features: [] };

export function mountLayers(host) {
  host.innerHTML = `
    <div class="ly-head"><span>${ICONS.layers}</span><b>Layers</b><span class="muted small">Open data over your reports</span></div>
    ${Object.entries(L).map(([k, l]) => `
      <div class="ly" data-k="${k}">
        <button class="ly-row" type="button" aria-pressed="false">
          <span class="ly-ico">${ICONS[l.icon]}</span>
          <span class="ly-t"><b>${l.name}</b><small>${l.src}</small></span>
          <span class="switch"><i></i></span>
        </button>
        <div class="ly-note" id="ly-note-${k}"></div>
      </div>`).join("")}
    <input type="file" id="ly-file" accept=".csv,.geojson,.json,text/csv,application/json" hidden />`;
  $$(".ly-row", host).forEach((b) => b.addEventListener("click", () => toggle(b.closest(".ly").dataset.k)));
  $("#ly-file").addEventListener("change", (e) => e.target.files[0] && loadFile(e.target.files[0]));
  on("city", () => {
    for (const k in L) (L[k].data = null), L[k].on && fetchLayer(k);
  });
  on("filter", () => Object.keys(L).forEach((k) => L[k].on && L[k].data && insight(k)));
  on("data", () => Object.keys(L).forEach((k) => L[k].on && L[k].data && insight(k)));
}

// Nearest mapped bins to a report, for the link lines on the map. Empty until the layer loads.
export function nearestBins(r, n = 3) {
  if (!L.bins.on || !L.bins.data) return [];
  return L.bins.data
    .filter((p) => Math.abs(p.lat - r.lat) < 0.03 && Math.abs(p.lng - r.lng) < 0.03)
    .map((p) => ({ ...p, d: haversine(r, p) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n);
}

export function attachLayers(m) {
  map = m;
  map.addSource("ly-cells", { type: "geojson", data: EMPTY });
  map.addSource("ly-bins", { type: "geojson", data: EMPTY });
  map.addSource("ly-csv", { type: "geojson", data: EMPTY });
  map.addLayer({ id: "ly-cells", type: "fill", source: "ly-cells", paint: { "fill-color": ["get", "c"], "fill-opacity": 0.55, "fill-outline-color": "rgba(16,35,26,.25)" } }, "clusters");
  map.addLayer({
    id: "ly-cells-label",
    type: "symbol",
    source: "ly-cells",
    layout: { "text-field": ["get", "t"], "text-font": ["Noto Sans Bold"], "text-size": 11 },
    paint: { "text-color": "#10231A", "text-halo-color": "#FFFFFF", "text-halo-width": 1.5 },
  });
  map.addLayer({
    id: "ly-bins",
    type: "circle",
    source: "ly-bins",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 1.6, 15, 4.5],
      "circle-color": ["match", ["get", "k"], "recycling", "#1FA34A", "waste_disposal", "#10231A", "landfill", "#10231A", "#FFFFFF"],
      "circle-stroke-color": "#10231A",
      "circle-stroke-width": 1.2,
    },
  });
  map.addLayer({
    id: "ly-csv",
    type: "circle",
    source: "ly-csv",
    paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 3, 15, 7], "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": "#1FA34A", "circle-stroke-width": 2 },
  });
}

function toggle(k) {
  if (k === "csv" && !L.csv.data) return $("#ly-file").click();
  L[k].on = !L[k].on;
  if (L[k].on && (k === "air" || k === "rain")) {
    const other = k === "air" ? "rain" : "air";
    if (L[other].on) (L[other].on = false), paintRow(other);
  }
  paintRow(k);
  if (L[k].on) fetchLayer(k);
  else draw();
}

function paintRow(k) {
  const el = $(`.ly[data-k="${k}"]`);
  el.classList.toggle("on", L[k].on);
  el.querySelector(".ly-row").setAttribute("aria-pressed", L[k].on);
  if (!L[k].on) $(`#ly-note-${k}`).innerHTML = "";
}

function note(k, html) {
  $(`#ly-note-${k}`).innerHTML = html;
}

async function fetchLayer(k) {
  if (!S.city) return;
  if (L[k].data) return draw(), insight(k);
  note(k, `<span class="muted loading">${k === "bins" ? "Asking OpenStreetMap for every mapped bin in the city. This can take up to a minute." : "Loading…"}</span>`);
  try {
    if (k === "bins") L.bins.data = await getBins();
    if (k === "air" || k === "rain") L[k].data = await getGrid(k);
    draw();
    insight(k);
  } catch (e) {
    note(k, `<span class="muted">Couldn't load this source right now.</span>`);
    console.warn("[DumpSpot] layer", k, e);
  }
}

// ── Sources ───────────────────────────────────────────────────────────
async function getBins() {
  const [w, s, e, n] = S.city.bbox;
  const bb = `${s},${w},${n},${e}`;
  const key = "ds.bins." + bb.split(",").map((x) => (+x).toFixed(3)).join(",");
  try {
    const c = JSON.parse(localStorage.getItem(key));
    if (c && Date.now() - c.at < 864e5) return c.pts;
  } catch {}
  const q = `[out:json][timeout:60];(node["amenity"="waste_basket"](${bb});node["amenity"="recycling"](${bb});node["amenity"="waste_disposal"](${bb});way["landuse"="landfill"](${bb}););out center qt 8000;`;
  // Main Overpass instance first, then an open community mirror if it's busy.
  let j = null, last = null;
  for (const host of ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]) {
    try {
      const r = await fetch(host, { method: "POST", body: "data=" + encodeURIComponent(q) });
      if (!r.ok) throw new Error("overpass " + r.status);
      j = await r.json();
      break;
    } catch (e) {
      last = e;
    }
  }
  if (!j) throw last;
  const pts = j.elements
    .map((el) => ({ lat: el.lat ?? el.center?.lat, lng: el.lon ?? el.center?.lon, k: el.tags?.amenity || el.tags?.landuse }))
    .filter((p) => p.lat != null);
  // cache a day per city: OpenStreetMap bins don't change by the minute, and Overpass is a shared free service
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), pts }));
  } catch {}
  return pts;
}

const GRID = 6;
function gridCells() {
  const [w, s, e, n] = S.city.bbox;
  const cells = [];
  for (let i = 0; i < GRID; i++)
    for (let j = 0; j < GRID; j++) {
      const x0 = w + ((e - w) * i) / GRID, x1 = w + ((e - w) * (i + 1)) / GRID;
      const y0 = s + ((n - s) * j) / GRID, y1 = s + ((n - s) * (j + 1)) / GRID;
      cells.push({ ring: [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]], lat: (y0 + y1) / 2, lng: (x0 + x1) / 2, b: [x0, y0, x1, y1] });
    }
  return cells;
}

async function getGrid(k) {
  const cells = gridCells();
  const lat = cells.map((c) => c.lat.toFixed(4)).join(","), lng = cells.map((c) => c.lng.toFixed(4)).join(",");
  const url =
    k === "air"
      ? `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=pm2_5`
      : `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=precipitation_sum&past_days=7&forecast_days=1&timezone=auto`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("open-meteo " + r.status);
  let j = await r.json();
  if (!Array.isArray(j)) j = [j];
  cells.forEach((c, i) => {
    const d = j[i] || {};
    c.v = k === "air" ? d.current?.pm2_5 ?? null : (d.daily?.precipitation_sum || []).slice(0, 7).reduce((a, x) => a + (x || 0), 0);
  });
  return cells;
}

// ── Draw ──────────────────────────────────────────────────────────────
// Air goes from clean (white) through pale to deep violet as it gets worse. Rain is water: sky blues.
const airColor = (v) => (v == null ? "#E6E9E2" : v <= 15 ? "#FFFFFF" : v <= 35 ? "#D9D2FB" : v <= 55 ? "#9B87F0" : "#5B3FD6");
const rainColor = (v) => (v == null ? "#E6E9E2" : v < 1 ? "#FFFFFF" : v < 10 ? "#DDF0FD" : v < 40 ? "#8FD0FA" : "#2B8FD6");

function draw() {
  if (!map) return;
  const grid = L.air.on ? ["air", L.air.data] : L.rain.on ? ["rain", L.rain.data] : null;
  map.getSource("ly-cells").setData(
    grid && grid[1]
      ? {
          type: "FeatureCollection",
          features: grid[1].map((c) => ({
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [c.ring] },
            properties: { c: grid[0] === "air" ? airColor(c.v) : rainColor(c.v), t: c.v == null ? "" : grid[0] === "air" ? Math.round(c.v) + "" : Math.round(c.v) + " mm" },
          })),
        }
      : EMPTY,
  );
  map.getSource("ly-bins").setData(L.bins.on && L.bins.data ? fc(L.bins.data, (p) => ({ k: p.k })) : EMPTY);
  map.getSource("ly-csv").setData(L.csv.on && L.csv.data ? fc(L.csv.data, () => ({})) : EMPTY);
}
const fc = (pts, props) => ({ type: "FeatureCollection", features: pts.map((p) => ({ type: "Feature", geometry: { type: "Point", coordinates: [p.lng, p.lat] }, properties: props(p) })) });

// ── Insights: each overlay says something about the reports ───────────
function nearestKm(r, pts) {
  let best = Infinity;
  for (const p of pts) {
    if (Math.abs(p.lat - r.lat) > 0.02 || Math.abs(p.lng - r.lng) > 0.02) continue;
    best = Math.min(best, haversine(r, p));
  }
  return best;
}
const cellOf = (cells, r) => cells.find((c) => r.lng >= c.b[0] && r.lng < c.b[2] && r.lat >= c.b[1] && r.lat < c.b[3]);

function insight(k) {
  const rows = S.filtered;
  const d = L[k].data;
  if (k === "bins") {
    const bins = d.filter((p) => p.k === "waste_basket").length, rec = d.filter((p) => p.k === "recycling").length, dump = d.length - bins - rec;
    let line = "";
    if (rows.length) {
      const far = rows.filter((r) => nearestKm(r, d) > 0.25).length;
      line = `<p><b>${Math.round((far / rows.length) * 100)}%</b> of reports are more than 250 m from any mapped bin or recycling point.</p>`;
    }
    note(k, `<div class="ly-stats"><span><i class="dot" style="background:#fff;border:1px solid var(--soot)"></i>${fmtN(bins)} bins</span><span><i class="dot" style="background:var(--moss)"></i>${fmtN(rec)} recycling</span><span><i class="dot" style="background:var(--soot)"></i>${fmtN(dump)} dump sites</span></div>${line}<p class="muted small">Only what volunteers have mapped in OpenStreetMap. A gap can mean missing bins or missing mapping.</p>`);
  }
  if (k === "air") {
    const vals = d.map((c) => c.v).filter((v) => v != null);
    const avg = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
    const burn = rows.filter((r) => r.cats.includes("Burning garbage"));
    const burnAvg = burn.length ? burn.map((r) => cellOf(d, r)?.v).filter((v) => v != null).reduce((a, b, _, arr) => a + b / arr.length, 0) : null;
    note(k, `<p>City average <b>${avg.toFixed(0)} µg/m³</b> PM2.5 right now (WHO 24-hour guideline: 15).</p>${burn.length ? `<p>Cells with burning-garbage reports average <b>${burnAvg.toFixed(0)} µg/m³</b>.</p>` : ""}${legend([["≤15", "#FFFFFF"], ["≤35", "#D9D2FB"], ["≤55", "#9B87F0"], [">55", "#5B3FD6"]])}<p class="muted small">Modelled at ~10 km resolution, so cells are a broad picture, not a street sensor.</p>`);
  }
  if (k === "rain") {
    const vals = d.map((c) => c.v).filter((v) => v != null);
    const avg = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
    const week = Date.now() - 7 * 864e5;
    const sew = rows.filter((r) => r.cats.includes("Nala / Sewage") && +new Date(r.ts) >= week).length;
    note(k, `<p><b>${avg.toFixed(0)} mm</b> of rain on average across the city in the last 7 days. <b>${sew}</b> nala / sewage report${sew === 1 ? "" : "s"} in the same week.</p>${legend([["<1", "#FFFFFF"], ["<10", "#DDF0FD"], ["<40", "#8FD0FA"], ["40+", "#2B8FD6"]], "mm")}`);
  }
  if (k === "csv") {
    const near = rows.filter((r) => nearestKm(r, d) <= 0.25).length;
    note(k, `<p><b>${fmtN(d.length)}</b> points from <b>${esc(L.csv.file)}</b>. <b>${near}</b> of ${rows.length} reports are within 250 m of one.</p><button class="link-btn" id="ly-replace">Load another file</button>`);
    $("#ly-replace")?.addEventListener("click", () => $("#ly-file").click());
  }
}
const legend = (items, unit = "") => `<div class="ly-legend">${items.map(([l, c]) => `<span><i style="background:${c}"></i>${l}${unit ? " " + unit : ""}</span>`).join("")}</div>`;

// ── Your own file ─────────────────────────────────────────────────────
async function loadFile(file) {
  const txt = await file.text();
  let pts = [];
  try {
    if (/\.(geo)?json$/i.test(file.name) || txt.trim().startsWith("{")) {
      const j = JSON.parse(txt);
      const feats = j.features || (j.type === "Feature" ? [j] : []);
      for (const f of feats) {
        const g = f.geometry;
        if (g?.type === "Point") pts.push({ lng: g.coordinates[0], lat: g.coordinates[1] });
      }
    } else {
      const lines = txt.split(/\r?\n/).filter(Boolean);
      const head = splitCsv(lines[0]).map((h) => h.trim().toLowerCase());
      const li = head.findIndex((h) => ["lat", "latitude", "y"].includes(h));
      const gi = head.findIndex((h) => ["lng", "lon", "long", "longitude", "x"].includes(h));
      if (li < 0 || gi < 0) throw new Error("Need lat and lng columns");
      for (const line of lines.slice(1)) {
        const c = splitCsv(line);
        const lat = parseFloat(c[li]), lng = parseFloat(c[gi]);
        if (isFinite(lat) && isFinite(lng)) pts.push({ lat, lng });
      }
    }
  } catch (e) {
    return toast(`Couldn't read that file: ${e.message}`, "err");
  }
  if (!pts.length) return toast("No points found. Use a CSV with lat/lng columns, or GeoJSON points.", "err");
  L.csv.data = pts;
  L.csv.file = file.name;
  L.csv.on = true;
  paintRow("csv");
  draw();
  insight("csv");
  $("#ly-file").value = "";
}
function splitCsv(line) {
  const out = [];
  let cur = "", q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === "," && !q) out.push(cur), (cur = "");
    else cur += ch;
  }
  out.push(cur);
  return out;
}
