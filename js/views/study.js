// /study: Spatial sense-making with civic data.
// A research prototype that shows the same city dataset as a 2D map, a dashboard and a
// 3D spatial model, and measures whether people can find clusters, see relationships
// between report types, navigate 3D, and explain what they found.
// Sessions are stored only in this browser (localStorage) and exported as CSV / JSON.
import { $, $$, esc, store, pad, fmtN } from "../lib/util.js";
import { S, on } from "../core/state.js";
import { CATS, catMeta, sevRank, SEV_COLORS } from "../data/derive.js";
import { hexBin, haversine } from "../lib/geo.js";
import { registerView } from "../ui/shell.js";
import { mapStyle } from "./mapstyle.js";
import { makeSample } from "../data/sample.js";
import { citiesFromData } from "../data/derive.js";

const CONDS = {
  map2d: { name: "2D map", short: "Map", desc: "A flat map. One dot per report, coloured by category." },
  dash: { name: "Dashboard", short: "Dashboard", desc: "Charts and tables. No map. Zones are listed by grid label." },
  map3d: { name: "3D spatial", short: "3D", desc: "A tilted 3D city. Columns rise where reports pile up. Drag to orbit, right-drag to tilt." },
};
// Latin square for three conditions
const ORDERS = [
  ["map2d", "dash", "map3d"],
  ["dash", "map3d", "map2d"],
  ["map3d", "map2d", "dash"],
];
const LIKERT = [
  ["clusters", "It was easy to find where reports cluster."],
  ["relations", "It was easy to see how report types relate."],
  ["nav", "Moving around this view was hard."],
  ["confident", "I'm confident my explanation is accurate."],
];
const KEY = "ds.study.sessions";

// The study always runs on the same generated demo dataset, so every participant sees
// identical data and the live reports stay out of research sessions.
const D = (() => {
  const all = makeSample();
  const city = citiesFromData(all)[0];
  return { city, rows: all.filter((r) => r.area === city.name) };
})();
const COLS = "ABCD", ROWS = 4;

let ses = null, step = 0, task = null, tStart = 0, ix = 0, smap = null, answerMarker = null, mapClick = null;

export function initStudy() {
  registerView("study", { enter: render, leave: () => {} });
  on("data", () => document.body.dataset.view === "study" && !ses && render());
}

// ── Ground truth ──────────────────────────────────────────────────────
function sectorOf(lat, lng) {
  const b = D.city.bbox;
  const c = Math.min(3, Math.max(0, Math.floor(((lng - b[0]) / (b[2] - b[0])) * 4)));
  const r = Math.min(ROWS - 1, Math.max(0, Math.floor(((b[3] - lat) / (b[3] - b[1])) * ROWS)));
  return COLS[c] + (r + 1);
}
function sectorCenter(s) {
  const b = D.city.bbox, c = COLS.indexOf(s[0]), r = +s[1] - 1;
  return { lng: b[0] + ((c + 0.5) / 4) * (b[2] - b[0]), lat: b[3] - ((r + 0.5) / ROWS) * (b[3] - b[1]) };
}
const allSectors = () => [...COLS].flatMap((c) => [1, 2, 3, 4].map((r) => c + r));

function dataset() {
  const b = D.city.bbox;
  return D.rows.filter((r) => r.lng >= b[0] && r.lng <= b[2] && r.lat >= b[1] && r.lat <= b[3]);
}

function buildTasks(rows, seedN) {
  const bySec = {};
  rows.forEach((r) => ((bySec[sectorOf(r.lat, r.lng)] ||= []).push(r)));
  const catN = CATS.map((c) => ({ k: c.key, n: rows.filter((r) => r.cats.includes(c.key)).length })).filter((c) => c.n >= 2).sort((a, b) => b.n - a.n);
  // co-location: categories sharing sectors
  const vec = (k) => allSectors().map((s) => (bySec[s] || []).filter((r) => r.cats.includes(k)).length);
  const sim = (a, b) => {
    const va = vec(a), vb = vec(b);
    let num = 0, den = 0;
    va.forEach((x, i) => ((num += Math.min(x, vb[i])), (den += Math.max(x, vb[i]))));
    return den ? num / den : 0;
  };
  const severeIn = (s) => (bySec[s] || []).filter((r) => sevRank(r.sev) >= 3).length;
  const secs = Object.keys(bySec).sort((a, b) => bySec[b].length - bySec[a].length);
  const per = [];
  for (let i = 0; i < 3; i++) {
    const focus = catN[i % catN.length]?.k;
    // T1: biggest cluster of a category (by hex bin, then its sector)
    const fr = rows.filter((r) => r.cats.includes(focus));
    const span = (D.city.bbox[2] - D.city.bbox[0]) * 111;
    const bins = hexBin(fr, D.city, Math.max(300, (span * 1000) / 30)).sort((a, b) => b.items.length - a.items.length);
    const top = bins[0];
    const topC = top ? { lng: top.center[0], lat: top.center[1] } : null;
    // T2: which category co-locates most with the focus
    const others = catN.map((c) => c.k).filter((k) => k !== focus);
    const ranked = others.map((k) => ({ k, s: sim(focus, k) })).sort((a, b) => b.s - a.s);
    const opts = shuffle([ranked[0], ...ranked.slice(-3)].filter(Boolean).map((x) => x.k), seedN + i).slice(0, 4);
    // T3: severity comparison between two busy sectors that differ
    let pair = null;
    for (let a = i; a < secs.length && !pair; a++)
      for (let b = a + 1; b < secs.length; b++)
        if (severeIn(secs[a]) !== severeIn(secs[b])) {
          pair = [secs[a], secs[b]];
          break;
        }
    per.push({
      cluster: { focus, truth: topC && sectorOf(topC.lat, topC.lng), truthPt: topC, n: top?.items.length || 0 },
      relation: { focus, truth: ranked[0]?.k, options: opts, sims: Object.fromEntries(ranked.map((x) => [x.k, +x.s.toFixed(3)])) },
      severity: pair ? { a: pair[0], b: pair[1], truth: severeIn(pair[0]) > severeIn(pair[1]) ? pair[0] : pair[1], na: severeIn(pair[0]), nb: severeIn(pair[1]) } : null,
    });
  }
  return per;
}
function shuffle(a, seed) {
  const r = [...a];
  let s = seed * 9301 + 49297;
  for (let i = r.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

// ── Flow ──────────────────────────────────────────────────────────────
function steps() {
  const out = [{ k: "consent" }];
  ses.order.forEach((c, ci) => {
    out.push({ k: "brief", c, ci });
    ["cluster", "relation", "severity", "explain"].forEach((t) => {
      if (t === "severity" && !ses.tasks[ci].severity) return;
      out.push({ k: "task", c, ci, t });
    });
    out.push({ k: "likert", c, ci });
  });
  out.push({ k: "final" }, { k: "done" });
  return out;
}

function render() {
  const v = $("#v-study");
  if (ses) return renderStep();
  const rows = dataset();
  const sessions = store.get(KEY, []);
  v.innerHTML = `
  <div class="page study">
    <header class="page-head">
      <p class="label">Study · Project A</p>
      <h1 class="page-h">Spatial sense-making <em>with civic data.</em></h1>
      <p class="lede">A fixed demo dataset for ${esc(D.city.name)} (generated, not real reports, so every participant sees exactly the same thing), shown three ways: a 2D map, a dashboard and a 3D spatial model. We look at whether people can find clusters, understand how report types relate, whether 3D helps discovery or gets in the way, and which view lets people explain what they found most accurately.</p>
    </header>
    <div class="st-grid">
      <div class="plate st-card">
        <p class="label">Research questions</p>
        <ol class="st-rq">
          <li><b>Clusters.</b> Can people identify geographical clusters?</li>
          <li><b>Relationships.</b> Can they understand how different types of reports relate?</li>
          <li><b>3D.</b> Does 3D improve discovery or make navigation harder?</li>
          <li><b>Explanation.</b> Which representation helps people explain findings most accurately?</li>
        </ol>
      </div>
      <div class="plate st-card">
        <p class="label">Protocol · ~12 minutes</p>
        <ol class="st-rq">
          <li>Three conditions in a counterbalanced order (Latin square by participant).</li>
          <li>Per condition: find a cluster, judge a relationship, compare severity, write an explanation.</li>
          <li>After each: four 7-point ratings. At the end: rank the three views.</li>
          <li>We log time on task, answers, accuracy and interactions (zoom, pan, tilt, hover). Nothing leaves this browser unless you export it.</li>
        </ol>
      </div>
      <div class="plate st-card st-start">
        <p class="label">Dataset</p>
        <div class="stat"><b class="stat-v">${fmtN(rows.length)}</b><span class="stat-u">reports in ${esc(D.city.name || "no city")}</span></div>
        ${
          rows.length >= 12
            ? `<label class="field"><span>Participant ID</span><input id="st-pid" value="P${pad(sessions.length + 1, 2)}" maxlength="20"/></label>
               <button class="sign sign-xl" id="st-go">Start session</button>`
            : `<p class="muted">A session needs at least 12 reports in the chosen city. Change city (C) to one with more reports.</p>`
        }
      </div>
    </div>
    ${resultsHTML(sessions)}
  </div>`;
  $("#st-go")?.addEventListener("click", start);
  bindResults();
}

function start() {
  const pid = ($("#st-pid").value || "P").trim();
  const sessions = store.get(KEY, []);
  const order = ORDERS[sessions.length % 3];
  const rows = dataset();
  ses = {
    pid,
    city: D.city.name,
    n: rows.length,
    order,
    startedAt: new Date().toISOString(),
    tasks: buildTasks(rows, sessions.length + 1),
    answers: [],
    likert: {},
    final: {},
    sample: true,
  };
  step = 0;
  renderStep();
}

function renderStep() {
  const st = steps()[step];
  const v = $("#v-study");
  const total = steps().length;
  const header = `<div class="st-progress"><span class="mono">${esc(ses.pid)} · ${ses.order.map((c) => CONDS[c].short).join(" → ")}</span><span class="st-bar"><i style="width:${(step / (total - 1)) * 100}%"></i></span><button class="link-btn mono" id="st-abort">Abort</button></div>`;
  if (st.k === "consent") {
    v.innerHTML = `<div class="page study">${header}<div class="st-center panel">
      <p class="label">Before we start</p><h2 class="st-h">You'll explore reports of garbage and civic hazards in ${esc(ses.city)}.</h2>
      <p>There are no right or wrong ways to look. Work at your own pace; we time each task. Your answers are stored on this device for the researcher and contain no personal details beyond the participant ID.</p>
      <p class="muted">The city is divided into a 4 × 4 grid of zones, A1 (north-west) to D4 (south-east). Every view shows these labels.</p>
      <button class="sign sign-xl" id="st-next">I agree, begin</button></div></div>`;
  } else if (st.k === "brief") {
    v.innerHTML = `<div class="page study">${header}<div class="st-center panel">
      <p class="label">Condition ${st.ci + 1} of 3</p><h2 class="st-h">${CONDS[st.c].name}</h2><p>${CONDS[st.c].desc}</p>
      <p class="muted">Take a moment to get familiar with it, then start the tasks. Timing starts on the first task.</p>
      <button class="sign sign-xl" id="st-next">Show me</button></div></div>`;
  } else if (st.k === "task") {
    renderTask(st, header);
    return;
  } else if (st.k === "likert") {
    v.innerHTML = `<div class="page study">${header}<div class="st-center panel">
      <p class="label">About the ${CONDS[st.c].name}</p><h2 class="st-h">How did that feel?</h2>
      ${LIKERT.map(([k, q]) => `<div class="lk"><p>${esc(q)}</p><div class="lk-scale" data-k="${k}">${[1, 2, 3, 4, 5, 6, 7].map((n) => `<button data-n="${n}">${n}</button>`).join("")}</div><div class="lk-ends mono"><span>Strongly disagree</span><span>Strongly agree</span></div></div>`).join("")}
      <button class="sign sign-xl" id="st-next" disabled>Continue</button></div></div>`;
    const vals = {};
    $$(".lk-scale").forEach((s) =>
      $$("button", s).forEach((b) =>
        b.addEventListener("click", () => {
          $$("button", s).forEach((x) => x.classList.toggle("on", x === b));
          vals[s.dataset.k] = +b.dataset.n;
          ses.likert[st.c] = { ...vals };
          $("#st-next").disabled = Object.keys(vals).length < LIKERT.length;
        }),
      ),
    );
  } else if (st.k === "final") {
    const opts = ses.order.map((c) => `<option value="${c}">${CONDS[c].name}</option>`).join("");
    v.innerHTML = `<div class="page study">${header}<div class="st-center panel">
      <p class="label">Last question</p><h2 class="st-h">Which view helped you explain your findings most accurately?</h2>
      <div class="st-rank">${["1st", "2nd", "3rd"].map((l, i) => `<label class="field"><span>${l}</span><select data-r="${i}"><option value="">Choose</option>${opts}</select></label>`).join("")}</div>
      <label class="field"><span>Anything else? (optional)</span><textarea id="st-comment" rows="3"></textarea></label>
      <button class="sign sign-xl" id="st-next" disabled>Finish</button></div></div>`;
    const check = () => {
      const r = $$(".st-rank select").map((s) => s.value);
      $("#st-next").disabled = r.some((x) => !x) || new Set(r).size < 3;
      ses.final.rank = r;
    };
    $$(".st-rank select").forEach((s) => s.addEventListener("change", check));
    $("#st-comment").addEventListener("input", (e) => (ses.final.comment = e.target.value));
  } else if (st.k === "done") {
    ses.endedAt = new Date().toISOString();
    const all = store.get(KEY, []);
    all.push(ses);
    store.set(KEY, all);
    const acc = (c) => {
      const a = ses.answers.filter((x) => x.cond === c && x.correct != null);
      return a.length ? Math.round((a.filter((x) => x.correct).length / a.length) * 100) : 0;
    };
    v.innerHTML = `<div class="page study"><div class="st-center panel">
      <p class="label">Session saved · ${esc(ses.pid)}</p><h2 class="st-h">Thank you.</h2>
      <div class="me-stats">${ses.order.map((c) => `<div class="stat"><span class="stat-l">${CONDS[c].name}</span><b class="stat-v">${acc(c)}%</b><span class="stat-u">correct</span></div>`).join("")}</div>
      <button class="sign" id="st-home">Back to study overview</button></div></div>`;
    ses = null;
    teardownMap();
    $("#st-home").addEventListener("click", render);
    return;
  }
  $("#st-next")?.addEventListener("click", next);
  $("#st-abort")?.addEventListener("click", abort);
}

function next() {
  step++;
  renderStep();
}
function abort() {
  if (!confirm("Abort this session? Answers so far are discarded.")) return;
  ses = null;
  teardownMap();
  render();
}

// ── Tasks ─────────────────────────────────────────────────────────────
function renderTask(st, header) {
  const v = $("#v-study");
  const T = ses.tasks[st.ci];
  const meta = (k) => esc(catMeta(k).label);
  let q = "", ctl = "";
  if (st.t === "cluster") {
    q = `Where is the biggest cluster of <b>${meta(T.cluster.focus)}</b> reports?`;
    ctl = st.c === "dash" ? `<p class="mono muted small">Pick the zone.</p>${zonePicker()}` : `<p class="mono muted small">Click the spot on the map. You can click again to move it.</p><div class="st-ans mono" id="st-ans">No spot chosen</div>`;
  } else if (st.t === "relation") {
    q = `Which type of report most often shows up in the <b>same zones</b> as <b>${meta(T.relation.focus)}</b>?`;
    ctl = `<div class="st-opts">${T.relation.options.map((k) => `<button class="st-opt" data-v="${esc(k)}"><i style="background:${catMeta(k).color}"></i>${meta(k)}</button>`).join("")}</div>`;
  } else if (st.t === "severity") {
    q = `Which zone has more <b>severe or road-blocking</b> reports: <b>${T.severity.a}</b> or <b>${T.severity.b}</b>?`;
    ctl = `<div class="st-opts st-opts-2"><button class="st-opt" data-v="${T.severity.a}">${T.severity.a}</button><button class="st-opt" data-v="${T.severity.b}">${T.severity.b}</button></div>`;
  } else {
    q = `In two or three sentences, explain what this view tells you about ${esc(ses.city)}'s garbage problem. Mention <b>where</b> and <b>what kind</b>.`;
    ctl = `<textarea id="st-text" rows="6" placeholder="e.g. Most plastic waste is around zone B2, near…"></textarea>
      <p class="mono muted small">Confidence</p><div class="lk-scale" id="st-conf">${[1, 2, 3, 4, 5].map((n) => `<button data-n="${n}">${n}</button>`).join("")}</div>`;
  }
  const idx = ["cluster", "relation", "severity", "explain"].indexOf(st.t) + 1;
  v.innerHTML = `<div class="study-run">${header}
    <div class="st-run">
      <div class="st-stim" id="st-stim"></div>
      <aside class="st-task panel">
        <p class="label">${CONDS[st.c].name} · Task ${idx}</p>
        <h2 class="st-q">${q}</h2>
        ${ctl}
        <button class="sign sign-xl" id="st-submit" disabled>Next</button>
        <p class="mono muted small" id="st-timer">0.0s</p>
      </aside>
    </div></div>`;
  $("#st-abort").addEventListener("click", abort);
  task = { cond: st.c, task: st.t, ci: st.ci, answer: null };
  tStart = performance.now();
  ix = 0;
  const timer = setInterval(() => {
    const el = $("#st-timer");
    if (!el) return clearInterval(timer);
    el.textContent = ((performance.now() - tStart) / 1000).toFixed(1) + "s";
  }, 100);
  const ready = () => ($("#st-submit").disabled = task.answer == null || (st.t === "explain" && (!task.answer.text || task.answer.text.trim().length < 15 || !task.answer.conf)));

  if (st.c === "dash") renderDash($("#st-stim"));
  else renderStudyMap($("#st-stim"), st.c);

  if (st.t === "cluster") {
    if (st.c === "dash")
      $$(".zp button").forEach((b) =>
        b.addEventListener("click", () => {
          $$(".zp button").forEach((x) => x.classList.toggle("on", x === b));
          task.answer = { sector: b.dataset.s };
          ready();
        }),
      );
    else
      mapClick = (ll) => {
        task.answer = { lat: ll.lat, lng: ll.lng, sector: sectorOf(ll.lat, ll.lng) };
        $("#st-ans").textContent = `Zone ${task.answer.sector} · ${ll.lat.toFixed(4)}, ${ll.lng.toFixed(4)}`;
        ready();
      };
  }
  $$(".st-opt").forEach((b) =>
    b.addEventListener("click", () => {
      $$(".st-opt").forEach((x) => x.classList.toggle("on", x === b));
      task.answer = { choice: b.dataset.v };
      ready();
    }),
  );
  if (st.t === "explain") {
    task.answer = { text: "", conf: null };
    $("#st-text").addEventListener("input", (e) => ((task.answer.text = e.target.value), ready()));
    $$("#st-conf button").forEach((b) =>
      b.addEventListener("click", () => {
        $$("#st-conf button").forEach((x) => x.classList.toggle("on", x === b));
        task.answer.conf = +b.dataset.n;
        ready();
      }),
    );
  }
  $("#st-submit").addEventListener("click", () => {
    clearInterval(timer);
    score(T, st);
    mapClick = null;
    next();
  });
}

function score(T, st) {
  const a = task.answer;
  const rec = { cond: st.c, order: st.ci + 1, task: st.t, ms: Math.round(performance.now() - tStart), interactions: ix, answer: a, correct: null };
  if (st.t === "cluster") {
    rec.truth = T.cluster.truth;
    rec.correct = a.sector === T.cluster.truth;
    if (a.lat != null && T.cluster.truthPt) rec.errorKm = +haversine(a, T.cluster.truthPt).toFixed(3);
    else if (T.cluster.truthPt) rec.errorKm = +haversine(sectorCenter(a.sector), T.cluster.truthPt).toFixed(3);
  } else if (st.t === "relation") {
    rec.truth = T.relation.truth;
    rec.correct = a.choice === T.relation.truth;
  } else if (st.t === "severity") {
    rec.truth = T.severity.truth;
    rec.correct = a.choice === T.severity.truth;
  } else {
    // proxy for explanation accuracy: does it name the right zone and category?
    const txt = (a.text || "").toLowerCase();
    const cl = T.cluster;
    rec.mentionsZone = cl.truth ? new RegExp(`\\b${cl.truth.toLowerCase()}\\b`).test(txt) : false;
    rec.mentionsCat = [cl.focus, catMeta(cl.focus).label].some((s) => txt.includes(s.toLowerCase().split(" ")[0]));
    rec.words = txt.split(/\s+/).filter(Boolean).length;
    rec.rubric = null; // scored by the researcher on the results screen (0–2)
  }
  ses.answers.push(rec);
}

function zonePicker() {
  return `<div class="zp">${[1, 2, 3, 4].map((r) => [...COLS].map((c) => `<button data-s="${c}${r}">${c}${r}</button>`).join("")).join("")}</div>`;
}

// ── Stimulus: dashboard ───────────────────────────────────────────────
function renderDash(host) {
  teardownMap();
  const rows = dataset();
  const bySec = {};
  rows.forEach((r) => ((bySec[sectorOf(r.lat, r.lng)] ||= []).push(r)));
  const cats = CATS.filter((c) => rows.some((r) => r.cats.includes(c.key)));
  const secs = allSectors();
  const cell = (s, k) => (bySec[s] || []).filter((r) => r.cats.includes(k)).length;
  const maxCell = Math.max(1, ...secs.flatMap((s) => cats.map((c) => cell(s, c.key))));
  const maxSec = Math.max(1, ...secs.map((s) => (bySec[s] || []).length));
  const catMax = Math.max(1, ...cats.map((c) => rows.filter((r) => r.cats.includes(c.key)).length));
  host.innerHTML = `<div class="dash">
    <div class="dash-kpis">
      <div class="stat"><span class="stat-l">Reports</span><b class="stat-v">${rows.length}</b></div>
      <div class="stat"><span class="stat-l">Severe + blocking</span><b class="stat-v">${rows.filter((r) => sevRank(r.sev) >= 3).length}</b></div>
      <div class="stat"><span class="stat-l">Zones with reports</span><b class="stat-v">${Object.keys(bySec).length}</b><span class="stat-u">/ 16</span></div>
    </div>
    <div class="dash-grid">
      <section><p class="label">Reports by category</p>
        ${cats.map((c) => { const n = rows.filter((r) => r.cats.includes(c.key)).length; return `<div class="dbar" data-hov><span>${esc(c.label)}</span><i style="width:${(n / catMax) * 100}%;background:${c.color}"></i><b class="mono">${n}</b></div>`; }).join("")}
      </section>
      <section><p class="label">Zones · total and severe</p>
        <table class="dtable"><thead><tr><th>Zone</th><th class="num">All</th><th class="num">Severe+</th><th></th></tr></thead><tbody>
        ${secs.filter((s) => bySec[s]).sort((a, b) => bySec[b].length - bySec[a].length).map((s) => `<tr data-hov><td class="mono">${s}</td><td class="num mono">${bySec[s].length}</td><td class="num mono">${bySec[s].filter((r) => sevRank(r.sev) >= 3).length}</td><td><i class="dt-bar" style="width:${(bySec[s].length / maxSec) * 100}%"></i></td></tr>`).join("")}
        </tbody></table>
      </section>
      <section class="dash-wide"><p class="label">Category × zone matrix</p>
        <div class="matrix" style="grid-template-columns: 110px repeat(${secs.length}, 1fr)">
          <span></span>${secs.map((s) => `<span class="mx-h mono">${s}</span>`).join("")}
          ${cats.map((c) => `<span class="mx-l">${esc(c.label)}</span>${secs.map((s) => { const n = cell(s, c.key); return `<span class="mx-c" data-hov title="${esc(c.label)} · ${s}: ${n}" style="background:${n ? c.color : "transparent"};opacity:${n ? 0.18 + (n / maxCell) * 0.82 : 1}">${n || ""}</span>`; }).join("")}`).join("")}
        </div>
      </section>
    </div></div>`;
  $$("[data-hov]", host).forEach((el) => el.addEventListener("mouseenter", () => ix++));
}

// ── Stimulus: 2D / 3D map ─────────────────────────────────────────────
function teardownMap() {
  if (smap) {
    smap.remove();
    smap = null;
    answerMarker = null;
  }
}

function renderStudyMap(host, cond) {
  teardownMap();
  host.innerHTML = `<div id="st-map" class="st-map"></div><div class="st-legend mono">${CATS.filter((c) => D.rows.some((r) => r.cats.includes(c.key)))
    .map((c) => `<span><i style="background:${c.color}"></i>${esc(c.label)}</span>`)
    .join("")}${cond === "map3d" ? `<span class="sep">Column height = number of reports · colour = worst severity</span>` : ""}</div>`;
  const is3d = cond === "map3d";
  const b = D.city.bbox;
  smap = new maplibregl.Map({
    container: "st-map",
    style: mapStyle(),
    bounds: [[b[0], b[1]], [b[2], b[3]]],
    fitBoundsOptions: { padding: 30 },
    pitch: is3d ? 55 : 0,
    bearing: is3d ? -18 : 0,
    maxPitch: is3d ? 75 : 0,
    dragRotate: is3d,
    pitchWithRotate: is3d,
    attributionControl: false,
  });
  smap.addControl(new maplibregl.NavigationControl({ showCompass: is3d, visualizePitch: is3d }), "top-left");
  ["zoomend", "dragend", "rotateend", "pitchend"].forEach((e) => smap.on(e, () => ix++));
  smap.on("click", (e) => {
    if (!mapClick) return;
    ix++;
    if (!answerMarker) {
      const el = document.createElement("div");
      el.className = "pin-marker";
      el.innerHTML = "<span></span>";
      answerMarker = new maplibregl.Marker({ element: el, anchor: "bottom" });
    }
    answerMarker.setLngLat(e.lngLat).addTo(smap);
    mapClick(e.lngLat);
  });
  smap.on("load", () => {
    smap.setLayoutProperty("building", "visibility", is3d ? "visible" : "none");
    const rows = dataset();
    // zone grid
    const lines = [], labels = [];
    for (let i = 0; i <= 4; i++) {
      const x = b[0] + (i / 4) * (b[2] - b[0]);
      lines.push([[x, b[1]], [x, b[3]]]);
      const y = b[1] + (i / ROWS) * (b[3] - b[1]);
      lines.push([[b[0], y], [b[2], y]]);
    }
    allSectors().forEach((s) => {
      const c = sectorCenter(s);
      const nw = { lng: b[0] + (COLS.indexOf(s[0]) / 4) * (b[2] - b[0]), lat: b[3] - ((+s[1] - 1) / ROWS) * (b[3] - b[1]) };
      labels.push({ type: "Feature", geometry: { type: "Point", coordinates: [nw.lng + (b[2] - b[0]) * 0.02, nw.lat - (b[3] - b[1]) * 0.03] }, properties: { s } });
    });
    smap.addSource("grid", { type: "geojson", data: { type: "Feature", geometry: { type: "MultiLineString", coordinates: lines } } });
    smap.addLayer({ id: "grid", type: "line", source: "grid", paint: { "line-color": "#10231A", "line-opacity": 0.5, "line-width": 1, "line-dasharray": [3, 3] } });
    smap.addSource("glab", { type: "geojson", data: { type: "FeatureCollection", features: labels } });
    smap.addLayer({ id: "glab", type: "symbol", source: "glab", layout: { "text-field": ["get", "s"], "text-font": ["Noto Sans Bold"], "text-size": 13, "text-anchor": "top-left" }, paint: { "text-color": "#0B1F3A", "text-halo-color": "#FFFFFF", "text-halo-width": 2 } });
    smap.addSource("pts", {
      type: "geojson",
      data: { type: "FeatureCollection", features: rows.map((r) => ({ type: "Feature", geometry: { type: "Point", coordinates: [r.lng, r.lat] }, properties: { color: catMeta(r.cats[0]).color } })) },
    });
    if (is3d) {
      const span = (b[2] - b[0]) * 111 * 1000;
      const size = Math.max(250, span / 45);
      const hx = hexBin(rows, D.city, size);
      const max = Math.max(1, ...hx.map((h) => h.items.length));
      smap.addSource("hex", {
        type: "geojson",
        data: { type: "FeatureCollection", features: hx.map((h) => ({ type: "Feature", geometry: { type: "Polygon", coordinates: [h.ring] }, properties: { h: 60 + (h.items.length / max) * size * 4.2, sev: Math.max(...h.items.map((r) => sevRank(r.sev))) } })) },
      });
      smap.addLayer({
        id: "hex",
        type: "fill-extrusion",
        source: "hex",
        paint: { "fill-extrusion-color": ["match", ["get", "sev"], 1, SEV_COLORS[1], 2, SEV_COLORS[2], 3, SEV_COLORS[3], 4, SEV_COLORS[4], SEV_COLORS[0]], "fill-extrusion-height": ["get", "h"], "fill-extrusion-opacity": 0.85 },
      });
    }
    smap.addLayer({
      id: "pts",
      type: "circle",
      source: "pts",
      paint: { "circle-color": ["get", "color"], "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 3, 15, 7], "circle-stroke-color": "#FAFBF8", "circle-stroke-width": 1.2, "circle-pitch-alignment": "map" },
    });
  });
}

// ── Results ───────────────────────────────────────────────────────────
function resultsHTML(sessions) {
  if (!sessions.length) return `<div class="st-results"><p class="label">Results</p><p class="muted">No sessions yet on this device.</p></div>`;
  const all = sessions.flatMap((s, si) => s.answers.map((a, ai) => ({ ...a, pid: s.pid, si, ai })));
  const conds = Object.keys(CONDS);
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const accBy = (c, t) => {
    const a = all.filter((x) => x.cond === c && (!t || x.task === t) && x.correct != null);
    return a.length ? mean(a.map((x) => (x.correct ? 1 : 0))) : null;
  };
  const timeBy = (c) => mean(all.filter((x) => x.cond === c && x.task !== "explain").map((x) => x.ms / 1000));
  const lk = (c, k) => mean(sessions.map((s) => s.likert?.[c]?.[k]).filter(Boolean));
  const rubric = (c) => {
    const a = all.filter((x) => x.cond === c && x.task === "explain" && x.rubric != null);
    return a.length ? mean(a.map((x) => x.rubric)) : null;
  };
  const firsts = (c) => sessions.filter((s) => s.final?.rank?.[0] === c).length;
  const bar = (v, max, color) => `<span class="rbar"><i style="width:${v == null ? 0 : (v / max) * 100}%;background:${color}"></i></span>`;
  const colors = { map2d: "#7D93F0", dash: "#6B7A70", map3d: "#1FA34A" };
  const pct = (v) => (v == null ? "n/a" : Math.round(v * 100) + "%");
  const metrics = [
    ["RQ1 · Cluster accuracy", (c) => accBy(c, "cluster"), 1, pct],
    ["RQ1 · Cluster error (km)", (c) => mean(all.filter((x) => x.cond === c && x.errorKm != null).map((x) => x.errorKm)), Math.max(1, ...conds.map((c) => mean(all.filter((x) => x.cond === c && x.errorKm != null).map((x) => x.errorKm)))), (v) => v.toFixed(2)],
    ["RQ2 · Relationship accuracy", (c) => accBy(c, "relation"), 1, pct],
    ["Severity comparison accuracy", (c) => accBy(c, "severity"), 1, pct],
    ["RQ3 · Mean time per task (s)", timeBy, Math.max(1, ...conds.map(timeBy)), (v) => v.toFixed(1)],
    ["RQ3 · “Navigation was hard” (1–7)", (c) => lk(c, "nav"), 7, (v) => v.toFixed(1)],
    ["RQ3 · Interactions per task", (c) => mean(all.filter((x) => x.cond === c).map((x) => x.interactions)), Math.max(1, ...conds.map((c) => mean(all.filter((x) => x.cond === c).map((x) => x.interactions)))), (v) => v.toFixed(1)],
    ["RQ4 · Explanation names right zone", (c) => { const a = all.filter((x) => x.cond === c && x.task === "explain"); return a.length ? mean(a.map((x) => (x.mentionsZone ? 1 : 0))) : null; }, 1, pct],
    ["RQ4 · Researcher rubric (0–2)", rubric, 2, (v) => (v == null ? "n/a" : v.toFixed(2))],
    ["RQ4 · Ranked 1st for explaining", firsts, Math.max(1, sessions.length), (v) => v + ""],
  ];
  return `<div class="st-results">
    <div class="sec-h"><span class="label">Results · ${sessions.length} session${sessions.length > 1 ? "s" : ""} on this device</span>
      <span><button class="link-btn mono" id="st-csv">Export CSV</button> · <button class="link-btn mono" id="st-json">Export JSON</button> · <button class="link-btn mono" id="st-clear">Clear</button></span></div>
    <table class="rtable"><thead><tr><th>Measure</th>${conds.map((c) => `<th><i class="sw" style="background:${colors[c]}"></i>${CONDS[c].name}</th>`).join("")}</tr></thead>
    <tbody>${metrics.map(([l, f, max, fmt]) => `<tr><td>${l}</td>${conds.map((c) => { const v = f(c); return `<td>${bar(v, max, colors[c])}<span class="mono">${v == null || Number.isNaN(v) ? "n/a" : fmt(v)}</span></td>`; }).join("")}</tr>`).join("")}</tbody></table>
    <div class="sec-h"><span class="label">Explanations · score each 0 (wrong) · 1 (partly) · 2 (accurate)</span></div>
    <div class="expl">${all
      .filter((x) => x.task === "explain")
      .map((x) => {
        const T = sessions[x.si].tasks[x.order - 1];
        return `<div class="expl-row"><span class="mono">${esc(x.pid)} · ${CONDS[x.cond].short}</span>
        <p>${esc(x.answer.text)}</p>
        <span class="mono muted small">Truth: ${esc(catMeta(T.cluster.focus).label)} clusters in ${T.cluster.truth || "n/a"} · conf ${x.answer.conf}/5 ${x.mentionsZone ? "· names zone ✓" : ""}</span>
        <span class="rub" data-si="${x.si}" data-ai="${x.ai}">${[0, 1, 2].map((n) => `<button class="${x.rubric === n ? "on" : ""}" data-n="${n}">${n}</button>`).join("")}</span></div>`;
      })
      .join("")}</div>
  </div>`;
}

function bindResults() {
  $$(".rub button").forEach((b) =>
    b.addEventListener("click", () => {
      const p = b.parentElement, all = store.get(KEY, []);
      all[+p.dataset.si].answers[+p.dataset.ai].rubric = +b.dataset.n;
      store.set(KEY, all);
      render();
    }),
  );
  $("#st-json")?.addEventListener("click", () => download("dumpspot-study.json", JSON.stringify(store.get(KEY, []), null, 2), "application/json"));
  $("#st-csv")?.addEventListener("click", () => {
    const head = ["pid", "city", "order", "condition", "task", "ms", "interactions", "correct", "truth", "answer", "error_km", "mentions_zone", "mentions_category", "words", "rubric", "confidence", "lk_clusters", "lk_relations", "lk_nav", "lk_confident", "rank1", "rank2", "rank3"];
    const lines = [head.join(",")];
    store.get(KEY, []).forEach((s) =>
      s.answers.forEach((a) => {
        const l = s.likert?.[a.cond] || {};
        const ans = a.answer?.sector || a.answer?.choice || a.answer?.text || "";
        lines.push([s.pid, s.city, a.order, a.cond, a.task, a.ms, a.interactions, a.correct, a.truth, ans, a.errorKm, a.mentionsZone, a.mentionsCat, a.words, a.rubric, a.answer?.conf, l.clusters, l.relations, l.nav, l.confident, ...(s.final?.rank || [])].map(csv).join(","));
      }),
    );
    download("dumpspot-study.csv", lines.join("\n"), "text/csv");
  });
  $("#st-clear")?.addEventListener("click", () => {
    if (!confirm("Delete all study sessions stored in this browser? Export first if you need them. This can't be undone.")) return;
    store.set(KEY, []);
    render();
  });
}
const csv = (v) => (v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
function download(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
