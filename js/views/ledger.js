// Ledger: every report in the city, newest first, grouped Today / Yesterday / This week / months.
import { $, $$, esc, fmtTime, pad, debounce, DAY, fmtN } from "../lib/util.js";
import { S, on, applyFilters } from "../core/state.js";
import { catMeta, sevRank, SEV_COLORS } from "../data/derive.js";
import { ICONS } from "../ui/icons.js";
import { spotWalk } from "../ui/brand.js";
import { registerView, go } from "../ui/shell.js";
import { thumbs } from "../ui/seg.js";

export function initLedger() {
  $("#v-ledger").innerHTML = `
    <div class="page">
      <header class="page-head">
        <div class="seg viewswitch-inline" role="tablist" aria-label="Show as"><button data-goto="map">${ICONS.map}Map</button><button class="on" data-goto="ledger">${ICONS.list}List</button><span class="seg-thumb"></span></div>
        <h1 class="page-h"><span id="lg-n">0</span> reports in <em id="lg-city"></em></h1>
        <div class="lg-tools">
          <label class="search">${ICONS.search}<input id="ledger-q" placeholder="Search place, reporter, ID…  ( / )" /></label>
          <span class="mono muted" id="lg-filters"></span>
        </div>
      </header>
      <div id="lg-list"></div>
    </div>`;
  $("#ledger-q").addEventListener(
    "input",
    debounce((e) => {
      S.query = e.target.value;
      applyFilters();
    }, 160),
  );
  on("data", render);
  on("filter", render);
  document.querySelectorAll("#v-ledger [data-goto]").forEach((b) => b.addEventListener("click", () => go(b.dataset.goto)));
  registerView("ledger", { enter: () => (render(), setTimeout(thumbs, 30)) });
}

function render() {
  if (!S.city || document.body.dataset.view !== "ledger") return;
  const rows = S.filtered;
  $("#lg-n").textContent = fmtN(rows.length);
  $("#lg-city").textContent = S.city.name;
  const f = [];
  if (S.cats.size) f.push([...S.cats].map((c) => catMeta(c).label).join(", "));
  if (S.range) f.push("time range set on the map");
  $("#lg-filters").textContent = f.length ? "Filtered: " + f.join(" · ") : "";
  const el = $("#lg-list");
  if (!rows.length) {
    el.innerHTML = `<div class="empty spot-empty">${spotWalk()}<p class="page-h">Nothing here yet.</p><p class="t-small muted">Be the first to report here.</p><a class="sign sign-report" href="#/report"><svg class="i-plus" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>File a report</a></div>`;
    return;
  }
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const groups = [];
  const add = (key, label, cls, r) => {
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push((g = { key, label, cls, items: [] }));
    g.items.push(r);
  };
  for (const r of rows) {
    const t = +new Date(r.ts);
    if (t >= today) add("t", "Today", "g-today", r);
    else if (t >= today - DAY) add("y", "Yesterday", "g-yest", r);
    else if (t >= today - 6 * DAY) add("w", "This week", "g-week", r);
    else {
      const k = new Date(r.ts).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
      add(k, k, "g-old", r);
    }
  }
  let i = 0;
  el.innerHTML = groups
    .map(
      (g, gi) => `<section class="lg-group ${g.cls} ${gi % 2 ? "alt" : ""}">
      <h2 class="lg-h"><span>${esc(g.label)}</span><small class="mono">${g.items.length} report${g.items.length > 1 ? "s" : ""}</small></h2>
      ${g.items
        .map((r) => {
          const s = sevRank(r.sev), t = S.treeById.get(r.id);
          return `<a class="lrow" href="#/r/${encodeURIComponent(r.id)}" style="--d:${Math.min(i++, 30) * 18}ms">
            <span class="lrow-i mono">${pad(t?.n || 0)}</span>
            <span class="lrow-time mono">${g.cls === "g-old" ? new Date(r.ts).toLocaleDateString(undefined, { day: "2-digit", month: "short" }) : fmtTime(r.ts)}</span>
            <span class="lrow-main"><span class="lrow-t"><span class="ul">${esc(r.specific)}</span></span><span class="lrow-a">${esc(r.area)}, ${esc(r.state)}</span></span>
            <span class="lrow-cats">${(r.cats.length ? r.cats : ["Mixed / general"]).map((c) => `<span class="cat-dot" style="--c:${catMeta(c).color}">${esc(catMeta(c).label)}</span>`).join("")}</span>
            <span class="lrow-sev" title="Severity"><i style="background:${SEV_COLORS[s]};width:${s * 25}%"></i></span>
            <span class="lrow-by">${esc(r.reporter)}</span>
            <span class="lrow-tree" style="color:var(--moss)">${ICONS.tree}</span>
          </a>`;
        })
        .join("")}
    </section>`,
    )
    .join("");
}
