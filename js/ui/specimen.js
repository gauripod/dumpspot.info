// Specimens: every report, pressed like a plant on a herbarium sheet (p5.js, LGPL-2.1).
//
// The drawing is generated from the report itself, so no two are alike and the same report
// always grows the same plant. Every visual choice encodes a field:
//
//   stems      one per category (up to 3); the leaf shape is the category's own
//   leaves     more tags on the report, more leaves on each stem
//   height     time on the record: a report filed today is a sprout, one from months ago is tall
//   lean       the hour it was reported: morning reports lean east, evening reports lean west
//   flowers    one seed head per photo (up to 3), in pollen
//   stains     clay stains in the soil, one per severity step
//
// The plant grows in when it scrolls into view, and sways while the pointer is over it.
import { sevRank, sevLabel, CATS } from "../data/derive.js";

const P5_URL = "https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.11.1/p5.min.js";
let loading = null;
export function loadP5() {
  if (window.p5) return Promise.resolve(window.p5);
  return (loading ||= new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = P5_URL;
    s.async = true;
    s.onload = () => res(window.p5);
    s.onerror = () => rej(new Error("p5 unavailable"));
    document.head.appendChild(s);
  }));
}

// Printed as a cyanotype, the way Anna Atkins printed pressed plants in 1843: the sheet is Prussian
// blue and the plant leaves a white shadow. Seed heads and severity stains are pollen yellow.
const LINE = "#FFFFFF", LEAF = "rgba(255,255,255,0.92)", LEAF_B = "rgba(255,255,255,0.72)", POLLEN = "#FFD23F", SHEET = "#2448D8", VEIN = "#2448D8";

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) (h ^= str.charCodeAt(i)), (h = Math.imul(h, 16777619));
  return h >>> 0;
}
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// What the drawing encodes, read from a report row. Used by the drawing and by the key under it.
export function readReport(r) {
  const cats = (r.cats?.length ? r.cats : ["Other"]).slice(0, 3);
  const tags = (r.type?.length || 0) + (r.sev?.length || 0);
  const days = Math.max(0, (Date.now() - new Date(r.ts).getTime()) / 864e5) || 0;
  const hour = new Date(r.ts).getHours();
  return {
    seed: hash(String(r.id)),
    cats,
    // Each category keeps its own leaf: its place in the category list picks one of four shapes.
    forms: cats.map((c) => {
      const i = CATS.findIndex((x) => x.key === c);
      return (i < 0 ? hash(c) : i) % 4;
    }),
    leaves: Math.min(9, 3 + tags),
    tags,
    days,
    grow: 0.62 + 0.38 * Math.min(1, Math.log1p(days) / Math.log1p(120)),
    hour: isNaN(hour) ? 12 : hour,
    lean: isNaN(hour) ? 0 : Math.max(-1, Math.min(1, (12 - hour) / 7)),
    flowers: Math.min(3, r.photos?.length || 0),
    sev: sevRank(r.sev || []),
  };
}

export function specimenKey(r) {
  const k = readReport(r);
  const d = k.days < 1 ? "today" : `${Math.round(k.days)} day${Math.round(k.days) === 1 ? "" : "s"} ago`;
  const h = k.hour === 0 ? "midnight" : k.hour < 12 ? `${k.hour} am` : k.hour === 12 ? "noon" : `${k.hour - 12} pm`;
  return [
    ["Stems", `${k.cats.length} ${k.cats.length === 1 ? "category" : "categories"}`],
    ["Leaves", `${k.tags} tag${k.tags === 1 ? "" : "s"}`],
    ["Height", `filed ${d}`],
    ["Lean", `reported at ${h}`],
    ["Seed heads", `${k.flowers} photo${k.flowers === 1 ? "" : "s"}`],
    ["Stains", sevLabel(k.sev)],
  ];
}

// Leaf outlines in local space: base at (0,0), tip at (0,-L).
function leaf(p, form, L, W) {
  p.beginShape();
  if (form === 0) {
    // ovate
    p.vertex(0, 0);
    p.bezierVertex(W, -L * 0.15, W * 0.9, -L * 0.75, 0, -L);
    p.bezierVertex(-W * 0.9, -L * 0.75, -W, -L * 0.15, 0, 0);
  } else if (form === 1) {
    // lanceolate
    p.vertex(0, 0);
    p.bezierVertex(W * 0.55, -L * 0.3, W * 0.4, -L * 0.8, 0, -L * 1.15);
    p.bezierVertex(-W * 0.4, -L * 0.8, -W * 0.55, -L * 0.3, 0, 0);
  } else if (form === 2) {
    // round, on a short stalk
    p.vertex(0, 0);
    p.vertex(0, -L * 0.3);
    p.bezierVertex(W * 1.3, -L * 0.3, W * 1.3, -L * 1.05, 0, -L * 1.05);
    p.bezierVertex(-W * 1.3, -L * 1.05, -W * 1.3, -L * 0.3, 0, -L * 0.3);
  } else {
    p.endShape();
    // pinnate: a midrib with small leaflets
    p.line(0, 0, 0, -L * 1.1);
    for (let i = 1; i <= 4; i++) {
      const y = -L * (0.2 + i * 0.2), s = W * (1 - i * 0.15);
      for (const side of [-1, 1]) {
        p.push();
        p.translate(0, y);
        p.rotate(side * 1.0);
        p.ellipse(0, -s * 0.7, s * 0.7, s * 1.5);
        p.pop();
      }
    }
    return;
  }
  p.endShape(p.CLOSE);
}

// Mount a specimen into `host` for report `r`. Returns a cleanup function.
export function mountSpecimen(host, r, { aspect = 0.75, instant = false } = {}) {
  let inst = null, io = null, dead = false;
  host.classList.add("specimen");
  host.innerHTML = `<div class="specimen-sheet" aria-hidden="true"></div>`;
  const sheet = host.firstElementChild;
  const k = readReport(r);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  loadP5()
    .then((P5) => {
      if (dead) return;
      inst = new P5((p) => {
        const W = () => sheet.clientWidth || 360;
        const H0 = () => Math.round(Math.min(420, W() * aspect));
        let plant, t0 = null, hover = false, grain;
        const R = rng(k.seed);

        function build() {
          const w = W(), h = H0(), ground = h * 0.8, z = h / 300;
          const n = k.cats.length;
          const stems = [];
          for (let i = 0; i < n; i++) {
            const x0 = w / 2 + (i - (n - 1) / 2) * Math.min(56 * z, w / 5) + (R() - 0.5) * 14;
            const H = (h * 0.62 - i * 12) * k.grow * (0.86 + R() * 0.2);
            const bend = (R() - 0.5) * 40 * z, lean = (k.lean * 60 + (i - (n - 1) / 2) * 22) * z;
            const pts = [];
            for (let j = 0; j <= 30; j++) {
              const u = j / 30;
              pts.push([x0 + lean * u * u + bend * Math.sin(u * Math.PI), ground - H * u]);
            }
            const leaves = [];
            for (let j = 0; j < k.leaves; j++) {
              const u = 0.18 + (j / Math.max(1, k.leaves - 1)) * 0.72 + (R() - 0.5) * 0.04;
              const side = j % 2 ? 1 : -1;
              leaves.push({ u, side, a: side * (0.7 + R() * 0.5), L: (20 + R() * 12) * (1.1 - u * 0.5) * (0.7 + k.grow * 0.35) * (n > 2 ? 0.85 : 1) * z, Wd: (7 + R() * 4) * z });
            }
            const heads = i < k.flowers ? [{ r: 3 + R() * 2 }] : [];
            stems.push({ pts, leaves, form: k.forms[i], heads, tape: 0.25 + R() * 0.2, tapeA: (R() - 0.5) * 0.4 });
          }
          // roots and stains
          const roots = [];
          for (let i = 0; i < 6; i++) {
            const x = w / 2 + (R() - 0.5) * 40 * z, seg = [];
            let y = ground, a = Math.PI / 2 + (R() - 0.5) * 1.4;
            let xx = x;
            for (let j = 0; j < 8; j++) {
              seg.push([xx, y]);
              a += (R() - 0.5) * 0.5;
              xx += Math.cos(a) * 4 * z;
              y += Math.sin(a) * 4 * z;
            }
            roots.push(seg);
          }
          const stains = [];
          for (let i = 0; i < k.sev; i++) stains.push({ x: w / 2 + (R() - 0.5) * w * 0.5, y: ground + 14 + R() * (h - ground - 26), r: (7 + R() * 9 + i * 2) * z, s: R() * 100 });
          plant = { w, h, ground, stems, roots, stains };
        }

        p.setup = () => {
          p.pixelDensity(Math.min(2, devicePixelRatio || 1));
          p.createCanvas(W(), H0()).parent(sheet);
          build();
          grain = p.createGraphics(p.width, p.height);
          grain.pixelDensity(1);
          grain.noStroke();
          const G = rng(k.seed ^ 0x9e37);
          for (let i = 0; i < (p.width * p.height) / 60; i++) {
            grain.fill(255, 255, 255, G() * 22);
            grain.rect(G() * p.width, G() * p.height, 1, 1);
          }
          p.noLoop();
          if (reduce || instant) (t0 = -1e6), p.redraw();
          else {
            io = new IntersectionObserver((es) => {
              if (es.some((e) => e.isIntersecting)) {
                t0 = p.millis();
                p.loop();
                io.disconnect();
              }
            }, { threshold: 0.3 });
            io.observe(sheet);
            p.redraw();
          }
        };

        p.draw = () => {
          const prog = t0 == null ? 0 : Math.min(1, (p.millis() - t0) / 1800);
          const ease = 1 - Math.pow(1 - prog, 3);
          const time = p.millis() / 1000;
          p.background(SHEET);
          p.image(grain, 0, 0);
          const { w, ground, stems, roots, stains } = plant;

          // soil line and stains (the problem, under the ground)
          p.stroke(LINE);
          p.strokeWeight(1);
          p.line(w * 0.18, ground, w * 0.18 + (w * 0.64) * Math.min(1, ease * 3), ground);
          p.noStroke();
          for (const s of stains) {
            p.fill(255, 210, 63, 120 * Math.min(1, ease * 2));
            p.beginShape();
            for (let a = 0; a < Math.PI * 2; a += 0.35) {
              const rr = s.r * (0.75 + p.noise(s.s + Math.cos(a), s.s + Math.sin(a)) * 0.5);
              p.curveVertex(s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr * 0.6);
            }
            p.endShape(p.CLOSE);
          }
          p.noFill();
          p.stroke(255, 255, 255, 150);
          p.strokeWeight(0.7);
          for (const seg of roots) {
            const m = Math.max(2, Math.floor(seg.length * Math.min(1, ease * 2.5)));
            p.beginShape();
            seg.slice(0, m).forEach(([x, y]) => p.vertex(x, y));
            p.endShape();
          }

          // stems, leaves, seed heads
          stems.forEach((st, si) => {
            const grown = Math.max(0, Math.min(1, ease * 1.15 - si * 0.08));
            const m = Math.max(1, Math.floor(st.pts.length * grown));
            const sway = (u) => (hover && !reduce ? Math.sin(time * 1.6 + si + u * 3) * 5 * u * u : 0);
            const at = (u) => {
              const f = u * (st.pts.length - 1), i = Math.floor(f), q = f - i;
              const a = st.pts[i], b = st.pts[Math.min(st.pts.length - 1, i + 1)];
              return [a[0] + (b[0] - a[0]) * q + sway(u), a[1] + (b[1] - a[1]) * q];
            };
            p.noFill();
            p.stroke(LINE);
            p.strokeWeight(1.2);
            p.beginShape();
            for (let i = 0; i < m; i++) {
              const [x, y] = at(i / (st.pts.length - 1));
              p.vertex(x, y);
            }
            p.endShape();

            for (const lf of st.leaves) {
              const show = Math.max(0, Math.min(1, (grown - lf.u) * 5));
              if (!show) continue;
              const [x, y] = at(lf.u);
              const [x2, y2] = at(Math.min(1, lf.u + 0.02));
              const dir = Math.atan2(y2 - y, x2 - x) + Math.PI / 2;
              p.push();
              p.translate(x, y);
              p.rotate(dir + lf.a + (hover && !reduce ? Math.sin(time * 2 + lf.u * 9) * 0.06 : 0));
              p.scale(show);
              p.fill(lf.side > 0 ? LEAF : LEAF_B);
              p.stroke(LINE);
              p.strokeWeight(0.8);
              leaf(p, st.form, lf.L, lf.Wd);
              p.stroke(VEIN);
              p.strokeWeight(0.6);
              if (st.form !== 3) p.line(0, -lf.L * 0.1, 0, -lf.L * 0.8);
              p.pop();
            }

            // herbarium tape across the stem
            if (grown > st.tape) {
              const [x, y] = at(st.tape);
              p.push();
              p.translate(x, y);
              p.rotate(st.tapeA);
              p.noStroke();
              p.fill(255, 255, 255, 70);
              p.rect(-14, -4, 28, 8);
              p.pop();
            }

            if (grown >= 1)
              for (const hd of st.heads) {
                const [x, y] = at(1);
                p.stroke(LINE);
                p.strokeWeight(0.8);
                p.fill(POLLEN);
                const pulse = 1 + (hover && !reduce ? Math.sin(time * 3 + si) * 0.08 : 0);
                p.circle(x, y - hd.r, hd.r * 2.4 * pulse);
                p.noStroke();
                p.fill(SHEET);
                for (let a = 0; a < 6; a++) p.circle(x + Math.cos(a) * hd.r * 0.6, y - hd.r + Math.sin(a) * hd.r * 0.6, 1.4);
              }
          });

          if (prog >= 1 && !hover) p.noLoop();
        };

        sheet.addEventListener("pointerenter", () => ((hover = true), p.loop()));
        sheet.addEventListener("pointerleave", () => ((hover = false), p.redraw()));
      });
    })
    .catch(() => {
      host.classList.add("specimen-off");
      sheet.innerHTML = `<p class="t-small muted">The specimen drawing needs p5.js, which didn't load.</p>`;
    });

  return () => {
    dead = true;
    io?.disconnect();
    inst?.remove();
  };
}

// The full card: sheet, a herbarium label, and the key that says what each mark means.
export function specimenCard(r, { label = "", key = true } = {}) {
  const rows = specimenKey(r);
  return `<figure class="spec-card">
    <div class="spec-mount" data-spec="${String(r.id).replace(/"/g, "")}"></div>
    <figcaption>
      ${label ? `<p class="label">${label}</p>` : ""}
      ${key ? `<details class="spec-more"><summary>How to read this drawing</summary><dl class="spec-key">${rows.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join("")}</dl></details>` : ""}
    </figcaption>
  </figure>`;
}

// Mount every [data-spec] inside root using rows looked up by id.
export function mountAll(root, byId, opts) {
  const off = [];
  root.querySelectorAll("[data-spec]").forEach((el) => {
    const r = byId(el.dataset.spec);
    if (r) off.push(mountSpecimen(el, r, opts));
  });
  return () => off.forEach((f) => f());
}
