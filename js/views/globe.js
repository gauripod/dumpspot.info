// The globe behind the city picker (three.js). One continuous stage: solid land drawn from
// Natural Earth, soft clay heat where reports gather, and a count bubble for every city
// with reports. Drag with inertia, scroll to zoom, click a bubble to dive into that city.
import * as THREE from "three";

const DEG = Math.PI / 180;
export function ll2v(lat, lng, r = 1) {
  const phi = (90 - lat) * DEG, th = (lng + 180) * DEG;
  return new THREE.Vector3(-Math.sin(phi) * Math.cos(th) * r, Math.cos(phi) * r, Math.sin(phi) * Math.sin(th) * r);
}

const C = { water: "#BFE3FA", land: "#FFFFFF", coast: "#10231A", clay: "#2448D8", moss: 0x2448d8, ink: 0x10231a };

export function createGlobe(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
  const HOME = 4.4;
  camera.position.set(0, 0, HOME);

  const world = new THREE.Group();
  world.rotation.x = 0.3;
  scene.add(world);
  const spin = new THREE.Group();
  world.add(spin);

  // Surface: an equirectangular canvas painted with water, then land and coastline.
  const tex = document.createElement("canvas");
  tex.width = 2048;
  tex.height = 1024;
  const tx = tex.getContext("2d");
  tx.fillStyle = C.water;
  tx.fillRect(0, 0, tex.width, tex.height);
  const texture = new THREE.CanvasTexture(tex);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), new THREE.MeshBasicMaterial({ map: texture }));
  spin.add(globe);
  (async () => {
    try {
      const [{ feature }, land] = await Promise.all([
        import("https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/+esm"),
        fetch("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json").then((r) => r.json()),
      ]);
      const W = tex.width, H = tex.height;
      const geo = feature(land, land.objects.land);
      const polys = geo.features.flatMap((f) => (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates));
      tx.beginPath();
      for (const poly of polys)
        for (const ring of poly)
          ring.forEach(([lng, lat], i) => {
            const x = ((lng + 180) / 360) * W, y = ((90 - lat) / 180) * H;
            i ? tx.lineTo(x, y) : tx.moveTo(x, y);
          });
      tx.fillStyle = C.land;
      tx.fill("evenodd");
      tx.strokeStyle = C.coast;
      tx.globalAlpha = 0.55;
      tx.lineWidth = 1.2;
      tx.stroke();
      tx.globalAlpha = 1;
      texture.needsUpdate = true;
    } catch (e) {
      console.warn("[DumpSpot] land outline unavailable", e);
    }
  })();

  // Graticule, faint, like a survey sheet
  const gratMat = new THREE.LineBasicMaterial({ color: C.ink, transparent: true, opacity: 0.07 });
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts = [];
    for (let lng = -180; lng <= 180; lng += 3) pts.push(ll2v(lat, lng, 1.002));
    spin.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gratMat));
  }
  for (let lng = -180; lng < 180; lng += 30) {
    const pts = [];
    for (let lat = -90; lat <= 90; lat += 3) pts.push(ll2v(lat, lng, 1.002));
    spin.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gratMat));
  }

  // Heat: soft clay discs lying on the surface, larger where more reports gather.
  const heatTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(36,72,216,0.85)");
    gr.addColorStop(0.45, "rgba(36,72,216,0.35)");
    gr.addColorStop(1, "rgba(36,72,216,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  let heat = new THREE.Group();
  spin.add(heat);
  function setReports(rows) {
    spin.remove(heat);
    heat = new THREE.Group();
    const bins = new Map();
    for (const r of rows) {
      if (r.lat == null) continue;
      const k = Math.round(r.lat) + "," + Math.round(r.lng);
      bins.set(k, (bins.get(k) || 0) + 1);
    }
    const mat = new THREE.MeshBasicMaterial({ map: heatTex, transparent: true, depthWrite: false });
    for (const [k, n] of bins) {
      const [la, ln] = k.split(",").map(Number);
      const s = 0.05 + Math.min(0.22, Math.log2(n + 1) * 0.045);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), mat);
      m.position.copy(ll2v(la, ln, 1.003));
      m.lookAt(ll2v(la, ln, 2));
      heat.add(m);
    }
    spin.add(heat);
  }

  // Target ring for the dive
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.036, 48), new THREE.MeshBasicMaterial({ color: C.moss, transparent: true, opacity: 0, side: THREE.DoubleSide }));
  spin.add(ring);

  // City bubbles: HTML so they stay crisp; positioned from 3D every frame.
  const layer = document.createElement("div");
  layer.className = "globe-marks";
  canvas.parentElement.appendChild(layer);
  let marks = [], faced = false;
  function setMarkers(list, onPick) {
    // The first time there's data, open facing the busiest city, so the record is in view.
    if (!faced && list[0]) {
      faced = true;
      const v = ll2v(list[0].lat, list[0].lng, 1);
      spin.rotation.y = Math.atan2(-v.x, v.z) - 0.35;
      world.rotation.x = Math.asin(v.y) * 0.8;
    }
    layer.innerHTML = "";
    marks = list.map((c) => {
      const el = document.createElement("button");
      el.className = "globe-mark";
      el.innerHTML = `${c.count ? `<b>${c.count}</b>` : `<i></i>`}<span>${c.name.replace(/[<>&]/g, "")}</span>`;
      el.setAttribute("aria-label", c.count ? `${c.name}: ${c.count} reports. Open.` : `${c.name}. Open.`);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onPick(c);
      });
      layer.appendChild(el);
      return { el, v: ll2v(c.lat, c.lng, 1.01) };
    });
  }
  const tmp = new THREE.Vector3(), camDir = new THREE.Vector3();
  function placeMarks() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    camera.getWorldDirection(camDir);
    const placed = []; // label boxes already shown, busiest city first; crowded ones become dots
    for (const m of marks) {
      tmp.copy(m.v).applyMatrix4(spin.matrixWorld);
      const facing = tmp.clone().normalize().dot(camDir.clone().negate());
      const p = tmp.project(camera);
      const show = facing > 0.25 && camera.position.z > 2.2;
      m.el.style.opacity = show ? Math.min(1, (facing - 0.25) * 4) : 0;
      m.el.style.pointerEvents = show ? "auto" : "none";
      const x = ((p.x + 1) / 2) * w, y = ((1 - p.y) / 2) * h;
      const crowded = show && placed.some((q) => Math.abs(q.x - x) < 96 && Math.abs(q.y - y) < 28);
      if (show && !crowded) placed.push({ x, y });
      if (m.dot !== crowded) m.el.classList.toggle("dot-only", (m.dot = crowded));
      m.el.style.transform = `translate(${x}px, ${y}px)`;
    }
  }

  // Drag with inertia, scroll to zoom. Everything eases; nothing jumps.
  let drag = null, vx = 0.0015, vy = 0, auto = true, zoomTo = HOME;
  canvas.addEventListener("pointerdown", (e) => {
    drag = { x: e.clientX, y: e.clientY };
    auto = false;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointerup", () => {
    drag = null;
    setTimeout(() => !drag && (auto = true), 2500);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    vx = dx * 0.0035;
    vy = dy * 0.0025;
    drag = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      zoomTo = Math.max(2.4, Math.min(6, zoomTo + e.deltaY * 0.002));
    },
    { passive: false },
  );

  let tween = null, running = false;
  const clock = new THREE.Clock();
  function frame() {
    if (!running) return;
    const t = clock.getElapsedTime();
    if (!tween) {
      spin.rotation.y += vx;
      world.rotation.x = Math.max(-1.1, Math.min(1.1, world.rotation.x + vy));
      vx += ((auto ? 0.0012 : 0) - vx) * 0.06;
      vy *= 0.9;
      camera.position.z += (zoomTo - camera.position.z) * 0.08;
    } else tween(t);
    renderer.render(scene, camera);
    placeMarks();
    requestAnimationFrame(frame);
  }
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.setViewOffset(w, h, w > 900 ? -w * 0.18 : 0, w > 900 ? 0 : -h * 0.1, w, h);
    camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize);

  return {
    setReports,
    setMarkers,
    start() {
      resize();
      camera.position.z = zoomTo = HOME;
      ring.material.opacity = 0;
      auto = true;
      tween = null;
      layer.style.display = "";
      if (!running) (running = true), frame();
    },
    stop() {
      running = false;
      layer.style.display = "none";
    },
    // Turn to a lat/lng and dive towards it. Resolves when done.
    focus(lat, lng, { dive = true, near = 1 } = {}) {
      auto = false;
      const target = ll2v(lat, lng, 1);
      ring.position.copy(ll2v(lat, lng, 1.004));
      ring.lookAt(0, 0, 0);
      const aT = Math.atan2(-target.x, target.z);
      const fromY = spin.rotation.y, fromX = world.rotation.x, fromZ = camera.position.z;
      let dY = (aT - fromY) % (2 * Math.PI);
      if (dY > Math.PI) dY -= 2 * Math.PI;
      if (dY < -Math.PI) dY += 2 * Math.PI;
      const toY = fromY + dY, toX = Math.asin(Math.max(-1, Math.min(1, target.y)));
      const t0 = clock.getElapsedTime(), D = dive ? 1.25 : 0.9;
      const inOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
      let told = false;
      return new Promise((res) => {
        tween = (t) => {
          const k = Math.min(1, (t - t0) / D);
          // Turn leads slightly; the descent follows the same curve so the motion never stops between them.
          const te = inOut(Math.min(1, k / 0.8));
          spin.rotation.y = fromY + (toY - fromY) * te;
          world.rotation.x = fromX + (toX - fromX) * te;
          ring.material.opacity = Math.min(1, k * 3);
          if (dive) {
            const d = Math.max(0, (k - 0.08) / 0.92), de = d * d * d; // accelerate into the ground
            camera.position.z = fromZ + (1.08 - fromZ) * de;
          }
          if (!told && k >= near) {
            told = true;
            res();
          }
          if (k >= 1) {
            tween = null;
            vx = vy = 0;
            if (!told) res();
          }
        };
      });
    },
  };
}
