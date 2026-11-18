// The garden. Every report earns one tree, planted by the gardener. Drawn as a living painted
// panorama (gardenscene.js): the oldest tree on the left, the newest at the growing edge on the right.
// Size grows with age. We never name the species.
import { spotWalk } from "../ui/brand.js";
import { loadP5 } from "../ui/specimen.js";
import { createGardenScene } from "./gardenscene.js";
import { $, $$, esc, pad, fmtDate, fmtN, countTo } from "../lib/util.js";
import { S, on } from "../core/state.js";
import { SPECIES, STAGES, BADGES, catMeta } from "../data/derive.js";
import { ICONS } from "../ui/icons.js";
import { registerView, go } from "../ui/shell.js";

// 2D tree used in the report preview and the success screen.
export function treeSVG(t, k = 1, grow = false) {
  const sp = t || SPECIES.amaltas;
  const c = sp.leaf;
  const shapes = {
    round: `<circle cx="60" cy="50" r="30"/><circle cx="42" cy="60" r="18"/><circle cx="78" cy="60" r="18"/>`,
    umbrella: `<path d="M14 62 Q60 14 106 62 Q60 54 14 62z"/>`,
    cone: `<path d="M60 8 L84 86 L36 86z"/>`,
    column: `<rect x="44" y="16" width="32" height="72" rx="16"/>`,
    spread: `<ellipse cx="60" cy="54" rx="46" ry="26"/>`,
    layered: `<path d="M60 14 L88 46 L32 46z"/><path d="M60 32 L96 70 L24 70z"/>`,
  };
  return `<svg class="tree2d ${grow ? "grow" : ""}" viewBox="0 0 120 120" style="--k:${k}" aria-hidden="true">
    <line x1="10" y1="112" x2="110" y2="112" stroke="currentColor" stroke-opacity=".3"/>
    <g class="t2-trunk"><rect x="57" y="62" width="6" height="50" fill="#6B5A48"/></g>
    <g class="t2-crown" fill="${c}">${shapes[sp.shape] || shapes.round}</g>
  </svg>`;
}

let G = null; // the scene, once p5 has loaded
let kpPeriod = "all", kpOpen = null;
let scope = "city", sortKey = "n", sortDir = -1, list = [], sel = null, hover = null, speciesFilter = null;

export function initGarden() {
  $("#v-garden").innerHTML = `
  <div class="garden">
    <div class="gd-stage" id="gd-stage">
      <div class="gd-canvas" id="gd-canvas" aria-label="The garden. One tree for every report, oldest on the left, newest on the right. Drag to walk through it."></div>
      <div class="gd-hud">
        <div class="gd-sky" role="group" aria-label="Sky">
          ${["now", "dawn", "day", "dusk", "night"].map((k) => `<button data-sky="${k}" class="${k === "now" ? "on" : ""}">${k === "now" ? "Now" : k[0].toUpperCase() + k.slice(1)}</button>`).join("")}
        </div>
        <span class="gd-drag">${ICONS["hand-grabbing"]} Drag to scroll through time</span>
      </div>
      <div class="gd-label" id="gd-label"></div>
      <div class="gd-empty" id="gd-empty" hidden></div>
      <div class="gd-fallback" id="gd-fallback" hidden>The garden didn't load. The list below still works.</div>
    </div>
    <div class="gd-caption">
      <p class="gd-line"><b id="gd-n">0</b> <span id="gd-words">trees</span></p>
      <div class="gd-toggles" role="tablist">
        <button data-panel="register" aria-expanded="false">Tree register</button>
        <button data-panel="keepers" aria-expanded="false">Keepers</button>
        <button id="gd-scope" aria-pressed="false">From every city</button>
      </div>
    </div>
    <section class="gd-panel" id="gd-register" hidden>
      <div class="gd-table">
        <table>
          <thead><tr>
            <th data-k="n">Tree no.</th><th data-k="for">For</th><th data-k="stage">Stage</th><th data-k="ts">Earned</th><th data-k="by">Earned by</th><th data-k="co2" class="num">CO₂ kg/yr</th>
          </tr></thead>
          <tbody id="gd-rows"></tbody>
        </table>
      </div>
    </section>
    <section class="gd-panel" id="gd-keepers" hidden>
      <div class="kp-head">
        <div class="seg kp-period" role="group" aria-label="Period">
          <button data-p="all" class="on">All time</button><button data-p="30">30 days</button><button data-p="7">7 days</button>
        </div>
        <label class="kp-search"><span>${ICONS.search}</span><input id="kp-q" type="search" placeholder="Find a name" autocomplete="off" /></label>
      </div>
      <ol class="kp-list" id="gd-people"></ol>
      <p class="kp-foot"><a class="link-btn" href="#/ranks">How points and badges work</a></p>
    </section>
  </div>`;
  $$(".gd-toggles [data-panel]").forEach((b) =>
    b.addEventListener("click", () => {
      const id = "gd-" + b.dataset.panel;
      const open = $("#" + id).hidden;
      $$(".gd-panel").forEach((p) => (p.hidden = true));
      $$(".gd-toggles [data-panel]").forEach((x) => x.setAttribute("aria-expanded", "false"));
      if (open) {
        $("#" + id).hidden = false;
        b.setAttribute("aria-expanded", "true");
        $("#" + id).scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }),
  );
  $("#gd-scope").addEventListener("click", (e) => {
    scope = scope === "city" ? "all" : "city";
    e.currentTarget.setAttribute("aria-pressed", scope === "all");
    e.currentTarget.textContent = scope === "all" ? `Only ${S.city?.name || "my city"}` : "From every city";
    refresh();
  });
  $$(".gd-table th").forEach((th) =>
    th.addEventListener("click", () => {
      const k = th.dataset.k;
      sortDir = sortKey === k ? -sortDir : k === "n" || k === "ts" ? -1 : 1;
      sortKey = k;
      renderTable();
    }),
  );
  $$(".gd-sky button").forEach((b) =>
    b.addEventListener("click", () => {
      $$(".gd-sky button").forEach((x) => x.classList.toggle("on", x === b));
      if (!G) return;
      const k = b.dataset.sky === "now" ? null : b.dataset.sky;
      const hour = new Date().getHours();
      G.setSky(k || (hour >= 5 && hour < 8 ? "dawn" : hour >= 8 && hour < 17 ? "day" : hour >= 17 && hour < 20 ? "dusk" : "night"));
      $("#gd-stage").dataset.sky = G.sky();
    }),
  );
  $$(".kp-period button").forEach((b) =>
    b.addEventListener("click", () => {
      $$(".kp-period button").forEach((x) => x.classList.toggle("on", x === b));
      kpPeriod = b.dataset.p;
      renderKeepers();
    }),
  );
  $("#kp-q").addEventListener("input", debounceK(() => renderKeepers(), 120));
  on("data", () => document.body.dataset.view === "garden" && refresh());
  registerView("garden", {
    async enter() {
      await boot();
      refresh();
      G?.resume();
      const f = sessionStorage.getItem("ds.focusTree");
      if (f) {
        sessionStorage.removeItem("ds.focusTree");
        const t = list.find((x) => x.n === +f);
        if (t) setTimeout(() => select(t, true), 900);
      }
    },
    leave() {
      G?.pause();
    },
  });
}

function scoped() {
  if (scope === "all" || !S.city) return S.trees;
  const ids = new Set(S.inCity.map((r) => r.id));
  return S.trees.filter((t) => ids.has(t.id));
}

function refresh() {
  list = scoped();
  // Trees are earned by reports from a city, not planted in it: the gardener plants them wherever there's room.
  const from = scope === "all" ? "across all cities" : `in ${S.city?.name || "this city"}`;
  const people = new Set(list.map((t) => t.report.reporter.trim().toLowerCase())).size;
  $("#gd-n").textContent = fmtN(list.length);
  $("#gd-words").textContent = list.length
    ? `${list.length === 1 ? "tree" : "trees"} from ${people} ${people === 1 ? "person" : "people"} ${from}. We plant them where there's space.`
    : `trees ${from} yet. 1 report = 1 tree.`;
  const empty = $("#gd-empty");
  empty.hidden = list.length > 0;
  empty.innerHTML = S.offline
    ? `${spotWalk()}<p>Reports are <b class="off-word">offline</b>, so the garden is empty for now.</p>`
    : `${spotWalk({ sniff: false })}<p>No reports ${from} yet.</p>`;
  chips();
  renderTable();
  renderKeepers();
  buildScene();
}

// Keepers: the leaderboard. Period filter, search, and every row opens to show the person's
// numbers, badges, latest reports, and lights up their trees in the garden above.
function debounceK(fn, ms) {
  let t;
  return (...a) => (clearTimeout(t), (t = setTimeout(() => fn(...a), ms)));
}
const hue = (name) => {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return ["#2448D8", "#1FA34A", "#7A5AF8", "#0E9F9A", "#C2357A", "#3B82F6", "#5B6B12", "#9333EA"][h % 8];
};
const initials = (name) => name.replace(/\s#\d+$/, "").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

function renderKeepers() {
  const ids = new Set(list.map((t) => t.id));
  const since = kpPeriod === "all" ? 0 : Date.now() - +kpPeriod * 864e5;
  const q = ($("#kp-q")?.value || "").trim().toLowerCase();
  const rows = [...S.people.values()]
    .map((p) => {
      const rs = p.reports.filter((r) => ids.has(r.id) && +new Date(r.ts) >= since);
      const pts = rs.reduce((n, r) => n + (S.reportPts.get(r.id)?.total || 0), 0);
      return { p, rs, pts };
    })
    .filter((x) => x.rs.length)
    .sort((a, z) => z.pts - a.pts || z.rs.length - a.rs.length);
  rows.forEach((x, i) => (x.rank = i + 1));
  const shown = q ? rows.filter((x) => x.p.name.toLowerCase().includes(q)) : rows.slice(0, 25);
  const top = rows[0]?.pts || 1;
  const meKey = S.me?.name ? S.me.name.trim().toLowerCase().replace(/\s+/g, " ") : "";
  // 12 weekly buckets for the sparkline
  const W12 = 12, now = Date.now();
  const spark = (rs) => {
    const b = Array(W12).fill(0);
    rs.forEach((r) => {
      const w = Math.floor((now - +new Date(r.ts)) / (7 * 864e5));
      if (w < W12) b[W12 - 1 - w]++;
    });
    const m = Math.max(1, ...b);
    return `<svg class="kp-spark" viewBox="0 0 ${W12 * 5} 16" aria-hidden="true">${b.map((v, i) => `<rect x="${i * 5}" y="${16 - Math.max(1.5, (v / m) * 16)}" width="3.4" height="${Math.max(1.5, (v / m) * 16)}" rx="1"/>`).join("")}</svg>`;
  };
  $("#gd-people").innerHTML = shown.length
    ? shown
        .map(({ p, rs, pts, rank }, i) => {
          const name = p.name.replace(/\s(#\d+)$/, ' <i class="kp-tag">$1</i>');
          const open = kpOpen === p.key;
          const cats = [...rs.reduce((m, r) => (r.cats.forEach((c) => m.set(c, (m.get(c) || 0) + 1)), m), new Map())].sort((a, z) => z[1] - a[1]);
          const latest = rs.slice().sort((a, z) => new Date(z.ts) - new Date(a.ts)).slice(0, 3);
          const badges = BADGES.filter((b) => p.badges?.has?.(b.k));
          return `<li class="kp-row ${open ? "open" : ""} ${p.key === meKey ? "me" : ""} ${rank <= 3 ? "top top-" + rank : ""}" data-k="${esc(p.key)}" style="--i:${Math.min(i, 12)}">
            <button class="kp-main" aria-expanded="${open}">
              <span class="kp-rank">${rank}</span>
              <span class="kp-av" style="--h:${hue(p.name)}">${esc(initials(p.name))}</span>
              <span class="kp-who"><b>${name}${p.key === meKey ? ' <i class="kp-you">You</i>' : ""}</b><small>${esc(p.level.name)} · ${rs.length} ${rs.length === 1 ? "report" : "reports"}</small></span>
              ${spark(rs)}
              <span class="kp-bar"><i style="width:${Math.max(4, (pts / top) * 100)}%"></i></span>
              <span class="kp-pts"><b>${pts}</b><small>pts</small></span>
              <span class="kp-trees">${ICONS.tree}${rs.length}</span>
            </button>
            ${
              open
                ? `<div class="kp-more">
              <div class="kp-stats">
                <div><small>Points</small><b>${pts}</b></div>
                <div><small>Trees</small><b>${rs.length}</b></div>
                <div><small>Level</small><b>${esc(p.level.name)}</b></div>
                <div><small>Since</small><b>${fmtDate(rs[rs.length - 1]?.ts || p.reports[0].ts, { month: "short", year: "numeric" })}</b></div>
              </div>
              ${cats.length ? `<div class="kp-cats">${cats.slice(0, 4).map(([c, n]) => `<span>${esc(catMeta(c).label)} <em>${n}</em></span>`).join("")}</div>` : ""}
              ${badges.length ? `<div class="kp-badges">${badges.map((b) => `<span title="${esc(b.desc)}">${esc(b.name)}</span>`).join("")}</div>` : ""}
              <div class="kp-latest">${latest.map((r) => `<a href="#/r/${encodeURIComponent(r.id)}"><b>${esc(r.specific)}</b><small>${esc(r.area)} · ${fmtDate(r.ts, { day: "numeric", month: "short" })}</small></a>`).join("")}</div>
              <button class="plate-btn kp-show" data-k="${esc(p.key)}">${ICONS.tree} Show their trees</button>
            </div>`
                : ""
            }
          </li>`;
        })
        .join("")
    : `<li class="kp-empty">${q ? "No one by that name." : "No one yet."}</li>`;
  $$("#gd-people .kp-main").forEach((b) =>
    b.addEventListener("click", () => {
      const k = b.parentElement.dataset.k;
      kpOpen = kpOpen === k ? null : k;
      G?.highlight?.(null);
      renderKeepers();
    }),
  );
  $$("#gd-people .kp-show").forEach((b) =>
    b.addEventListener("click", () => {
      const p = S.people.get(b.dataset.k);
      if (!p || !G) return;
      const mine = new Set(p.reports.map((r) => r.id));
      const ns = list.filter((t) => mine.has(t.id)).map((t) => t.n);
      G.highlight(new Set(ns));
      if (ns.length) G.focus(ns[ns.length - 1]);
      $("#gd-stage").scrollIntoView({ behavior: "smooth", block: "start" });
    }),
  );
}

function chips() {}

function renderTable() {
  const val = (t) => ({ n: t.n, for: t.report.specific.toLowerCase(), stage: STAGES.indexOf(t.stage), ts: +new Date(t.report.ts), by: t.report.reporter.toLowerCase(), co2: t.stage.co2 })[sortKey];
  const rows = [...list].sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * sortDir);
  $$(".gd-table th").forEach((th) => th.classList.toggle("sorted", th.dataset.k === sortKey) || th.setAttribute("data-dir", sortDir > 0 ? "↑" : "↓"));
  $("#gd-rows").innerHTML = rows.length
    ? rows
        .map(
          (t) => `<tr data-n="${t.n}" class="${sel?.n === t.n ? "on" : ""}">
        <td>${pad(t.n)}</td>
        <td><b>${esc(t.report.specific)}</b><small>${esc(t.report.area)}</small></td>
        <td><span class="stage s-${t.stage.key}">${esc(t.stage.name)}</span></td>
        <td class="mono">${fmtDate(t.report.ts, { day: "2-digit", month: "short", year: "2-digit" })}</td>
        <td>${esc(t.report.reporter)}</td>
        <td class="mono num">${t.stage.co2}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="6" class="muted pad">No trees yet.</td></tr>`;
  $$("#gd-rows tr[data-n]").forEach((tr) => {
    const t = list.find((x) => x.n === +tr.dataset.n);
    tr.addEventListener("mouseenter", () => setHover(t));
    tr.addEventListener("mouseleave", () => setHover(null));
    tr.addEventListener("click", () => (sel?.n === t.n ? go("r/" + encodeURIComponent(t.id)) : select(t, true)));
  });
}

// ── The scene ─────────────────────────────────────────────────────────
async function boot() {
  if (G !== null) return;
  try {
    const P5 = await loadP5();
    G = createGardenScene($("#gd-canvas"), P5, {
      spotSVG: spotWalk({ sniff: false }).replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" width="78" height="60" '),
      onHover: (t, at, sticky) => showLabel(t, at, sticky),
      onPick: (t) => select(t, false),
    });
    $("#gd-stage").dataset.sky = G.sky();
    new ResizeObserver(() => G.resize()).observe($("#gd-canvas"));
  } catch (e) {
    G = false;
    $("#gd-fallback").hidden = false;
  }
}

function buildScene() {
  if (G) G.setTrees([...list].sort((a, b) => a.n - b.n));
}

function showLabel(t, at, sticky) {
  const lab = $("#gd-label");
  if (!t || !at) {
    if (!sel) lab.classList.remove("on");
    return;
  }
  if (lab.dataset.n !== String(t.n)) {
    const r = t.report;
    lab.dataset.n = t.n;
    lab.innerHTML = `<span class="gd-l-stage">${esc(t.stage.name)}</span><b>Tree no. ${pad(t.n)}</b>
      <span>Earned by ${esc(r.reporter)}, ${fmtDate(r.ts, { day: "numeric", month: "short", year: "numeric" })}</span>
      <a href="#/r/${encodeURIComponent(t.id)}">For ${esc(r.specific)} ${ICONS.arrow}</a>`;
  }
  lab.style.transform = `translate(${at.x}px, ${at.y}px) translate(-50%, calc(-100% - 10px))`;
  lab.classList.add("on");
}

function setHover(t) {
  hover = t;
  $$("#gd-rows tr").forEach((tr) => tr.classList.toggle("hov", t && +tr.dataset.n === t.n));
}

function select(t, fly) {
  sel = t;
  $$("#gd-rows tr").forEach((tr) => tr.classList.toggle("on", +tr.dataset.n === t.n));
  $(`#gd-rows tr[data-n="${t.n}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  if (G && fly) {
    G.focus(t.n);
    $("#gd-stage").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
