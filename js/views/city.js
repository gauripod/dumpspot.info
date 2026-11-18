// City picker. Asked on first load; reopened any time from the top bar or with C.
import { $, esc, debounce, fmtN } from "../lib/util.js";
import { bboxAround } from "../lib/geo.js";
import { S, setCity } from "../core/state.js";
import { citiesFromData } from "../data/derive.js";
import { createGlobe } from "./globe.js";

let globe = null, results = [], active = -1, open = false;

// Always something to click, even before (or without) report data.
const MAJOR = [
  ["New Delhi", "Delhi", 28.6139, 77.209],
  ["Mumbai", "Maharashtra", 19.076, 72.8777],
  ["Bengaluru", "Karnataka", 12.9716, 77.5946],
  ["Pune", "Maharashtra", 18.5204, 73.8567],
  ["Hyderabad", "Telangana", 17.385, 78.4867],
  ["Chennai", "Tamil Nadu", 13.0827, 80.2707],
  ["Kolkata", "West Bengal", 22.5726, 88.3639],
  ["Ahmedabad", "Gujarat", 23.0225, 72.5714],
  ["Jaipur", "Rajasthan", 26.9124, 75.7873],
  ["Lucknow", "Uttar Pradesh", 26.8467, 80.9462],
].map(([name, state, lat, lng]) => ({ name, state, country: "India", lat, lng, bbox: bboxAround(lat, lng, 18), radiusKm: 18, count: 0, source: "major" }));

function cityList() {
  const fromData = citiesFromData(S.all);
  const near = (a, b) => Math.abs(a.lat - b.lat) < 0.4 && Math.abs(a.lng - b.lng) < 0.4;
  const extra = MAJOR.filter((m) => !fromData.some((c) => near(c, m)));
  return [...fromData, ...extra];
}

export function initCity() {
  try {
    globe = createGlobe($("#globe"));
  } catch (e) {
    console.warn("[DumpSpot] WebGL unavailable, globe disabled", e);
  }
  const q = $("#city-q");
  q.addEventListener("input", debounce(() => search(q.value), 280));
  q.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") move(1), e.preventDefault();
    else if (e.key === "ArrowUp") move(-1), e.preventDefault();
    else if (e.key === "Enter") {
      const r = results[active] || results[0];
      if (r) pick(r);
    } else if (e.key === "Escape" && S.city) closeCity();
  });
  $("#city-close").addEventListener("click", closeCity);
  $("#city-btn").addEventListener("click", openCity);
  document.addEventListener("keydown", (e) => {
    if (open && e.key === "Escape" && S.city && document.activeElement !== q) closeCity();
  });
  $("#city-locate").addEventListener("click", locate);
  refreshCityData();
}

export function refreshCityData() {
  const tot = $("#city-total"), tr = $("#city-trees");
  if (tot) tot.textContent = fmtN(S.all.length);
  if (tr) tr.textContent = fmtN(S.trees.length);
  globe?.setReports(S.all);
  const all = cityList();
  const chips = all.slice(0, 10);
  // Every city gets a bubble on the globe (with its count when there are reports); clicking dives in.
  globe?.setMarkers(all.slice(0, 40), pick);
  $("#city-chips").innerHTML = chips.length
    ? chips
        .map(
          (c, i) => `<button class="city-chip" data-i="${i}" style="--d:${i * 40}ms">
          <span class="city-chip-name">${esc(c.name)}</span>${c.count ? `<span class="shield">${c.count}</span>` : ""}</button>`,
        )
        .join("")
    : "";
  $("#city-chips-wrap").hidden = !chips.length;
  $("#city-chips-wrap .label").textContent = chips.some((c) => c.count) ? "Cities with reports" : "Cities";
  $("#city-chips").querySelectorAll(".city-chip").forEach((b) => b.addEventListener("click", () => pick(chips[+b.dataset.i])));
}

export function openCity() {
  open = true;
  const el = $("#city");
  el.classList.add("on");
  el.classList.remove("leaving");
  document.body.classList.add("city-open");
  $("#city-close").hidden = !S.city;
  globe?.start();
  setTimeout(() => $("#city-q").focus(), 350);
}

export function closeCity() {
  open = false;
  const el = $("#city");
  el.classList.add("leaving");
  document.body.classList.remove("city-open");
  setTimeout(() => {
    el.classList.remove("on", "leaving");
    globe?.stop();
  }, 520);
}

async function pick(c) {
  $("#city-results").classList.remove("open");
  $("#city-q").blur();
  $("#city").classList.add("diving");
  // The globe dives; as it nears the ground the page fades in underneath and the map carries the
  // same motion on, from a wide view of the city down to its streets. One camera move, two engines.
  // Never trap anyone on the globe: if frames are throttled (background tab, slow device), go in anyway.
  if (globe) await Promise.race([globe.focus(c.lat, c.lng, { near: 0.62 }), new Promise((r) => setTimeout(r, 1600))]);
  S.arriving = true;
  setCity(c);
  closeCity();
  setTimeout(() => $("#city").classList.remove("diving"), 900);
}

function move(d) {
  if (!results.length) return;
  active = (active + d + results.length) % results.length;
  renderResults();
}

async function search(q) {
  const box = $("#city-results");
  if (q.trim().length < 2) {
    box.classList.remove("open");
    return;
  }
  box.innerHTML = `<div class="city-res-msg mono">Searching…</div>`;
  box.classList.add("open");
  // matches from existing data first
  const local = citiesFromData(S.all).filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
  let remote = [];
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=6&featuretype=settlement&accept-language=en`,
    );
    remote = (await r.json()).map(fromNominatim).filter(Boolean);
  } catch {}
  const seen = new Set(local.map((c) => c.name.toLowerCase()));
  results = [...local, ...remote.filter((c) => !seen.has(c.name.toLowerCase()))].slice(0, 7);
  active = results.length ? 0 : -1;
  renderResults();
}

function renderResults() {
  const box = $("#city-results");
  if (!results.length) {
    box.innerHTML = `<div class="city-res-msg mono">No city found. Try the full name.</div>`;
    return;
  }
  box.innerHTML = results
    .map(
      (c, i) => `<div class="city-res ${i === active ? "on" : ""}" role="option" data-i="${i}">
        <span class="city-res-name">${esc(c.name)}</span>
        <span class="city-res-sub mono">${esc([c.state, c.country].filter(Boolean).join(" · "))}</span>
        <span class="city-res-n">${c.count ? `<span class="shield">${c.count}</span>` : ""}</span></div>`,
    )
    .join("");
  box.querySelectorAll(".city-res").forEach((el) => {
    el.addEventListener("mouseenter", () => {
      active = +el.dataset.i;
      box.querySelectorAll(".city-res").forEach((x) => x.classList.toggle("on", x === el));
    });
    el.addEventListener("click", () => pick(results[+el.dataset.i]));
  });
}

export function fromNominatim(item) {
  if (!item) return null;
  const a = item.address || {};
  const name = a.city || a.town || a.village || a.municipality || a.county || item.name || item.display_name.split(",")[0];
  const lat = +item.lat, lng = +item.lon;
  let bbox = null;
  if (item.boundingbox) {
    const [s, n, w, e] = item.boundingbox.map(Number);
    bbox = [w, s, e, n];
    if (e - w > 1.2 || n - s > 1.2) bbox = bboxAround(lat, lng, 25);
    if (e - w < 0.08) bbox = bboxAround(lat, lng, 10);
  } else bbox = bboxAround(lat, lng, 18);
  const count = S.all.filter((r) => r.lat >= bbox[1] && r.lat <= bbox[3] && r.lng >= bbox[0] && r.lng <= bbox[2]).length;
  return { name, state: a.state || "", country: a.country || "", lat, lng, bbox, radiusKm: 18, count, source: "geo" };
}

// "Near me": the browser's own location prompt (opt-in), then Nominatim reverse geocoding.
function locate() {
  const btn = $("#city-locate");
  if (!navigator.geolocation) return;
  btn.classList.add("busy");
  navigator.geolocation.getCurrentPosition(
    async (p) => {
      try {
        const { latitude: lat, longitude: lng } = p.coords;
        const d = await (await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&zoom=10&format=json&addressdetails=1&accept-language=en`)).json();
        const c = fromNominatim({ ...d, lat, lon: lng, boundingbox: d.boundingbox });
        if (c) pick(c);
      } catch {}
      btn.classList.remove("busy");
    },
    () => btn.classList.remove("busy"),
    { timeout: 10000 },
  );
}
