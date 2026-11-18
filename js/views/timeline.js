// Daily histogram with a draggable brush. The brush filters every view.
import { $, DAY, fmtDate, clamp } from "../lib/util.js";
import { S, setRange, on } from "../core/state.js";
import { sevRank, SEV_COLORS } from "../data/derive.js";

export function mountTimeline(host) {
  host.innerHTML = `
    <div class="tl-head">
      <span class="label">Reports per day <small>drag to pick dates</small></span>
      <span class="tl-range mono" id="tl-range">All time</span>
      <button class="link-btn mono" id="tl-reset" hidden>Reset</button>
    </div>
    <div class="tl-plot" id="tl-plot">
      <svg id="tl-svg" preserveAspectRatio="none"></svg>
      <div class="tl-brush" id="tl-brush"><i></i><i></i></div>
      <div class="tl-tip mono" id="tl-tip"></div>
    </div>
    <div class="tl-axis mono" id="tl-axis"></div>`;
  const plot = $("#tl-plot", host), brush = $("#tl-brush", host), tip = $("#tl-tip", host);
  let bins = [], t0 = 0, t1 = 0, drag = null;

  function draw() {
    const rows = S.inCity;
    const svg = $("#tl-svg", host);
    const W = plot.clientWidth, H = plot.clientHeight;
    if (!W) return;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    if (!rows.length) {
      svg.innerHTML = "";
      $("#tl-axis", host).innerHTML = "";
      return;
    }
    const now = new Date().setHours(23, 59, 59, 999);
    const first = Math.min(...rows.map((r) => +new Date(r.ts)));
    const days = clamp(Math.ceil((now - first) / DAY) + 1, 14, 400);
    const per = Math.max(1, Math.ceil(days / 90));
    const n = Math.ceil(days / per);
    t1 = now;
    t0 = now - n * per * DAY;
    bins = Array.from({ length: n }, (_, i) => ({ a: t0 + i * per * DAY, b: t0 + (i + 1) * per * DAY, n: 0, s: [0, 0, 0, 0, 0] }));
    for (const r of rows) {
      const i = Math.floor((+new Date(r.ts) - t0) / (per * DAY));
      if (bins[i]) bins[i].n++, bins[i].s[sevRank(r.sev)]++;
    }
    const max = Math.max(...bins.map((b) => b.n), 1);
    const bw = W / n;
    let out = "";
    bins.forEach((b, i) => {
      let y = H;
      for (let s = 4; s >= 0; s--) {
        if (!b.s[s]) continue;
        const h = (b.s[s] / max) * (H - 6);
        y -= h;
        out += `<rect x="${(i * bw + 0.5).toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(1, bw - 1.5).toFixed(1)}" height="${h.toFixed(1)}" fill="${SEV_COLORS[s]}"/>`;
      }
    });
    out += `<line x1="0" x2="${W}" y1="${H - 0.5}" y2="${H - 0.5}" stroke="rgba(20,22,19,.28)"/>`;
    svg.innerHTML = out;
    const ticks = 5;
    $("#tl-axis", host).innerHTML = Array.from({ length: ticks }, (_, i) => `<span>${fmtDate(t0 + ((t1 - t0) * i) / (ticks - 1), { day: "2-digit", month: "short" })}</span>`).join("");
    paintBrush();
  }

  const xToT = (x) => t0 + (clamp(x, 0, plot.clientWidth) / plot.clientWidth) * (t1 - t0);
  const tToX = (t) => ((t - t0) / (t1 - t0)) * plot.clientWidth;

  function paintBrush() {
    const r = S.range;
    brush.style.display = r ? "block" : "none";
    $("#tl-reset", host).hidden = !r;
    $("#tl-range", host).textContent = r
      ? `${fmtDate(r[0], { day: "2-digit", month: "short" })} → ${fmtDate(r[1], { day: "2-digit", month: "short" })}`
      : "All time";
    if (!r) return;
    const a = tToX(Math.max(r[0], t0)), b = tToX(Math.min(r[1], t1));
    brush.style.left = a + "px";
    brush.style.width = Math.max(2, b - a) + "px";
  }

  plot.addEventListener("pointerdown", (e) => {
    const x = e.clientX - plot.getBoundingClientRect().left;
    drag = { x };
    plot.setPointerCapture(e.pointerId);
  });
  plot.addEventListener("pointermove", (e) => {
    const x = e.clientX - plot.getBoundingClientRect().left;
    if (drag) {
      const a = Math.min(drag.x, x), b = Math.max(drag.x, x);
      if (b - a > 3) {
        S.range = [xToT(a), xToT(b)];
        paintBrush();
      }
    }
    const i = Math.floor((x / plot.clientWidth) * bins.length);
    const bn = bins[i];
    if (bn) {
      tip.style.left = clamp(x, 40, plot.clientWidth - 40) + "px";
      tip.textContent = `${fmtDate(bn.a, { day: "2-digit", month: "short" })} · ${bn.n} report${bn.n === 1 ? "" : "s"}`;
      tip.classList.add("on");
    }
  });
  plot.addEventListener("pointerleave", () => tip.classList.remove("on"));
  plot.addEventListener("pointerup", (e) => {
    const x = e.clientX - plot.getBoundingClientRect().left;
    if (drag && Math.abs(x - drag.x) <= 3) {
      // click: select that bin
      const i = Math.floor((x / plot.clientWidth) * bins.length);
      if (bins[i]) setRange([bins[i].a, bins[i].b]);
    } else if (drag) setRange(S.range);
    drag = null;
    paintBrush();
  });
  $("#tl-reset", host).addEventListener("click", () => {
    setRange(null);
    paintBrush();
  });
  plot.addEventListener("dblclick", () => setRange(null));

  on("data", draw);
  on("filter", paintBrush);
  new ResizeObserver(draw).observe(plot);
  return { draw };
}
