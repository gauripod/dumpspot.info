// DumpSpot entry.
import { $, $$, fmtN } from "./lib/util.js";
import { S, on, setRows, myPerson } from "./core/state.js";
import { fetchReports } from "./data/db.js";
import { ICONS } from "./ui/icons.js";
import { BRAND, stamp, watchCursor, spotWalk } from "./ui/brand.js";
import { initShell, route, moveInk } from "./ui/shell.js";
import { initCity, openCity, refreshCityData } from "./views/city.js";
import { initMap } from "./views/map.js";
import { initLedger } from "./views/ledger.js";
import { initDetail } from "./views/detail.js";
import { initReport } from "./views/report.js";
import { initGarden } from "./views/garden.js";
import { initRanks } from "./views/ranks.js";
import { initStudy } from "./views/study.js";
import { initCredits } from "./views/credits.js";
import { initSystem } from "./views/system.js";
import { initAbout } from "./views/about.js";

// Same inspect lock as v1 (config.js is generated at build time).
if (typeof LOCK_INSPECT_ENV !== "undefined" && LOCK_INSPECT_ENV) {
  document.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && ["u", "s", "a"].includes(e.key.toLowerCase())) e.preventDefault();
    if (e.key === "F12") e.preventDefault();
  });
}

// Clean paths like /study map onto the hash router.
const PATHS = ["map", "ledger", "garden", "ranks", "report", "study", "credits", "system", "about"];
const seg = location.pathname.replace(/^\/+|\/+$/g, "");
if (PATHS.includes(seg)) history.replaceState(null, "", "/" + location.search + "#/" + seg);

$$("[data-icon]").forEach((el) => (el.innerHTML = ICONS[el.dataset.icon]));
$$("[data-brand]").forEach((el) => (el.innerHTML = BRAND));
$$("[data-stamp]").forEach((el) => (el.innerHTML = stamp({ spin: true })));
watchCursor();

// Smooth scroll (Lenis, MIT). Inner scroll areas keep native scrolling; reduced motion turns it off.
if (window.Lenis && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const lenis = new Lenis({
    lerp: 0.1,
    smoothWheel: true,
    prevent: (node) => !!node.closest?.(".drawer, .gd-table, .loc-results, .city-results, .menu, .st-task, .dash, .map, .fig-map, #globe, #gd-gl"),
  });
  window.__lenis = lenis;
  const raf = (t) => {
    lenis.raf(t);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
}

initShell({ onCity: openCity });
initCity();
initMap();
initLedger();
initDetail();
initReport();
initGarden();
initRanks();
initStudy();
initCredits();
initSystem();
initAbout();

on("city", () => ($("#city-name").textContent = S.city?.name || "Choose city"));
on("data", () => {
  refreshCityData();
  paintTitleBlock();
});

// Footer: one quiet line that says only what the bar above doesn't: credits and licence.
function paintTitleBlock() {
  $("#title-block").innerHTML = `<span class="ft-made">Made by <a href="https://github.com/gauripod" target="_blank" rel="noopener">Gauri</a>. Want to help? <a class="ft-contrib" href="https://github.com/gauripod/dumpspot.info/blob/main/CONTRIBUTION.md" target="_blank" rel="noopener">Contribute</a></span>
    <span class="ft-links"><a href="https://github.com/gauripod/dumpspot.info" target="_blank" rel="noopener">GitHub</a><a href="/v1/">v1</a><a href="#/credits">Credits</a><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a></span>`;
}

if (S.city) {
  $("#city-name").textContent = S.city.name;
  route();
} else openCity();

document.fonts?.ready.then(moveInk);

function status(html, kind) {
  const el = $("#status");
  el.className = `status status-${kind}`;
  el.innerHTML = html;
  el.hidden = false;
}

(async () => {
  document.body.classList.add("loading");
  status(`${spotWalk()}<span>Loading reports…</span>`, "load");
  try {
    const { rows, sample } = await fetchReports();
    setRows(rows, sample);
  } catch (e) {
    S.offline = true;
    console.warn("[DumpSpot] reports database unreachable", e.cause || e);
    status(`${spotWalk({ sniff: false })}<span>Reports are <b class="off-word">offline</b> right now.</span>`, "off");
    $("#status").title = "We can't reach the reports database. Bins, air and rain still load.";
    setRows([], false);
    const meta = $(".city-meta");
    meta.classList.add("off");
    meta.innerHTML = "Reports <b class=\"off-word\">offline</b>";
  }
  document.body.classList.remove("loading");
  if (!S.offline) $("#status").hidden = true;
  paintTitleBlock();
  if (S.city && !document.body.classList.contains("city-open")) route();
})();

on("city", () => {
  if (!location.hash || location.hash === "#" || location.hash === "#/") location.hash = "/map";
  route();
});
