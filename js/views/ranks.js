// Ranks: points, levels and badges, all computed from reports, keyed by reporter name.
import { $, $$, esc, pad, ago, fmtN } from "../lib/util.js";
import { S, on, myPerson, rememberMe } from "../core/state.js";
import { RULES, LEVELS, BADGES, normName } from "../data/derive.js";
import { registerView } from "../ui/shell.js";
import { inCity } from "../lib/geo.js";

let scope = "city";

const BADGE_GLYPH = {
  first: "M12 4v16M8 8l4-4 4 4",
  five: "M6 12h12M12 6v12",
  ten: "M5 7h14M5 12h14M5 17h14",
  shutter: "M5 8h14v10H5zM9 8l1.5-2h3L15 8M12 15a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  pioneer: "M7 20V4l10 4-10 4",
  night: "M15 4a7 7 0 107 9 6 6 0 01-7-9z",
  dawn: "M4 16h16M7 16a5 5 0 0110 0M12 6v3M6 9l1.5 1.5M18 9l-1.5 1.5",
  carto: "M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2zM9 4v14M15 6v14",
  collector: "M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z",
  streak: "M13 3L6 13h5l-1 8 7-10h-5z",
  urgent: "M12 4l9 16H3zM12 10v4M12 17v.5",
  botanist: "M12 20v-8M12 12c-3 0-5-2-5-5 3 0 5 2 5 5zM12 12c3 0 5-2 5-5-3 0-5 2-5 5z",
};
export function badgeSVG(k, got) {
  return `<svg viewBox="0 0 48 48" class="badge-svg ${got ? "got" : ""}" aria-hidden="true">
    <path d="M24 3l18 10.5v21L24 45 6 34.5v-21z" class="badge-hex"/>
    <g transform="translate(12 12)"><path d="${BADGE_GLYPH[k]}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;
}

export function initRanks() {
  $("#v-ranks").innerHTML = `
  <div class="page ranks">
    <header class="page-head">
      <p class="label">You and your city</p>
      <h1 class="page-h">Points for <em>proof.</em></h1>
      <p class="lede">More detail, more points: photos, notes, an exact pin. No account. Points go to the name you use.</p>
    </header>
    <div class="rk-grid">
      <div class="rk-me panel" id="rk-me"></div>
      <div class="rk-board">
        <div class="sec-h"><span class="label">Leaderboard</span>
          <div class="seg seg-sm" id="rk-scope"><button data-s="city" class="on">This city</button><button data-s="all">Everywhere</button><span class="seg-thumb"></span></div></div>
        <ol class="board" id="rk-board"></ol>
      </div>
      <div class="rk-rules">
        <div class="sec-h"><span class="label">How points work</span></div>
        <table class="rules">${RULES.map((r) => `<tr><td>${esc(r.label)}</td><td class="mono num">+${r.pts}</td></tr>`).join("")}</table>
        <div class="sec-h"><span class="label">Levels</span></div>
        <div class="levels">${LEVELS.map((l, i) => `<div class="lvl"><span class="mono">${pad(i + 1, 2)}</span><b>${l.name}</b><span class="mono">${l.at}+</span></div>`).join("")}</div>
      </div>
    </div>
  </div>`;
  $$("#rk-scope button").forEach((b) =>
    b.addEventListener("click", () => {
      scope = b.dataset.s;
      $$("#rk-scope button").forEach((x) => x.classList.toggle("on", x === b));
      render();
    }),
  );
  on("data", () => document.body.dataset.view === "ranks" && render());
  registerView("ranks", { enter: render });
}

function render() {
  const th = $("#rk-scope .seg-thumb"), onb = $("#rk-scope button.on");
  if (th && onb) (th.style.width = onb.offsetWidth + "px"), (th.style.transform = `translateX(${onb.offsetLeft}px)`);
  // leaderboard: city scope counts only points earned from reports in this city
  let ppl = [...S.people.values()];
  if (scope === "city" && S.city) {
    ppl = ppl
      .map((p) => {
        const rs = p.reports.filter((r) => inCity(S.city, r));
        return rs.length ? { ...p, cityPts: rs.reduce((a, r) => a + (S.reportPts.get(r.id)?.total || 0), 0), cityN: rs.length } : null;
      })
      .filter(Boolean);
  }
  const pts = (p) => (scope === "city" ? p.cityPts : p.pts);
  ppl.sort((a, b) => pts(b) - pts(a));
  const max = Math.max(1, ...ppl.map(pts));
  const meKey = normName(S.me?.name);
  $("#rk-board").innerHTML = ppl.length
    ? ppl
        .slice(0, 50)
        .map(
          (p, i) => `<li class="brow ${p.key === meKey ? "me" : ""}" style="--d:${Math.min(i, 20) * 22}ms">
        <span class="brow-r mono">${pad(i + 1, 2)}</span>
        <span class="brow-n"><b>${esc(p.name)}</b><small class="mono">${esc(p.level.name)} · ${scope === "city" ? p.cityN : p.reports.length} reports · ${p.badges.size} badges</small></span>
        <span class="brow-bar"><i style="width:${(pts(p) / max) * 100}%"></i></span>
        <span class="brow-p mono">${fmtN(pts(p))}</span>
        <button class="brow-claim mono" data-name="${esc(p.name)}" title="This is me">${p.key === meKey ? "you" : "me?"}</button></li>`,
        )
        .join("")
    : `<li class="muted pad">No one yet. Report something and you're first.</li>`;
  $$(".brow-claim").forEach((b) =>
    b.addEventListener("click", () => {
      rememberMe(b.dataset.name);
      render();
    }),
  );
  renderMe();
}

function renderMe() {
  const p = myPerson();
  const el = $("#rk-me");
  if (!p) {
    el.innerHTML = `<p class="label">You</p><h2 class="me-name">Not on the board yet</h2>
      <p class="muted">Report something to get on the board.</p>
      <a class="sign sign-report" href="#/report">Report a spot</a>
      <div class="badges">${BADGES.map((b) => `<div class="badge" title="${esc(b.desc)}">${badgeSVG(b.k, false)}<span>${esc(b.name)}</span></div>`).join("")}</div>`;
    return;
  }
  const L = p.level;
  const C = 2 * Math.PI * 52;
  el.innerHTML = `
    <p class="label">You</p>
    <div class="me-top">
      <svg class="ring" viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="ring-bg"/><circle cx="60" cy="60" r="52" class="ring-fg" style="stroke-dasharray:${C};stroke-dashoffset:${C * (1 - L.prog)}"/></svg>
      <div class="me-ring-in"><b>${fmtN(p.pts)}</b><span class="mono">points</span></div>
    </div>
    <h2 class="me-name">${esc(p.name)}</h2>
    <p class="mono me-lvl">Level ${L.i + 1} · <b class="leaf">${esc(L.name)}</b>${L.next ? ` · ${L.next.at - p.pts} to ${esc(L.next.name)}` : ""}</p>
    <div class="me-stats">
      <div class="stat"><span class="stat-l">Reports</span><b class="stat-v">${p.reports.length}</b></div>
      <div class="stat stat-leaf"><span class="stat-l">Trees</span><b class="stat-v">${p.reports.length}</b></div>
      <div class="stat"><span class="stat-l">Badges</span><b class="stat-v">${p.badges.size}</b></div>
    </div>
    <p class="label">Badges · ${p.badges.size} / ${BADGES.length}</p>
    <div class="badges">${BADGES.map((b) => `<div class="badge ${p.badges.has(b.k) ? "got" : ""}" title="${esc(b.desc)}">${badgeSVG(b.k, p.badges.has(b.k))}<span>${esc(b.name)}</span></div>`).join("")}</div>
    <p class="mono muted small">Last report ${p.last ? ago(p.last) : "never"}</p>`;
}
