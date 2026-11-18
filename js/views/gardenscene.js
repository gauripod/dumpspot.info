// ── The living garden (p5.js) ─────────────────────────────────────────
// A painted panorama. Trees stand on rolling hills in the order they were earned: the oldest on
// the left, the newest on the right, so you walk the garden through time. Each tree is drawn
// once into its own sprite from its data (stage sets its size, its seed sets its shape) and then
// sways in the wind. The sky follows the visitor's own clock: dawn, day, dusk or night, with
// fireflies after dark. Spot wanders along the front. Hover a tree for its story; click to keep it.
const SKIES = {
  dawn: { top: "#9fb7ff", bottom: "#ffd9c4", haze: "#f6dccf", sun: "#fff1c9", hill: ["#a9c7a0", "#86b483", "#5f9b63", "#3f7f48"] },
  day: { top: "#7fc0f5", bottom: "#e8f5ff", haze: "#dbecf7", sun: "#fffbe6", hill: ["#b6d9a6", "#8fc67f", "#62ad5c", "#3c9146"] },
  dusk: { top: "#4b4fb8", bottom: "#ff9f72", haze: "#c99aa6", sun: "#ffd27a", hill: ["#8b8fa9", "#6b7f86", "#4c6d5b", "#2f5640"] },
  night: { top: "#0b1433", bottom: "#27386e", haze: "#34436f", sun: "#f4f1d0", hill: ["#2c3b5c", "#22364a", "#1a3038", "#12282a"] },
};
const skyNow = () => {
  const h = new Date().getHours();
  return h >= 5 && h < 8 ? "dawn" : h >= 8 && h < 17 ? "day" : h >= 17 && h < 20 ? "dusk" : "night";
};
const LEAVES = {
  dawn: ["#2f7d43", "#3f9a4f", "#5bb35f", "#86c86a", "#a7d77a"],
  day: ["#1e7a3a", "#2a9446", "#3daf50", "#5cc45e", "#8ad66b"],
  dusk: ["#2c5a45", "#3a6e4c", "#4f8452", "#6b9a5a", "#8aa865"],
  night: ["#173a3a", "#1f4a44", "#2a5a4c", "#356a55", "#41785c"],
};

export function createGardenScene(host, P5, { onHover, onPick, spotSVG }) {
  let trees = [], sky = skyNow(), sel = null, hov = null, hl = null;
  let camX = 0, velX = 0, drag = null, mx = 0, my = 0, W = 0, H = 0, worldW = 0, t0 = 0, ready = false;
  const flies = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random(), p: Math.random() * 6.28 }));
  let spotImg = null, spot = { x: 140, dir: 1, face: 1, v: 0, phase: 0, state: "walk", timer: 4 };

  const inst = new P5((p) => {
    p.setup = () => {
      W = host.clientWidth;
      H = host.clientHeight;
      p.pixelDensity(Math.min(2, devicePixelRatio || 1));
      p.createCanvas(W, H).parent(host);
      p.noiseSeed(7);
      t0 = p.millis();
      ready = true;
    };
    p.windowResized = () => {
      if (!host.clientWidth) return;
      W = host.clientWidth;
      H = host.clientHeight;
      p.resizeCanvas(W, H);
      layout();
    };

    p.draw = () => {
      const S = SKIES[sky], time = p.millis() / 1000;
      // camera: inertia when released, gentle drift otherwise
      if (!drag) {
        camX += velX;
        velX *= 0.93;
      }
      camX = Math.max(0, Math.min(Math.max(0, worldW - W), camX));
      const px = (mx / W - 0.5) * 2, py = (my / H - 0.5) * 2;

      // sky
      const g = p.drawingContext.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, S.top);
      g.addColorStop(1, S.bottom);
      p.drawingContext.fillStyle = g;
      p.drawingContext.fillRect(0, 0, W, H);
      // sun or moon, drifting slightly with the pointer
      p.noStroke();
      const sx = W * 0.78 - px * 10, sy = H * (sky === "day" ? 0.16 : 0.3) - py * 6;
      for (let i = 5; i > 0; i--) {
        p.fill(p.color(S.sun + Math.round(20 / i).toString(16).padStart(2, "0")));
        p.circle(sx, sy, 50 + i * 26);
      }
      p.fill(S.sun);
      p.circle(sx, sy, 54);
      if (sky === "night") {
        p.fill(255, 255, 255, 170);
        for (let i = 0; i < 90; i++) {
          const x = (p.noise(i * 9.1) * W * 1.6 - camX * 0.02) % W, y = p.noise(i * 3.3) * H * 0.5;
          p.circle((x + W) % W, y, 1 + (i % 3 === 0 ? 1 : 0));
        }
      }

      // four bands of hills, far to near; trees of each band stand on its ridge
      for (let band = 0; band < 4; band++) {
        const depth = 0.25 + band * 0.25; // 0.25 far .. 1 near
        const par = 0.35 + depth * 0.65; // parallax factor
        const off = camX * par + px * 14 * depth;
        const base = H * (0.5 + band * 0.12) + py * 6 * depth;
        p.fill(S.hill[band]);
        p.beginShape();
        p.vertex(0, H);
        for (let x = 0; x <= W + 20; x += 20) p.vertex(x, ridge(p, (x + off) / par, band, base));
        p.vertex(W, H);
        p.endShape(p.CLOSE);

        for (const t of trees) {
          if (t.band !== band) continue;
          const x = t.x * par - off;
          if (x < -t.w || x > W + t.w) continue;
          const y = ridge(p, t.x, band, base) + 2;
          // grow in the first time a tree is seen
          if (t.born == null) t.born = time;
          const k = Math.min(1, (time - t.born) / 0.9), grow = k < 1 ? 1 - Math.pow(1 - k, 3) : 1;
          const sway = (p.noise(t.x * 0.01, time * 0.35) - 0.5) * 0.12 * (0.6 + t.stage.scale);
          p.push();
          p.translate(x, y);
          p.rotate(sway);
          const s = grow * (t === hov || t === sel ? 1.06 : 1);
          p.scale(s);
          if (t === sel) {
            p.noFill();
            p.stroke(255, 210, 63);
            p.strokeWeight(3 / s);
            p.ellipse(0, 2, t.w * 0.9, 12);
            p.noStroke();
          }
          if (hl && !hl.has(t.n)) p.tint(255, 70);
          p.image(t.img, -t.w / 2, -t.h);
          if (hl) p.noTint();
          p.pop();
          t.sx = x;
          t.sy = y;
          t.ss = grow;
        }
        // haze between bands
        if (band < 3) {
          const c = p.color(S.haze);
          c.setAlpha(sky === "night" ? 40 : 70);
          p.fill(c);
          p.rect(0, 0, W, H);
        }
      }

      // Spot walks the front ridge, drawn live so the legs really move: a trot, where diagonal
      // legs swing together, knees lift on the forward swing, the body rises and falls twice per
      // stride, ears bounce, the tail wags. Speed eases in and out; turning squashes through
      // the middle. Every so often Spot stops, drops the nose and sniffs.
      {
        const dt = Math.min(0.05, p.deltaTime / 1000);
        const want = spot.state === "sniff" ? 0 : spot.dir * 30; // px per second
        spot.v += (want - spot.v) * Math.min(1, dt * 2.4);
        spot.x += spot.v * dt;
        spot.timer -= dt;
        if (spot.state === "walk" && spot.timer <= 0) (spot.state = "sniff"), (spot.timer = 2 + Math.random() * 1.8);
        else if (spot.state === "sniff" && spot.timer <= 0) (spot.state = "walk"), (spot.timer = 5 + Math.random() * 7), Math.random() < 0.35 && (spot.dir *= -1);
        if (spot.x > W - 70 && spot.dir > 0) spot.dir = -1;
        if (spot.x < 50 && spot.dir < 0) spot.dir = 1;
        spot.face += (spot.dir - spot.face) * Math.min(1, dt * 6);
        // stride: one full leg cycle per ~22px travelled, so feet don't skate
        spot.phase += (Math.abs(spot.v) * dt / 22) * Math.PI * 2;
        const base = H * 0.86 + py * 6;
        const wx = spot.x + camX + px * 14;
        const y = ridge(p, wx, 3, base);
        const slope = Math.atan2(ridge(p, wx + 12, 3, base) - ridge(p, wx - 12, 3, base), 24);
        const moving = Math.min(1, Math.abs(spot.v) / 30);
        p.push();
        p.translate(spot.x, y);
        p.rotate(slope * 0.7);
        p.scale(spot.face, 1);
        drawSpot(p, spot.phase, moving, 1 - moving, time);
        p.pop();
      }

      // fireflies at dusk and night
      if (sky === "night" || sky === "dusk") {
        for (const f of flies) {
          f.x += Math.cos(time * 0.5 + f.p) * 0.0006;
          f.y += Math.sin(time * 0.7 + f.p) * 0.0005;
          const a = 120 + Math.sin(time * 3 + f.p * 4) * 120;
          p.fill(255, 236, 140, a);
          p.circle(((f.x % 1) + 1) % 1 * W, H * 0.45 + (((f.y % 1) + 1) % 1) * H * 0.5, 4);
        }
      }

      // hover test, near to far
      let hit = null;
      if (!drag && my > 0) {
        for (let band = 3; band >= 0 && !hit; band--)
          for (const t of trees)
            if (t.band === band && t.sx != null && Math.abs(mx - t.sx) < t.w * 0.42 && my < t.sy && my > t.sy - t.h * t.ss) {
              hit = t;
              break;
            }
      }
      if (hit !== hov) {
        hov = hit;
        p.cursor(hit ? "pointer" : drag ? "grabbing" : "grab");
        onHover?.(hit, hit ? { x: hit.sx, y: hit.sy - hit.h } : null);
      }
      if (sel) onHover?.(hov || sel, { x: (hov || sel).sx, y: (hov || sel).sy - (hov || sel).h }, true);
      // keep each tree's screen position cleared for culling next frame
      for (const t of trees) if (t.sx != null && (t.sx < -t.w || t.sx > W + t.w)) t.sx = null;
    };

    p.mouseMoved = () => ((mx = p.mouseX), (my = p.mouseY));
    p.mousePressed = (e) => {
      if (!host.contains(e.target)) return;
      drag = { x: p.mouseX, cam: camX, moved: 0 };
    };
    p.mouseDragged = () => {
      mx = p.mouseX;
      my = p.mouseY;
      if (!drag) return;
      const dx = p.mouseX - drag.x;
      drag.moved = Math.max(drag.moved, Math.abs(dx));
      velX = -(p.movedX || 0);
      camX = drag.cam - dx;
    };
    p.mouseReleased = () => {
      if (drag && drag.moved < 4 && hov) {
        sel = hov;
        onPick?.(hov);
      }
      drag = null;
    };
  });

  host.addEventListener("wheel", (e) => {
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
    if (!d) return;
    e.preventDefault();
    velX += d * 0.08;
  }, { passive: false });
  host.addEventListener("pointerleave", () => {
    my = -1;
    if (!sel) onHover?.(null, null);
  });

  // Spot, facing right, standing on y = 0. White coat, ink line, blue ear, red-orange spot.
  function drawSpot(p, ph, moving, sniff, time) {
    const INK = "#10231a", COAT = "#ffffff", FAR = "#dfe4ef", BLUE = "#2448d8", SPOT = "#ff6a3d";
    const bob = -Math.abs(Math.sin(ph)) * 1.4 * moving; // two lifts per stride
    // shadow stays on the ground
    p.noStroke();
    p.fill(0, 0, 0, sky === "night" ? 55 : 30);
    p.ellipse(0, 0.5, 40 - 3 * Math.abs(Math.sin(ph)) * moving, 4.5);
    const hipY = -15 + bob;
    // one leg: upper and lower segment, the knee folds while the leg swings forward
    const leg = (x, off, fill) => {
      const s1 = Math.sin(ph + off) * moving;
      const lift = Math.max(0, Math.cos(ph + off)) * moving;
      const a = s1 * 0.55;
      const kx = x + Math.sin(a) * 7, ky = hipY + Math.cos(a) * 7;
      const fa = a - lift * 0.9;
      const fx = kx + Math.sin(fa) * 8, fy = Math.min(0, ky + Math.cos(fa) * 8 - lift * 2.2);
      p.stroke(INK);
      p.strokeWeight(4.6);
      p.line(x, hipY, kx, ky);
      p.line(kx, ky, fx, fy);
      p.stroke(fill);
      p.strokeWeight(2.4);
      p.line(x, hipY, kx, ky);
      p.line(kx, ky, fx, fy);
    };
    // far legs (behind the body), then body, then near legs
    leg(-10, Math.PI, FAR);
    leg(9, 0, FAR);
    // tail
    const wag = Math.sin(time * (sniff > 0.5 ? 12 : 7)) * 0.45;
    p.noFill();
    p.stroke(INK);
    p.strokeWeight(4.4);
    const tx = -16, ty = -21 + bob;
    const tip = [tx - 8 * Math.cos(0.9 + wag), ty - 10 * Math.sin(0.9 + wag) - 4];
    p.bezier(tx, ty, tx - 6, ty - 2, tip[0] + 2, tip[1] + 5, tip[0], tip[1]);
    p.stroke(COAT);
    p.strokeWeight(2.2);
    p.bezier(tx, ty, tx - 6, ty - 2, tip[0] + 2, tip[1] + 5, tip[0], tip[1]);
    // body
    p.stroke(INK);
    p.strokeWeight(1.6);
    p.fill(COAT);
    p.beginShape();
    p.vertex(-17, -22 + bob);
    p.bezierVertex(-17, -30 + bob, 10, -31 + bob, 14, -25 + bob);
    p.bezierVertex(17, -20 + bob, 12, -14 + bob, 6, -14 + bob);
    p.bezierVertex(0, -13 + bob, -12, -13 + bob, -15, -15 + bob);
    p.bezierVertex(-17, -16 + bob, -17, -19 + bob, -17, -22 + bob);
    p.endShape(p.CLOSE);
    p.noStroke();
    p.fill(SPOT);
    p.ellipse(-4, -24 + bob, 10, 6);
    leg(-12, 0, COAT);
    leg(7, Math.PI, COAT);
    // head: tips down toward the ground when sniffing
    p.push();
    p.translate(11, -25 + bob);
    p.rotate(sniff * (0.75 + Math.sin(time * 16) * 0.06) + Math.sin(ph * 2) * 0.03 * moving);
    p.stroke(INK);
    p.strokeWeight(1.6);
    p.fill(COAT);
    p.ellipse(5, -6, 15, 13); // head
    p.ellipse(12, -3, 10, 7); // snout
    p.noStroke();
    p.fill(INK);
    p.circle(16.6, -4.2, 3.2); // nose
    p.circle(6.5, -8, 2.2); // eye
    // ear: blue, flops with each step
    const flop = Math.sin(ph * 2 + 0.6) * 0.18 * moving;
    p.push();
    p.translate(1, -11);
    p.rotate(0.5 + flop);
    p.stroke(INK);
    p.strokeWeight(1.4);
    p.fill(BLUE);
    p.ellipse(-1, 4, 6, 11);
    p.pop();
    // collar
    p.noFill();
    p.stroke(BLUE);
    p.strokeWeight(2.2);
    p.arc(-1, 0, 8, 10, -0.6, 1.2);
    p.pop();
  }

  function ridge(p, x, band, base) {
    const amp = 18 + band * 8, f = 0.0016 + (3 - band) * 0.0007;
    return base - p.noise(x * f, band * 10) * amp * 2 + amp;
  }

  // Draw one tree into its own sprite. Shape comes from its seed; size from its stage.
  function sprite(t, band) {
    const p = inst;
    const depth = 0.25 + band * 0.25;
    const size = (34 + t.stage.scale * 110) * (0.45 + depth * 0.55) * (0.85 + t.jitter[3] * 0.3);
    const w = Math.ceil(size * 1.3), h = Math.ceil(size * 1.6);
    const g = p.createGraphics(w, h);
    g.pixelDensity(Math.min(2, devicePixelRatio || 1));
    g.noStroke();
    const R = mulberry(t.n * 7919 + 13);
    const leaves = LEAVES[sky];
    const cx = w / 2, groundY = h;
    const trunkH = size * (0.32 + R() * 0.12), trunkW = Math.max(2, size * 0.07);
    // trunk and a few branches
    g.fill(sky === "night" ? "#2a2a33" : "#6b4e3a");
    g.beginShape();
    g.vertex(cx - trunkW, groundY);
    g.vertex(cx - trunkW * 0.45, groundY - trunkH);
    g.vertex(cx + trunkW * 0.45, groundY - trunkH);
    g.vertex(cx + trunkW, groundY);
    g.endShape(g.CLOSE);
    g.stroke(sky === "night" ? "#2a2a33" : "#6b4e3a");
    g.strokeCap(g.ROUND);
    for (let i = 0; i < 3; i++) {
      g.strokeWeight(trunkW * 0.5);
      const a = -Math.PI / 2 + (R() - 0.5) * 1.4;
      g.line(cx, groundY - trunkH * (0.7 + R() * 0.3), cx + Math.cos(a) * size * 0.25, groundY - trunkH + Math.sin(a) * size * 0.25);
    }
    g.noStroke();
    // crown: many soft blobs inside an envelope that depends on the tree's shape
    const shape = t.shape || "round";
    const top = groundY - trunkH;
    const env = {
      round: (u, v) => [cx + u * size * 0.45, top - size * 0.35 + v * size * 0.35],
      spread: (u, v) => [cx + u * size * 0.6, top - size * 0.2 + v * size * 0.2],
      umbrella: (u, v) => [cx + u * size * 0.6, top - size * 0.22 + Math.abs(v) * size * 0.1 - (1 - Math.abs(u)) * size * 0.12],
      cone: (u, v) => {
        const yy = (v + 1) / 2;
        return [cx + u * size * 0.38 * yy, top - size * 0.95 + yy * size * 0.85];
      },
      column: (u, v) => [cx + u * size * 0.2, top - size * 0.55 + v * size * 0.5],
      layered: (u, v) => [cx + u * size * 0.5 * ((v + 1) / 2 + 0.2), top - size * 0.5 + v * size * 0.45],
    }[shape] || ((u, v) => [cx + u * size * 0.45, top - size * 0.35 + v * size * 0.35]);
    const n = Math.round(26 + t.stage.scale * 46);
    for (let i = 0; i < n; i++) {
      const u = R() * 2 - 1, v = R() * 2 - 1;
      if (u * u + v * v > 1.05 && shape !== "cone" && shape !== "column") continue;
      const [x, y] = env(u, v);
      const light = (1 - (u + 1) / 2) * 0.6 + (1 - (v + 1) / 2) * 0.4; // lit from the upper left
      const ci = Math.max(0, Math.min(leaves.length - 1, Math.round(light * (leaves.length - 1) + (R() - 0.5) * 1.4)));
      g.fill(leaves[ci]);
      const r = size * (0.12 + R() * 0.1);
      g.ellipse(x, y, r * 1.15, r);
    }
    // fresh trees (earned this week) carry a few pollen blossoms
    if (t.stage.key === "seed" || t.stage.key === "sprout") {
      g.fill("#ffd23f");
      for (let i = 0; i < 4; i++) {
        const [x, y] = env(R() * 1.6 - 0.8, R() * 1.4 - 0.9);
        g.circle(x, y, Math.max(2, size * 0.05));
      }
    }
    return { img: g, w, h };
  }

  function layout() {
    const sorted = trees.slice().sort((a, b) => a.n - b.n);
    const gap = Math.max(26, Math.min(70, W / 12));
    worldW = Math.max(W, sorted.length * gap * 0.6 + W * 0.22);
    sorted.forEach((t, i) => {
      t.x = W * 0.06 + i * gap * 0.6 + (t.jitter[1] - 0.5) * gap;
    });
  }

  function mulberry(seed) {
    return () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  return {
    setTrees(list) {
      const run = () => {
        trees.forEach((t) => t.img?.remove?.());
        trees = list.map((src) => {
          const band = 3 - Math.min(3, Math.floor(src.jitter[0] * 4));
          const t = { ...src, band, born: null };
          Object.assign(t, sprite(t, band));
          return t;
        });
        layout();
        // open at the newest trees: the garden's growing edge
        camX = Math.max(0, worldW - W);
      };
      ready ? run() : setTimeout(() => this.setTrees(list), 50);
    },
    setSky(k) {
      sky = k;
      const list = trees.map((t) => ({ ...t, img: null }));
      this.setTrees(list);
    },
    sky: () => sky,
    focus(n) {
      const t = trees.find((x) => x.n === n);
      if (!t) return;
      sel = t;
      const par = 0.35 + (0.25 + t.band * 0.25) * 0.65;
      camX = Math.max(0, t.x - W / (2 * par));
    },
    clear() {
      sel = null;
    },
    highlight(set) {
      hl = set && set.size ? set : null;
    },
    pause() {
      inst.noLoop();
    },
    resume() {
      inst.loop();
    },
    resize() {
      inst.windowResized?.();
    },
  };
}
