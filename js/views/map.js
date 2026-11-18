// Explore, told as a scrolling data story. The map stays pinned while you read; each
// section is a step that tells the map what to show. Hovering a chart previews it on the
// map, clicking commits it as a filter. See DESIGN.md §9 (Interaction).
import { $, $$, esc, ago, fmtN, clamp } from "../lib/util.js";
import { hexBin, padBBox, encodeDigipin, formatDigipin } from "../lib/geo.js";
import { S, on, toggleCat, applyFilters } from "../core/state.js";
import { CATS, catMeta, sevRank, sevLabel, SEV_COLORS, normName } from "../data/derive.js";
import { ICONS, catIcon } from "../ui/icons.js";
import { go, registerView } from "../ui/shell.js";
import { mountTimeline } from "./timeline.js";
import { mapStyle } from "./mapstyle.js";
import { mountLayers, attachLayers, nearestBins } from "./layers.js";
import { thumbs } from "../ui/seg.js";

let map = null, ready = false, is3d = false;
let clusters = [], annos = [], step = "", focus = null, story = {};
const EMPTY = { type: "FeatureCollection", features: [] };
const DIM = "#C9D2DE", HOT = "#2448D8", INK = "#10231A";

export function initMap() {
  $("#v-map").innerHTML = `
  <article class="story">
    <header class="story-head">
      <div class="story-top">
        <p class="kicker" id="s-kicker"></p>
        <div class="seg" role="tablist" aria-label="Show as">
          <button class="on" data-goto="map">Story</button><button data-goto="ledger">All reports</button><span class="seg-thumb"></span>
        </div>
      </div>
      <h1 class="story-h" id="s-h"></h1>
      <p class="story-dek" id="s-dek"></p>
      <p class="story-meta" id="s-meta"></p>
    </header>

    <div class="scrolly">
      <div class="scrolly-map">
        <div class="fig-map">
          <div id="map" class="map"></div>
          <div class="fig-tools">
            <button class="icon-plate" id="t-3d" title="Tilt into 3D" aria-pressed="false">3D</button>
            <button class="icon-plate" id="t-fit" title="Show the whole city">${ICONS.target}</button>
          </div>
          <button class="fig-full" id="t-full" title="Full screen (F)" aria-pressed="false"><svg class="i-exp" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg><svg class="i-col" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 2.5V6H2.5M13.5 6H10V2.5M10 13.5V10h3.5M2.5 10H6v3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Full screen</span></button>
          <div class="fig-coord" id="fig-coord" aria-hidden="true"></div>
          <div class="fig-legend" id="fig-legend"></div>
          <div class="map-tip plate" id="map-tip"></div>
        </div>
      </div>

      <div class="scrolly-steps" id="steps">
        <section class="step-card" data-step="overview">
          <p class="label">The city</p>
          <h2>Where reports gather</h2>
          <p id="st-overview"></p>
        </section>
        <section class="step-card" data-step="what">
          <p class="label">What</p>
          <h2>What gets reported</h2>
          <p class="sec-dek">Hover to see it on the map.</p>
          <div class="bars" id="d-cats"></div>
        </section>
        <section class="step-card" data-step="when">
          <p class="label">When</p>
          <h2>When it happens</h2>
          <p class="sec-dek" id="st-when"></p>
          <div class="tl-wrap" id="timeline"></div>
        </section>
        <section class="step-card" data-step="where">
          <p class="label">Where</p>
          <h2>Where it keeps happening</h2>
          <p class="sec-dek">Hover a place to see its reach.</p>
          <ol class="worst" id="worst"></ol>
        </section>
        <section class="step-card" data-step="compare">
          <p class="label">Context</p>
          <h2>Compare with open data</h2>
          <p class="sec-dek">Add bins, air quality, rain or your own file on top.</p>
          <div class="plate" id="layers"></div>
        </section>
      </div>
    </div>

    <section class="story-cta" id="cta"></section>
    <p class="story-src">Reports come from residents using DumpSpot. Map data © OpenStreetMap contributors, tiles by OpenFreeMap. Air and rain from Open-Meteo.</p>
  </article>`;

  mountTimeline($("#timeline"));
  mountLayers($("#layers"));
  $$("#v-map [data-goto]").forEach((b) => b.addEventListener("click", () => go(b.dataset.goto)));
  $("#t-3d").addEventListener("click", toggle3d);
  $("#t-fit").addEventListener("click", () => fitCity(true));
  $("#t-full").addEventListener("click", () => setFull(!full));
  document.addEventListener("keydown", (e) => {
    if (document.body.dataset.view !== "map" || e.target.matches("input, textarea")) return;
    if (e.key === "Escape" && full) setFull(false);
    if (e.key.toLowerCase() === "f" && !e.metaKey && !e.ctrlKey) setFull(!full);
  });
  // Only leave our full mode when the browser's own full screen ends after we really entered it.
  let inFS = false;
  document.addEventListener("fullscreenchange", () => {
    if (document.fullscreenElement) inFS = true;
    else if (inFS) (inFS = false), full && setFull(false, true);
  });

  // Steps: whichever card crosses the middle of the screen drives the map.
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && setStep(e.target.dataset.step)),
    { rootMargin: "-45% 0px -45% 0px" },
  );
  $$(".step-card").forEach((s) => io.observe(s));

  const refresh = () => {
    pushData();
    renderStory();
  };
  on("data", refresh);
  on("filter", refresh);
  on("city", () => {
    if (!map) return;
    applyCityFrame();
    // Arriving from the globe: pick up where the globe dive ended (wide, centred on the city) and keep flying in.
    if (S.arriving) map.jumpTo({ center: [S.city.lng, S.city.lat], zoom: 4, pitch: 0, bearing: 0 });
    fitCity(true);
  });

  registerView("map", {
    enter() {
      if (!map && S.city) boot();
      else if (map) setTimeout(() => map.resize(), 30);
      setTimeout(thumbs, 30);
      renderStory();
    },
  });
}

// ── Story text, written from the data ────────────────────────────────
function topPlaces(rows) {
  const g = new Map();
  for (const r of rows) {
    const k = normName(r.specific);
    if (!g.has(k)) g.set(k, { name: r.specific, items: [] });
    g.get(k).items.push(r);
  }
  return [...g.values()].sort((a, b) => b.items.length - a.items.length);
}

function renderStory() {
  const c = S.city;
  if (!c) return;
  const all = S.inCity, rows = S.filtered;
  const n = all.length;
  const week = all.filter((r) => Date.now() - new Date(r.ts) < 7 * 864e5).length;
  const people = new Set(all.map((r) => normName(r.reporter))).size;
  const last = all[0]?.ts;
  const catCounts = CATS.map((k) => [k, all.filter((r) => r.cats.includes(k.key)).length]).sort((a, b) => b[1] - a[1]);
  const places = topPlaces(all);
  const repeat = places.filter((p) => p.items.length > 1);
  story = { top: catCounts[0]?.[1] ? catCounts[0][0] : null, place: repeat[0] || null, week };
  $("#s-kicker").textContent = `${c.name}${c.state ? ", " + c.state : ""}`;

  let h, dek;
  if (S.offline) {
    h = `${esc(c.name)}: reports are <b class="off-word">offline</b>.`;
    dek = "Bins, air and rain still work. Scroll down.";
  } else if (!n) {
    h = `Nothing reported in ${c.name} yet.`;
    dek = "Nobody has reported anything here yet.";
  } else {
    h = `${fmtN(n)} spots reported in ${c.name}. ${repeat.length ? `${repeat.length} ${repeat.length === 1 ? "place keeps" : "places keep"} coming back.` : "Each one is on the record."}`;
    dek = `${story.top ? `${story.top.label} is reported most, in ${Math.round((catCounts[0][1] / n) * 100)}% of reports. ` : ""}${story.place ? `${story.place.name} alone has ${story.place.items.length} reports. ` : ""}${week ? `${week} new this week.` : "Nothing new this week."}`;
  }
  $("#s-h").innerHTML = S.offline ? h : esc(h);
  $("#s-dek").textContent = dek;
  $("#s-meta").textContent = n ? `Updated ${ago(last)}. ${people} ${people === 1 ? "person" : "people"} reporting. ` : "";

  const hasData = n > 0;
  $$('.step-card:not([data-step="compare"])').forEach((s) => (s.hidden = !hasData));
  $("#st-overview").textContent = hasData
    ? `Each circle groups the reports within about half a kilometre. Bigger means more of them, darker means worse. ${((n) => (n === 0 ? "No spot has" : n === 1 ? "One spot has" : n + " spots have"))(clusters.filter((h) => h.items.length >= 3).length)} three or more.`
    : "";
  $("#st-when").textContent = hasData
    ? `${week ? `${week} reports came in over the last seven days, marked in rust on the map.` : "Nothing new this week."} Drag across the chart to focus on any stretch of time.`
    : "";
  $("#fig-legend").hidden = !hasData;
  legendFor(focus);

  if (hasData) {
    renderBars();
    renderWorst(rows);
  }
  renderCta(n, week, last);
}

function renderBars() {
  const base = S.inCity.filter((r) => !S.range || (+new Date(r.ts) >= S.range[0] && +new Date(r.ts) <= S.range[1]));
  const counts = CATS.map((k) => ({ ...k, n: base.filter((r) => r.cats.includes(k.key)).length })).filter((k) => k.n);
  const max = Math.max(1, ...counts.map((k) => k.n));
  $("#d-cats").innerHTML =
    counts
      .sort((a, b) => b.n - a.n)
      .map(
        (k) => `<button class="bar-row ${S.cats.has(k.key) ? "on" : ""} ${S.cats.size && !S.cats.has(k.key) ? "dim" : ""}" data-k="${esc(k.key)}" aria-pressed="${S.cats.has(k.key)}">
        <span class="bar-l">${esc(k.label)}</span>
        <span class="bar-t"><b style="width:${(k.n / max) * 100}%"></b></span>
        <span class="bar-n">${k.n}</span></button>`,
      )
      .join("") + (S.cats.size ? `<button class="link-btn" id="cat-clear">Show everything again</button>` : "");
  $$("#d-cats .bar-row").forEach((b) => {
    const k = b.dataset.k;
    b.addEventListener("mouseenter", () => preview({ kind: "cat", key: k }));
    b.addEventListener("focus", () => preview({ kind: "cat", key: k }));
    b.addEventListener("mouseleave", () => preview(null));
    b.addEventListener("blur", () => preview(null));
    b.addEventListener("click", () => toggleCat(k));
  });
  $("#cat-clear")?.addEventListener("click", () => {
    S.cats.clear();
    applyFilters();
  });
}

function renderWorst(rows) {
  const places = topPlaces(rows).filter((p) => p.items.length > 1).slice(0, 6);
  const max = Math.max(1, ...places.map((p) => p.items.length));
  $("#worst").innerHTML = places.length
    ? places
        .map(
          (p, i) => `<li><button data-i="${i}">
          <span class="w-name">${esc(p.name)}</span>
          <span class="w-bar"><b style="width:${(p.items.length / max) * 100}%;background:${SEV_COLORS[Math.max(...p.items.map((r) => sevRank(r.sev)))]}"></b></span>
          <span class="w-n">${p.items.length}</span>
          <span class="w-last">last ${ago(p.items[0].ts)}</span></button></li>`,
        )
        .join("")
    : `<li class="muted t-small">No repeat spots yet.</li>`;
  $$("#worst button").forEach((b) => {
    const p = places[+b.dataset.i];
    b.addEventListener("mouseenter", () => highlight(p.items[0].id));
    b.addEventListener("focus", () => highlight(p.items[0].id));
    b.addEventListener("mouseleave", () => step === "where" ? showWhere() : highlight(null));
    b.addEventListener("click", () => flyToReport(p.items[0]));
  });
}

function renderCta(n, week, last) {
  const c = S.city;
  $("#cta").innerHTML = S.offline
    ? ""
    : `<h2>${n ? "Seen a spot that isn't here?" : `Be the first in ${esc(c.name)}.`}</h2>
       <p>${n ? `${week ? `${week} ${week === 1 ? "report" : "reports"} came in this week.` : "No one has reported this week."} The last report was ${ago(last)}. ` : ""}A report takes about a minute: a photo, a pin and your name. It puts the problem on the record for everyone to see, and earns a tree that the gardener plants.</p>
       <a class="sign sign-report" href="#/report"><svg class="i-plus" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>Report a spot</a>`;
}

// ── Steps: what each section asks the map to show ───────────────────
function setStep(name) {
  if (step === name) return;
  step = name;
  $$(".step-card").forEach((s) => s.classList.toggle("active", s.dataset.step === name));
  // Decide the focus even before the map is ready, so it applies the moment it loads.
  focus = name === "what" && story.top ? { kind: "cat", key: story.top.key } : name === "when" ? { kind: "recent" } : null;
  if (!ready) return;
  highlight(null);
  if (name === "where") showWhere();
  else fitCity(true);
  applyFocus(focus);
}

function showWhere() {
  const p = story.place;
  if (!p || !ready) return;
  highlight(p.items[0].id);
  map.flyTo({ center: [p.items[0].lng, p.items[0].lat], zoom: 14.2, duration: 1400, essential: true });
}

// A preview is temporary (hover); the step's own focus comes back on leave.
function preview(f) {
  applyFocus(f || focus);
}

// The legend always explains what the map is showing right now.
function legendFor(f) {
  const el = $("#fig-legend");
  if (!el || !S.inCity.length) return;
  const sw = (c, t, round = true) => `<span><i style="background:${c};${round ? "" : "border-radius:0"}"></i>${esc(t)}</span>`;
  if (!f) el.innerHTML = `<span class="label">Worst problem reported</span>${[1, 2, 3, 4].map((i) => sw(SEV_COLORS[i], sevLabel(i))).join("")}`;
  else if (f.kind === "cat") el.innerHTML = `<span class="label">Showing</span>${sw(HOT, catMeta(f.key).label)}${sw(DIM, "Everything else")}`;
  else el.innerHTML = `<span class="label">Showing</span>${sw(HOT, "Last 7 days")}${sw(DIM, "Earlier")}`;
}

function applyFocus(f) {
  if (!ready) return;
  legendFor(f);
  if (!f) {
    map.setPaintProperty("clusters", "circle-opacity", ["interpolate", ["linear"], ["zoom"], 13, 0.85, 14.5, 0]);
    map.setPaintProperty("pts", "icon-opacity", ["interpolate", ["linear"], ["zoom"], 12.5, 0, 13.5, 1]);
    map.setPaintProperty("pts", "icon-color", ["case", [">=", ["get", "sev"], 3], HOT, INK]);
    placeAnnotations();
    return;
  }
  const cond = f.kind === "cat" ? ["in", f.key, ["get", "cats"]] : ["==", ["get", "recent"], 1];
  map.setPaintProperty("clusters", "circle-opacity", 0.12);
  map.setPaintProperty("pts", "icon-opacity", ["case", cond, 1, 0.35]);
  map.setPaintProperty("pts", "icon-color", ["case", cond, HOT, DIM]);
  annos.forEach((m) => m.remove());
  annos = [];
}

// ── Map ──────────────────────────────────────────────────────────────
function boot() {
  if (typeof maplibregl === "undefined") return;
  const c = S.city;
  map = new maplibregl.Map({
    container: "map",
    style: mapStyle(),
    center: [c.lng, c.lat],
    zoom: S.arriving ? 4 : 10.5,
    pitch: 0,
    maxPitch: 70,
    attributionControl: false,
    cooperativeGestures: true,
  });
  if (["localhost", "127.0.0.1"].includes(location.hostname)) window.__map = map;
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: "metric" }), "bottom-right");
  map.on("load", () => {
    ready = true;
    addLayers();
    attachLayers(map);
    applyCityFrame();
    pushData();
    renderStory();
    fitCity(!!S.arriving);
    // Plotter reveal: the frame, then the circles, ink in after the city is drawn.
    requestAnimationFrame(() => {
      applyFocus(focus);
      if (step === "where") showWhere();
    });
  });
  map.on("moveend", () => !focus && placeAnnotations());
  map.on("mousemove", (e) => {
    const { lat, lng } = e.lngLat;
    const dp = encodeDigipin(lat, lng);
    $("#fig-coord").textContent = `${Math.abs(lat).toFixed(5)}°${lat >= 0 ? "N" : "S"}  ${Math.abs(lng).toFixed(5)}°${lng >= 0 ? "E" : "W"}${dp ? "  ·  " + formatDigipin(dp) : ""}`;
  });
  map.on("mouseout", () => ($("#fig-coord").textContent = ""));
}

function addLayers() {
  ["mask", "frame", "clusters", "pts", "sel", "rings", "links", "prisms"].forEach((s) => map.addSource(s, { type: "geojson", data: EMPTY }));
  map.addImage("asterisk", asterisk(), { sdf: true, pixelRatio: 2 });
  const sevColor = ["match", ["get", "sev"], 1, SEV_COLORS[1], 2, SEV_COLORS[2], 3, SEV_COLORS[3], 4, SEV_COLORS[4], SEV_COLORS[0]];

  map.addLayer({ id: "mask", type: "fill", source: "mask", paint: { "fill-color": "#FFFFFF", "fill-opacity": 0 } });
  // Zoomed in, every hotspot becomes a glass hexagon prism standing in the street grid:
  // taller is more reports, darker is worse. It grows out of the ground between zoom 12.5 and 14.
  map.addLayer({
    id: "prisms",
    type: "fill-extrusion",
    source: "prisms",
    minzoom: 12,
    paint: {
      "fill-extrusion-color": ["match", ["get", "sev"], 1, SEV_COLORS[1], 2, SEV_COLORS[2], 3, SEV_COLORS[3], 4, SEV_COLORS[4], "#C7D1F6"],
      "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 12.5, 0, 14, ["*", 70, ["get", "n"]]],
      "fill-extrusion-base": 0,
      "fill-extrusion-opacity": ["interpolate", ["linear"], ["zoom"], 12, 0, 13.5, 0.78],
      "fill-extrusion-vertical-gradient": true,
    },
  });
  map.addLayer({
    id: "prism-rims",
    type: "line",
    source: "prisms",
    minzoom: 12.5,
    paint: { "line-color": "#2448D8", "line-width": 1.5, "line-opacity": ["interpolate", ["linear"], ["zoom"], 12.5, 0, 14, 0.9] },
  });
  map.addLayer({
    id: "frame",
    type: "line",
    source: "frame",
    paint: { "line-color": INK, "line-width": 1, "line-opacity": 0, "line-opacity-transition": { duration: 700 }, "line-dasharray": [3, 3] },
  });
  map.addLayer({
    id: "clusters",
    type: "circle",
    source: "clusters",
    paint: {
      "circle-color": sevColor,
      "circle-opacity": 0,
      "circle-opacity-transition": { duration: 600, delay: 300 },
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, ["+", 2, ["*", 2.6, ["sqrt", ["get", "n"]]]], 13, ["+", 4, ["*", 5.2, ["sqrt", ["get", "n"]]]]],
      "circle-stroke-color": "#FFFFFF",
      "circle-stroke-width": 1,
    },
  });
  map.addLayer({ id: "rings", type: "line", source: "rings", filter: ["==", ["geometry-type"], "LineString"], paint: { "line-color": "#2448D8", "line-width": 1, "line-dasharray": [3, 2] } });
  map.addLayer({ id: "links", type: "line", source: "links", paint: { "line-color": "#2448D8", "line-width": 2 } });
  map.addLayer({
    id: "ring-labels",
    type: "symbol",
    source: "rings",
    filter: ["==", ["geometry-type"], "Point"],
    layout: { "text-field": ["get", "t"], "text-font": ["Noto Sans Regular"], "text-size": 10, "text-allow-overlap": true },
    paint: { "text-color": INK, "text-halo-color": "#FFFFFF", "text-halo-width": 2 },
  });
  map.addLayer({
    id: "pts",
    type: "symbol",
    source: "pts",
    layout: { "icon-image": "asterisk", "icon-anchor": "bottom", "icon-size": ["interpolate", ["linear"], ["zoom"], 9, 0.45, 13, 0.7, 17, 1], "icon-allow-overlap": true },
    paint: { "icon-color": INK, "icon-halo-color": "#FFFFFF", "icon-halo-width": 1.5, "icon-opacity": 0, "icon-opacity-transition": { duration: 300 }, "icon-color-transition": { duration: 300 } },
  });
  map.addLayer({ id: "sel", type: "circle", source: "sel", paint: { "circle-color": "rgba(0,0,0,0)", "circle-radius": 12, "circle-stroke-color": INK, "circle-stroke-width": 1.5 } });

  const tip = $("#map-tip");
  const showTip = (html, e) => {
    tip.innerHTML = html;
    const r = $("#map").getBoundingClientRect();
    tip.style.transform = `translate(${clamp(e.point.x + 14, 8, r.width - 250)}px, ${clamp(e.point.y + 14, 8, r.height - 120)}px)`;
    tip.classList.add("on");
  };
  const hideTip = () => {
    map.getCanvas().style.cursor = "";
    tip.classList.remove("on");
  };
  map.on("mousemove", "pts", (e) => {
    const r = S.all.find((x) => x.id === e.features[0].properties.id);
    if (!r) return;
    map.getCanvas().style.cursor = "pointer";
    const sv = sevRank(r.sev);
    showTip(`${r.photos?.[0] ? `<img class="tip-img" src="${esc(r.photos[0])}" alt="">` : ""}
      <div class="tip-b">
        <div class="tip-k">${catIcon(r.cats[0])}<span>${esc(catMeta(r.cats[0]).label)}</span><i class="tip-sev" style="--c:${SEV_COLORS[sv]}">${sevLabel(sv)}</i></div>
        <div class="tip-t">${esc(r.specific)}</div>
        <div class="tip-m">${esc(r.area)} · ${ago(r.ts)}</div>
      </div>`, e);
  });
  map.on("mouseleave", "pts", hideTip);
  map.on("click", "pts", (e) => go("r/" + encodeURIComponent(e.features[0].properties.id)));
  map.on("mousemove", "clusters", (e) => {
    if (focus || map.queryRenderedFeatures(e.point, { layers: ["pts"] }).length) return;
    const p = e.features[0].properties;
    map.getCanvas().style.cursor = "zoom-in";
    const h = clusters.find((c) => c.name === p.name && c.items.length === p.n);
    const mix = [0, 0, 0, 0, 0], kinds = new Map();
    (h?.items || []).forEach((r) => {
      mix[sevRank(r.sev)]++;
      const c = r.cats[0] || "Mixed / general";
      kinds.set(c, (kinds.get(c) || 0) + 1);
    });
    const top = [...kinds].sort((a, b) => b[1] - a[1]).slice(0, 3);
    showTip(`<div class="tip-b">
        <div class="tip-big"><b>${p.n}</b><span>${p.n === 1 ? "report" : "reports"} around<br><strong>${esc(p.name)}</strong></span></div>
        <div class="tip-mix">${mix.map((n, i) => (n ? `<i style="flex:${n};background:${SEV_COLORS[i]}"></i>` : "")).join("")}</div>
        <div class="tip-kinds">${top.map(([c, n]) => `<span>${catIcon(c)}${esc(catMeta(c).label)} <em>${n}</em></span>`).join("")}</div>
        <div class="tip-hint">Click to zoom in</div>
      </div>`, e);
  });
  map.on("mouseleave", "clusters", hideTip);
  map.on("click", "clusters", (e) => {
    if (focus || map.queryRenderedFeatures(e.point, { layers: ["pts"] }).length) return;
    map.flyTo({ center: JSON.parse(e.features[0].properties.c), zoom: Math.max(map.getZoom() + 2, 14.5), duration: 1200 });
  });
}

function applyCityFrame() {
  if (!ready || !S.city) return;
  const b = padBBox(S.city.bbox, 0.12);
  const ring = [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]], [b[0], b[1]]];
  map.getSource("mask").setData({ type: "Feature", geometry: { type: "Polygon", coordinates: [[[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]], ring.slice().reverse()] } });
  map.getSource("frame").setData({ type: "Feature", geometry: { type: "LineString", coordinates: ring } });
  const out = padBBox(S.city.bbox, 1.4);
  bounds = [[out[0], out[1]], [out[2], out[3]]];
  map.setMaxBounds(null);
}

let bounds = null;
function fitCity(animate) {
  if (!map || !S.city) return;
  const b = S.city.bbox;
  const arriving = !!S.arriving;
  S.arriving = false;
  map.stop();
  if (arriving && !is3d) {
    // Arriving from the globe lands in 3D: buildings up, camera tilted.
    is3d = true;
    $("#t-3d")?.classList.add("on");
    $("#t-3d")?.setAttribute("aria-pressed", true);
    map.setLayoutProperty("building", "visibility", "visible");
  }
  const cam = map.cameraForBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 32, maxZoom: 13 });
  const opts = { ...cam, zoom: arriving ? Math.min(13.2, cam.zoom + 0.6) : cam.zoom, pitch: is3d ? 52 : 0, bearing: is3d ? -18 : 0, essential: true };
  if (!animate) map.jumpTo(opts);
  // Straight in: no zoom-out arc, fast start, soft landing.
  else map.flyTo({ ...opts, duration: arriving ? 1500 : 1100, curve: 1, easing: (t) => 1 - Math.pow(1 - t, 4) });
  map.once("moveend", () => bounds && map.setMaxBounds(bounds));
}

function pushData() {
  if (!ready || !S.city) return;
  const rows = S.filtered;
  const now = Date.now();
  map.getSource("pts").setData({
    type: "FeatureCollection",
    features: rows.map((r) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [r.lng, r.lat] },
      properties: { id: r.id, sev: sevRank(r.sev), cats: (r.cats || []).join("|"), recent: now - new Date(r.ts) < 7 * 864e5 ? 1 : 0 },
    })),
  });
  const span = (S.city.bbox[2] - S.city.bbox[0]) * 111 * Math.cos((S.city.lat * Math.PI) / 180);
  const size = clamp((span * 1000) / 36, 300, 900);
  clusters = hexBin(rows, S.city, size).map((h) => ({ ...h, name: topPlaces(h.items)[0].name, sev: Math.max(...h.items.map((r) => sevRank(r.sev))) }));
  map.getSource("clusters").setData({
    type: "FeatureCollection",
    features: clusters.map((h) => ({ type: "Feature", geometry: { type: "Point", coordinates: h.center }, properties: { n: h.items.length, sev: h.sev, name: h.name, c: JSON.stringify(h.center) } })),
  });
  map.getSource("prisms").setData({ type: "FeatureCollection", features: clusters.map((h) => hexagon(h.center, Math.min(140, 60 + h.items.length * 12), { n: h.items.length, sev: h.sev })) });
  if (!focus) placeAnnotations();
}

// A flat-topped hexagon of radius r metres around [lng, lat].
function hexagon([lng, lat], r, props) {
  const kx = 111320 * Math.cos((lat * Math.PI) / 180), ky = 110540, ring = [];
  for (let i = 0; i <= 6; i++) {
    const a = (Math.PI / 3) * (i % 6);
    ring.push([lng + (Math.cos(a) * r) / kx, lat + (Math.sin(a) * r) / ky]);
  }
  return { type: "Feature", geometry: { type: "Polygon", coordinates: [ring] }, properties: props };
}

// Up to three notes on the biggest clusters, like a newspaper graphic. Click one to go there.
function placeAnnotations() {
  annos.forEach((m) => m.remove());
  annos = [];
  if (!ready || focus || map.getZoom() > 13.5) return;
  const b = map.getBounds();
  const top = clusters.filter((h) => h.items.length > 1 && b.contains(h.center)).sort((a, b) => b.items.length - a.items.length).slice(0, 8);
  const placed = [];
  for (const h of top) {
    if (annos.length >= 3) break;
    const p = map.project(h.center);
    if (placed.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 170)) continue;
    placed.push(p);
    const left = annos.length % 2 === 1;
    const el = document.createElement("button");
    el.className = "anno anno-" + (left ? "l" : "r");
    el.setAttribute("aria-label", `${h.name}, ${h.items.length} reports. Zoom in.`);
    el.innerHTML = `<i></i><span><b>${esc(h.name)}</b>${h.items.length} reports</span>`;
    el.addEventListener("click", () => map.flyTo({ center: h.center, zoom: 14.5, duration: 1200 }));
    annos.push(new maplibregl.Marker({ element: el, anchor: left ? "bottom-right" : "bottom-left" }).setLngLat(h.center).addTo(map));
  }
}

// Full screen: the map takes the whole screen (the browser's own full screen where allowed), tilts
// into 3D with buildings, and scroll-zoom works without the two-finger hint. Esc or F brings it back.
let full = false, was3d = false, holder = null;
function setFull(on, fromBrowser) {
  full = on;
  const fig = $(".fig-map.full") || $("#v-map .fig-map");
  // Lift the map out to <body> while full, so no ancestor's transform or sticky context can trap it.
  if (on && fig.parentElement !== document.body) {
    holder = document.createComment("map");
    fig.before(holder);
    document.body.appendChild(fig);
  } else if (!on && holder) {
    holder.replaceWith(fig);
    holder = null;
  }
  fig.classList.toggle("full", on);
  document.body.classList.toggle("map-full", on);
  $("#t-full").setAttribute("aria-pressed", on);
  $("#t-full span").textContent = on ? "Exit full screen" : "Full screen";
  if (on && fig.requestFullscreen && !document.fullscreenElement) fig.requestFullscreen().catch(() => {});
  if (!on && document.fullscreenElement && !fromBrowser) document.exitFullscreen().catch(() => {});
  if (!map) return;
  if (on) {
    was3d = is3d;
    map.cooperativeGestures?.disable?.();
    if (!is3d) toggle3d();
  } else {
    map.cooperativeGestures?.enable?.();
    if (is3d && !was3d) toggle3d();
  }
  setTimeout(() => map.resize(), 60);
  setTimeout(() => map.resize(), 400);
}

function toggle3d() {
  is3d = !is3d;
  $("#t-3d").classList.toggle("on", is3d);
  $("#t-3d").setAttribute("aria-pressed", is3d);
  if (!ready) return;
  map.easeTo({ pitch: is3d ? 55 : 0, bearing: is3d ? -15 : 0, duration: 900 });
}

// The report marker: a map pin with a hollow centre, drawn once as an SDF so MapLibre can tint it
// (by severity) and give it a white halo.
function asterisk() {
  const w = 48, h = 64, c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d");
  x.fillStyle = "#000";
  x.beginPath();
  x.arc(24, 22, 17, Math.PI * 0.82, Math.PI * 2.18);
  x.quadraticCurveTo(34, 40, 24, 58);
  x.quadraticCurveTo(14, 40, 24 - 17 * Math.cos(Math.PI * 0.18), 22 + 17 * Math.sin(Math.PI * 0.18));
  x.closePath();
  x.fill();
  x.globalCompositeOperation = "destination-out";
  x.beginPath();
  x.arc(24, 22, 7, 0, Math.PI * 2);
  x.fill();
  const d = x.getImageData(0, 0, w, h);
  return { width: w, height: h, data: new Uint8Array(d.data.buffer) };
}

// 250 m / 500 m / 1 km rings: how far is this from everything around it, on foot.
function ringsFor(r) {
  const feats = [];
  const kx = 111320 * Math.cos((r.lat * Math.PI) / 180), ky = 110540;
  for (const m of [250, 500, 1000]) {
    const ring = [];
    for (let i = 0; i <= 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      ring.push([r.lng + (Math.cos(a) * m) / kx, r.lat + (Math.sin(a) * m) / ky]);
    }
    feats.push({ type: "Feature", geometry: { type: "LineString", coordinates: ring }, properties: {} });
    feats.push({ type: "Feature", geometry: { type: "Point", coordinates: [r.lng, r.lat + m / ky] }, properties: { t: m < 1000 ? m + " m" : "1 km" } });
  }
  return { type: "FeatureCollection", features: feats };
}

export function highlight(id) {
  if (!ready) return;
  const r = id && S.all.find((x) => x.id === id);
  map.getSource("sel").setData(r ? { type: "Feature", geometry: { type: "Point", coordinates: [r.lng, r.lat] } } : EMPTY);
  map.getSource("rings").setData(r ? ringsFor(r) : EMPTY);
  const bins = r ? nearestBins(r, 3) : [];
  map.getSource("links").setData({
    type: "FeatureCollection",
    features: bins.map((b) => ({ type: "Feature", geometry: { type: "LineString", coordinates: [[r.lng, r.lat], [b.lng, b.lat]] }, properties: {} })),
  });
}

let pending = null;
export function flyToReport(r) {
  if (!r) return;
  if (!map || !ready) {
    pending = r;
    if (map) map.once("idle", () => pending && (flyToReport(pending), (pending = null)));
    return;
  }
  highlight(r.id);
  map.flyTo({ center: [r.lng, r.lat], zoom: 15.5, duration: 1400, essential: true });
}
