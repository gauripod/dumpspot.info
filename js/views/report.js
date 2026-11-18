// Report a spot: one question at a time, like a conversation, with the report's own
// specimen growing beside it as you answer. Same fields, same checks and the same insert as v1.
import { TREE_LINE } from "../data/site.js";
import { stamp } from "../ui/brand.js";
import { specimenCard, mountSpecimen } from "../ui/specimen.js";
import { $, $$, esc, genId, normLocation, looksLikeAbbr, compressImage, debounce, pad } from "../lib/util.js";
import { getLocationCode, formatDigipin } from "../lib/geo.js";
import { checkTextSpam, checkAllImages } from "../lib/spam.js";
import { S, setRows, rememberMe, myPerson } from "../core/state.js";
import { CATS, TYPES, SEVS, catMeta, scoreReport, levelFor, BADGES, normName, SEV_COLORS } from "../data/derive.js";
import { fetchReports, uploadPhotos, insertReport } from "../data/db.js";
import { ICONS } from "../ui/icons.js";
import { registerView, toast, go } from "../ui/shell.js";

const F = { type: [], sev: [], cats: [], files: [], lat: null, lng: null, flagged: new Set() };
let pinMap = null, pinMarker = null, cur = 0, liveOff = null;
const DRAFT_ID = "draft-" + Math.random().toString(36).slice(2, 8);

// The five questions. `ok` says whether you can move on; `why` is what to say if not.
const STEPS = [
  { k: "photo", q: "What did you see?", hint: "Up to 6 photos.", ok: () => F.files.length > 0, why: "Add at least one photo." },
  { k: "place", q: "Where is it?", hint: "Search, or tap the map.", ok: () => !!(val("rspec") && val("rstate") && val("rarea")), why: "Search a place or drop the pin." },
  { k: "what", q: "What kind of mess?", hint: "Pick any. Optional.", ok: () => true },
  { k: "how", q: "How bad is it?", hint: "Optional.", ok: () => true },
  { k: "you", q: "What should we call you?", hint: "Shown on your report. No sign-up.", ok: () => !!val("rname") && !whoPending(), why: "Add your name." },
];
const val = (id) => $("#" + id)?.value.trim();
const SCALE = SEVS.slice(0, 3); // Minor, Moderate, Severe: one of them. "Blocking road" is a separate flag.

export function initReport() {
  $("#v-report").innerHTML = `
  <div class="rf" id="rp-form">
    <div class="rf-main">
      <nav class="rf-rail" aria-label="Report steps">
        ${STEPS.map((st, i) => `<button type="button" class="rf-dot" data-i="${i}"><span>${pad(i + 1, 2)}</span><b>${["Photo", "Place", "Kind", "Severity", "You"][i]}</b></button>`).join("")}
        <span class="rf-rail-fill" id="rf-fill"></span>
      </nav>

      <header class="rf-head"><p class="rf-n" id="rf-n"></p><h1 class="rf-q" id="rf-q"></h1><p class="rf-hint" id="rf-hint"></p></header>
      <div class="rf-stage" id="rf-stage">
        <section class="rf-step" data-k="photo">
          <label class="rf-drop" id="drop">
            <input type="file" id="photo-input" accept="image/*" multiple />
            <span class="rf-drop-ico">${ICONS.camera}</span>
            <b>Take or drop photos</b>
            <small>JPG, PNG or WEBP</small>
          </label>
          <div class="pgrid" id="pgrid"></div>
        </section>

        <section class="rf-step" data-k="place">
          <div class="loc-wrap">
            <span class="rf-search-ico">${ICONS.search}</span>
            <input id="rspec" maxlength="200" autocomplete="off" placeholder="Search a street, landmark or market" />
            <div class="loc-results" id="loc-results"></div>
          </div>
          <div class="pin-wrap">
            <div id="pin-map" class="pin-map"></div>
            <button class="icon-plate pin-gps" id="pin-gps" type="button" title="Use my location">${ICONS.locate}<span>Near me</span></button>
          </div>
          <div class="pin-codes"><span id="pin-rev">Tap the map to drop a pin.</span><span id="pin-dp"></span><span id="pin-pc"></span></div>
          <details class="rf-more"><summary>State and area</summary>
            <div class="r2">
              <div class="field"><label for="rstate">State</label><input id="rstate" maxlength="50" placeholder="Maharashtra" /></div>
              <div class="field"><label for="rarea">District or area</label><input id="rarea" maxlength="60" placeholder="Pune" /></div>
            </div>
          </details>
        </section>

        <section class="rf-step" data-k="what">
          <div class="rf-cats" id="cgrid">${CATS.map(
            (c, i) => `<button type="button" class="ccard" data-cat="${esc(c.key)}" style="--i:${i}">
              <span class="ccard-ico">${ICONS[c.icon]}</span><span class="ccard-l">${esc(c.label)}</span><span class="ccard-tick">${ICONS.check}</span></button>`,
          ).join("")}</div>
          <p class="rf-sub">Where is it?</p>
          <div class="tags">${TYPES.map((t) => `<button type="button" class="tagb" data-g="type">${esc(t)}</button>`).join("")}</div>
        </section>

        <section class="rf-step" data-k="how">
          <div class="rf-scale" id="rf-scale" style="--n:${SCALE.length}">
            ${SCALE.map((t, i) => `<button type="button" class="rf-sev" data-v="${esc(t)}" style="--c:${SEV_COLORS[i + 1]};--h:${30 + i * 30}%"><i></i><b>${esc(t)}</b><small>${["Unpleasant", "A health risk", "Dangerous now"][i]}</small></button>`).join("")}
          </div>
          <button type="button" class="tagb rf-flag" data-g="sev">${esc(SEVS[3])}</button>
          <div class="field"><label for="rnotes">Anything else?</label>
            <textarea id="rnotes" rows="3" maxlength="1000" placeholder="It's been there two weeks and smells in the evening."></textarea></div>
        </section>

        <section class="rf-step" data-k="you">
          <div class="field rf-name"><label for="rname">Your name</label><input id="rname" maxlength="60" placeholder="Meera" autocomplete="nickname" /></div>
          <div class="rf-who" id="rf-who" aria-live="polite"></div>
          <dl class="rf-review" id="rf-review"></dl>
          <button class="sign sign-report sign-xl" id="submit" type="button">Put it on the record ${ICONS.arrow}</button>
        </section>
      </div>

      <div class="rf-nav">
        <button type="button" class="plate-btn" id="rf-back">${ICONS["arrow-left"]}Back</button>
        <span class="rf-err" id="rf-err" role="alert"></span>
        <button type="button" class="sign" id="rf-next">Next ${ICONS.arrow}</button>
      </div>
    </div>

    <aside class="rf-live" aria-label="Your report so far">
      <div class="rf-live-spec"><div class="spec-mount" id="rf-spec"></div></div>
      <div class="rf-live-row">
        <div><span class="label">Points</span><b class="rf-pts" id="pv-pts">0</b></div>
        <div class="pv-parts" id="pv-parts"></div>
      </div>
      <div class="pv-lvl" id="pv-lvl"></div>
      <p class="rf-live-note">Your report as a plant. It grows as you fill it in.</p>
    </aside>
  </div>
  <div id="rp-done" class="rp-done"></div>`;

  $$("#cgrid .ccard").forEach((b) =>
    b.addEventListener("click", () => {
      b.classList.toggle("on");
      const k = b.dataset.cat;
      F.cats = b.classList.contains("on") ? [...F.cats, k] : F.cats.filter((x) => x !== k);
      preview();
    }),
  );
  $$(".tagb").forEach((b) =>
    b.addEventListener("click", () => {
      b.classList.toggle("on");
      const g = b.dataset.g, v = b.textContent.trim();
      F[g] = b.classList.contains("on") ? [...F[g], v] : F[g].filter((x) => x !== v);
      preview();
    }),
  );
  // Severity scale: one level at a time; tapping the chosen one again clears it.
  $$(".rf-sev").forEach((b) =>
    b.addEventListener("click", () => {
      const was = b.classList.contains("on");
      $$(".rf-sev").forEach((x) => x.classList.remove("on"));
      F.sev = F.sev.filter((x) => !SCALE.includes(x));
      if (!was) b.classList.add("on"), F.sev.push(b.dataset.v);
      $("#rf-scale").style.setProperty("--at", was ? 0 : SCALE.indexOf(b.dataset.v) + 1);
      preview();
    }),
  );
  const spec = $("#rspec");
  spec.addEventListener("input", debounce(() => searchLoc(spec.value), 450));
  document.addEventListener("click", (e) => !e.target.closest(".loc-wrap") && $("#loc-results").classList.remove("open"));
  ["rname", "rstate", "rarea", "rnotes", "rspec"].forEach((id) => $("#" + id).addEventListener("input", preview));
  $("#rname").addEventListener("input", renderWhoSoon);
  $("#rstate").addEventListener("blur", (e) => validateLocationField(e.target.value, "state"));
  $("#rarea").addEventListener("blur", (e) => validateLocationField(e.target.value, "area"));
  $("#pin-gps").addEventListener("click", useGps);
  initUpload();
  $("#submit").addEventListener("click", submit);

  $("#rf-next").addEventListener("click", () => step(cur + 1));
  $("#rf-back").addEventListener("click", () => step(cur - 1));
  $$(".rf-dot").forEach((d) => d.addEventListener("click", () => step(+d.dataset.i)));
  $("#v-report").addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.target.matches("textarea") || e.target.closest(".loc-wrap")) return;
    if (cur < STEPS.length - 1) e.preventDefault(), step(cur + 1);
  });

  registerView("report", {
    enter() {
      if (!S.city) return;
      if (!$("#rstate").value && S.city.state) $("#rstate").value = S.city.state;
      if (!$("#rarea").value) $("#rarea").value = S.city.name;
      if (!$("#rname").value && S.me?.name) $("#rname").value = S.me.name;
      step(cur, true);
      preview();
    },
    leave() {
      liveOff?.();
      liveOff = null;
    },
  });
}

// Move to question i. Forward only past questions that are answered.
function step(i, quiet) {
  i = Math.max(0, Math.min(STEPS.length - 1, i));
  if (i > cur) {
    for (let j = cur; j < i; j++)
      if (!STEPS[j].ok()) {
        $("#rf-err").textContent = STEPS[j].why;
        $("#rf-err").classList.remove("shake");
        void $("#rf-err").offsetWidth;
        $("#rf-err").classList.add("shake");
        i = j;
        break;
      }
  }
  if (i === cur && !quiet && $("#rf-err").textContent) return;
  const dir = i >= cur ? 1 : -1;
  if (i !== cur || quiet) $("#rf-err").textContent = "";
  cur = i;
  const st = STEPS[i];
  $$(".rf-step").forEach((el) => {
    const on = el.dataset.k === st.k;
    el.classList.toggle("on", on);
    if (on) el.style.setProperty("--dir", dir);
  });
  $("#rf-n").textContent = `Step ${i + 1} of ${STEPS.length}`;
  const head = $(".rf-head");
  head.classList.remove("swap");
  void head.offsetWidth;
  head.classList.add("swap");
  $("#rf-q").textContent = st.q;
  $("#rf-hint").textContent = st.hint;
  $$(".rf-dot").forEach((d, j) => {
    d.classList.toggle("on", j === i);
    d.classList.toggle("done", j < i || (STEPS[j].ok() && j !== i && j < 2 ? STEPS[j].ok() : j < i));
  });
  $("#rf-fill").style.transform = `scaleX(${i / (STEPS.length - 1)})`;
  $("#rf-back").style.visibility = i ? "visible" : "hidden";
  $("#rf-next").hidden = i === STEPS.length - 1;
  if (st.k === "place") setTimeout(() => (pinMap ? pinMap.resize() : initPinMap(F.lat ?? S.city.lat, F.lng ?? S.city.lng, F.lat == null ? 12.5 : 17)), 40);
  if (st.k === "you") review(), renderWho();
  if (!quiet) {
    const first = $(`.rf-step.on input:not([type=file]), .rf-step.on textarea`);
    if (first && st.k !== "place" && matchMedia("(pointer: fine)").matches) setTimeout(() => first.focus({ preventScroll: true }), 300);
    window.__lenis ? window.__lenis.scrollTo(0, { duration: 0.6 }) : window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

// ── Who is this? ─────────────────────────────────────────────────────
// Names are the only identity (no accounts, no schema change). Two different people can share a
// name, so when a typed name already belongs to a keeper we ask: is that you? If not, the new
// keeper gets a short tag ("Meera #4821") that keeps their points and trees apart. This device
// remembers the choice, so a returning keeper is recognised without being asked again.
const base = (n) => normName(n).replace(/\s#\d{3,5}$/, "");
let whoChoice = null; // the exact reporter string the person confirmed
function matchesFor(name) {
  const b = base(name);
  if (!b) return [];
  return [...S.people.values()].filter((p) => base(p.name) === b).sort((a, z) => z.reports.length - a.reports.length).slice(0, 3);
}
function whoPending() {
  const name = val("rname");
  if (!name) return false;
  if (whoChoice && normName(whoChoice) === normName(name)) return false;
  if (S.me?.name && normName(S.me.name) === normName(name)) return false;
  return matchesFor(name).length > 0 && !/#\d{3,5}$/.test(name);
}
function freshTag(name) {
  const taken = new Set([...S.people.values()].map((p) => normName(p.name)));
  for (let i = 0; i < 50; i++) {
    const t = `${name.replace(/\s#\d{3,5}$/, "").trim()} #${1000 + Math.floor(Math.random() * 9000)}`;
    if (!taken.has(normName(t))) return t;
  }
  return name;
}
function renderWho() {
  const box = $("#rf-who"), name = val("rname");
  if (!box) return;
  if (!name) return (box.innerHTML = "");
  const me = S.me?.name && normName(S.me.name) === normName(name) ? S.people.get(normName(S.me.name)) : null;
  if (me) {
    box.innerHTML = `<div class="who-card who-ok"><b>Welcome back, ${esc(name)}.</b><span>${me.reports.length} ${me.reports.length === 1 ? "report" : "reports"} so far, ${me.level.name}. </span></div>`;
    return;
  }
  if (whoChoice && normName(whoChoice) === normName(name)) {
    const p = S.people.get(normName(name));
    box.innerHTML = p
      ? `<div class="who-card who-ok"><b>Got it, you're ${esc(name)}.</b><span>Report no. ${p.reports.length + 1}.</span></div>`
      : `<div class="who-card who-ok"><b>You'll appear as ${esc(name)}.</b><span>So your points don't mix with the other ${esc(name.replace(/\s#\d+$/, ""))}.</span></div>`;
    return;
  }
  const m = matchesFor(name);
  if (!m.length || /#\d{3,5}$/.test(name)) {
    box.innerHTML = `<div class="who-card"><b>New here. Welcome.</b><span>First report, first tree.</span></div>`;
    return;
  }
  box.innerHTML = `<div class="who-card who-ask"><b>${m.length === 1 ? `There's already a keeper called ${esc(m[0].name)}.` : `There are keepers called ${esc(name)}.`} Is that you?</b>
    <div class="who-opts">${m
      .map((p, i) => {
        const last = p.reports.slice().sort((a, z) => new Date(z.ts) - new Date(a.ts))[0];
        return `<button type="button" class="who-opt" data-i="${i}"><b>That's me</b><span>${esc(p.name)} · ${p.reports.length} ${p.reports.length === 1 ? "report" : "reports"}${last ? `, last in ${esc(last.area)}` : ""}</span></button>`;
      })
      .join("")}
      <button type="button" class="who-opt who-new"><b>I'm someone else</b><span>We'll add a number to your name</span></button></div></div>`;
  $$(".who-opt[data-i]", box).forEach((b) =>
    b.addEventListener("click", () => {
      whoChoice = m[+b.dataset.i].name;
      $("#rname").value = whoChoice;
      renderWho();
      preview();
    }),
  );
  $(".who-new", box).addEventListener("click", () => {
    whoChoice = freshTag(name);
    $("#rname").value = whoChoice;
    renderWho();
    preview();
  });
}
const renderWhoSoon = debounce(renderWho, 250);

function review() {
  const d = draft();
  const rows = [
    ["Photos", `${F.files.length}`, 0],
    ["Place", d.specific || "Not set", 1],
    ["Kind", F.cats.map((c) => catMeta(c).label).join(", ") || "Not set", 2],
    ["Severity", F.sev.join(", ") || "Not set", 3],
  ];
  $("#rf-review").innerHTML = rows.map(([k, v, i]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd><button type="button" class="link-btn" data-i="${i}">Edit</button></div>`).join("");
  $$("#rf-review button").forEach((b) => b.addEventListener("click", () => step(+b.dataset.i)));
}

// ── Location ──────────────────────────────────────────────────────────
async function searchLoc(q) {
  const box = $("#loc-results");
  if (q.length < 3) return box.classList.remove("open");
  box.innerHTML = `<div class="loc-msg mono">Searching ${esc(S.city?.name || "")}…</div>`;
  box.classList.add("open");
  try {
    const b = S.city?.bbox;
    const vb = b ? `&viewbox=${b[0]},${b[3]},${b[2]},${b[1]}&bounded=1` : "";
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=6&accept-language=en${vb}`);
    const data = await res.json();
    if (!data.length) {
      box.innerHTML = `<div class="loc-msg mono">No match in ${esc(S.city?.name || "this city")}. Drop the pin on the map instead.</div>`;
      return;
    }
    box.innerHTML = data
      .map((it, i) => `<div class="loc-item" data-i="${i}"><b>${esc(it.display_name.split(",")[0])}</b><small>${esc(it.display_name)}</small></div>`)
      .join("");
    $$(".loc-item", box).forEach((el) =>
      el.addEventListener("click", () => {
        const it = data[+el.dataset.i];
        $("#rspec").value = it.display_name.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 2).join(", ");
        const a = it.address || {};
        if (a.state) $("#rstate").value = a.state;
        box.classList.remove("open");
        setPin(+it.lat, +it.lon, true);
      }),
    );
  } catch {
    box.innerHTML = `<div class="loc-msg mono">Search unavailable. Drop the pin on the map.</div>`;
  }
}

function initPinMap(lat, lng, zoom) {
  if (typeof maplibregl === "undefined") return;
  if (pinMap) {
    pinMap.resize();
    return;
  }
  import("./mapstyle.js").then(({ mapStyle }) => {
    pinMap = new maplibregl.Map({ container: "pin-map", style: mapStyle(), center: [lng, lat], zoom, pitch: 0, attributionControl: false });
    pinMap.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    const el = document.createElement("div");
    el.className = "pin-marker";
    el.innerHTML = `<span></span>`;
    pinMarker = new maplibregl.Marker({ element: el, draggable: true, anchor: "bottom" }).setLngLat([lng, lat]);
    pinMarker.on("dragend", () => {
      const p = pinMarker.getLngLat();
      setPin(p.lat, p.lng, false);
    });
    pinMap.on("click", (e) => setPin(e.lngLat.lat, e.lngLat.lng, false));
    if (F.lat != null) pinMarker.addTo(pinMap);
  });
}

function setPin(lat, lng, fly) {
  F.lat = lat;
  F.lng = lng;
  if (pinMarker) {
    pinMarker.setLngLat([lng, lat]);
    if (!pinMarker._map) pinMarker.addTo(pinMap);
  }
  if (fly && pinMap) pinMap.flyTo({ center: [lng, lat], zoom: 17.5, duration: 1200 });
  const c = getLocationCode(lat, lng);
  $("#pin-dp").textContent = c.digipin ? "DigiPin " + formatDigipin(c.digipin) : "DigiPin: India only";
  $("#pin-pc").textContent = "Plus Code " + (c.pluscode || "");
  revGeo(lat, lng);
  preview();
}

const revGeo = debounce(async (lat, lng) => {
  const el = $("#pin-rev");
  el.textContent = "Locating…";
  try {
    const d = await (await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`)).json();
    const a = d.address || {};
    const parts = [a.road || a.pedestrian || a.footway || a.path, a.suburb || a.neighbourhood || a.quarter, a.city || a.town || a.village || a.county, a.state].filter(Boolean);
    el.textContent = parts.length ? "↳ " + parts.join(", ") : "";
    if (parts.length) $("#rspec").value = normLocation(parts.slice(0, 2).join(", "));
    preview();
  } catch {
    el.textContent = "";
  }
}, 600);

function useGps() {
  if (!navigator.geolocation) return toast("Location isn't available in this browser.", "err");
  navigator.geolocation.getCurrentPosition(
    (p) => setPin(p.coords.latitude, p.coords.longitude, true),
    () => toast("Couldn't get your location. Drop the pin by hand.", "err"),
    { enableHighAccuracy: true, timeout: 8000 },
  );
}

async function validateLocationField(val, kind) {
  if (!val || val.trim().length < 3) return;
  try {
    const data = await (await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val.trim())}&format=json&addressdetails=1&limit=1&accept-language=en`)).json();
    if (!data?.length) return;
    const a = data[0].address;
    if (kind === "state") {
      const isCity = !!(a.city || a.town || a.village || a.suburb);
      const isState = !!(a.state && !a.city && !a.town);
      if (isCity && !isState) toast(`State: "${val.trim()}" looks like a city.${a.state ? ` Did you mean "${a.state}"?` : ""}`, "err");
    } else {
      const isState = !!a.state && !(a.city || a.town || a.village || a.suburb || a.county);
      if (isState) toast(`Area: "${val.trim()}" looks like a state.${a.county ? ` Try a district like "${a.county}".` : ""}`, "err");
    }
  } catch {}
}

// ── Photos ────────────────────────────────────────────────────────────
function initUpload() {
  const drop = $("#drop"), input = $("#photo-input");
  drop.addEventListener("dragover", (e) => (e.preventDefault(), drop.classList.add("drag")));
  drop.addEventListener("dragleave", () => drop.classList.remove("drag"));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.classList.remove("drag");
    addFiles([...e.dataTransfer.files]);
  });
  input.addEventListener("change", () => {
    addFiles([...input.files]);
    input.value = "";
  });
}

async function addFiles(fs) {
  const ok = fs.filter((f) => f.type.startsWith("image/")).slice(0, 6 - F.files.length);
  for (const f of ok) {
    const c = await compressImage(f);
    if (c && F.files.length < 6) F.files.push(c);
  }
  renderPreviews();
}

function renderPreviews() {
  const g = $("#pgrid");
  g.innerHTML = F.files
    .map((f, i) => `<div class="pitem" style="--d:${i * 40}ms"><img src="${URL.createObjectURL(f)}" alt=""><button type="button" data-i="${i}" title="Remove">${ICONS.close}</button><span class="mono">${pad(i + 1, 2)}</span></div>`)
    .join("");
  $$("button", g).forEach((b) =>
    b.addEventListener("click", () => {
      F.files.splice(+b.dataset.i, 1);
      renderPreviews();
    }),
  );
  $("#drop").classList.toggle("has", F.files.length > 0);
  const full = F.files.length >= 6;
  $("#photo-input").disabled = full;
  $("#drop").classList.toggle("full", full);
  preview();
}

// ── Live preview ──────────────────────────────────────────────────────
function draft() {
  return {
    reporter: $("#rname").value.trim(),
    state: normLocation($("#rstate").value),
    area: normLocation($("#rarea").value),
    specific: normLocation($("#rspec").value),
    type: F.type,
    cats: F.cats,
    sev: F.sev,
    notes: $("#rnotes").value.trim(),
    _photoCount: F.files.length,
    digipin: F.lat != null ? "x" : null,
  };
}

const remountLive = debounce(() => {
  const host = $("#rf-spec");
  if (!host || !document.body.contains(host)) return;
  liveOff?.();
  const d = draft();
  liveOff = mountSpecimen(host, { id: DRAFT_ID, ts: new Date().toISOString(), cats: d.cats, type: d.type, sev: d.sev, photos: F.files }, { aspect: 1.05, instant: true });
}, 160);

function preview() {
  const d = draft();
  const areaKey = normName(d.area) + "|" + normName(d.state);
  const pioneer = !!d.area && !S.all.some((r) => normName(r.area) + "|" + normName(r.state) === areaKey);
  const sc = scoreReport(d, pioneer);
  const el = $("#pv-pts"), from = +el.textContent || 0;
  if (from !== sc.total) {
    el.textContent = sc.total;
    el.classList.remove("bump");
    void el.offsetWidth;
    el.classList.add("bump");
  }
  const labels = { base: "Report", photo: "Photos", notes: "Notes", cat: "Kind", sev: "Severity", type: "Site", pin: "Exact pin", urgent: "Urgent", pioneer: "First here" };
  $("#pv-parts").innerHTML = sc.parts.map(([k, v]) => `<span><b>+${v}</b> ${labels[k] || k}</span>`).join("");
  const me = d.reporter ? S.people.get(normName(d.reporter)) : null;
  const before = me?.pts || 0;
  const L0 = levelFor(before), L1 = levelFor(before + sc.total);
  $("#pv-lvl").innerHTML = d.reporter
    ? `<div class="lvlbar"><i style="width:${L0.prog * 100}%"></i><b style="width:${(L1.i > L0.i ? 1 : L1.prog) * 100}%"></b></div>
       <p class="t-small">${L1.i > L0.i ? `${esc(d.reporter)} levels up to <b class="leaf">${L1.name}</b>` : `${esc(d.reporter)} · ${L1.name}${L1.next ? `, ${L1.next.at - before - sc.total} points to ${L1.next.name}` : ""}`}</p>`
    : "";
  $$(".rf-dot").forEach((dot, j) => j !== cur && dot.classList.toggle("done", STEPS[j].ok() && (j < 2 || j === 4 ? true : j < cur)));
  remountLive();
}

// ── Submit (same checks and insert as v1) ─────────────────────────────
async function submit() {
  const btn = $("#submit");
  const reset = () => {
    btn.innerHTML = `Put it on the record ${ICONS.arrow}`;
    btn.disabled = false;
  };
  if (S.offline) return toast("Reports are offline, so this can't be saved yet. Try again later.", "err");
  const name = $("#rname").value.trim();
  const state = normLocation($("#rstate").value);
  const area = normLocation($("#rarea").value);
  const specific = normLocation($("#rspec").value);
  if (!name || !state || !area || !specific) return toast("Fill in name, state, area and location.", "err");
  if (whoPending()) {
    step(STEPS.length - 1);
    return toast("Pick one: is that you, or someone else?", "err");
  }
  if (!F.files.length) return toast("Add at least one photo.", "err");
  const notes = $("#rnotes").value.trim();
  const errs = checkTextSpam(name, state, area, specific, notes);
  if (errs.length) return errs.forEach((m) => toast(m, "err"));
  if (looksLikeAbbr($("#rstate").value.trim())) toast("State looks like an abbreviation. Write the full state name.", "err");
  if (looksLikeAbbr($("#rarea").value.trim())) toast("Area looks like an abbreviation. Write the full area name.", "err");

  btn.disabled = true;
  btn.textContent = "Checking photos…";
  const img = await checkAllImages(F.files);
  const fresh = img.filter((r) => !F.flagged.has(r.index - 1));
  if (fresh.length) {
    fresh.forEach((r) => {
      F.flagged.add(r.index - 1);
      toast(`Photo ${r.index}: ${r.issues[0]}. Remove it, or submit again to override.`, "err", 6000);
    });
    return reset();
  }
  if (F.flagged.size) {
    const still = [...F.flagged].filter((i) => i < F.files.length).sort((a, b) => b - a);
    if (still.length) {
      still.forEach((i) => (F.files.splice(i, 1), F.flagged.delete(i)));
      renderPreviews();
      toast("Flagged photos removed. Submitting the rest.");
    }
  }
  if (!F.files.length) {
    toast("No valid photos left. Add at least one.", "err");
    return reset();
  }

  let lat = F.lat, lng = F.lng;
  if (lat == null) {
    try {
      const g = await (await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent([specific, area, state].join(", "))}&format=json&limit=1&accept-language=en`)).json();
      if (g?.length) (lat = +g[0].lat), (lng = +g[0].lon);
    } catch {}
  }
  if (lat == null) {
    toast("Couldn't place this on the map. Drop the pin or pick a search result.", "err");
    return reset();
  }

  const before = S.people.get(normName(name));
  const beforeBadges = new Set(before?.badges || []);
  const id = genId();
  const codes = getLocationCode(lat, lng);
  const row = {
    id,
    reporter: name,
    state,
    area,
    specific,
    type: F.type,
    cats: F.cats,
    sev: F.sev,
    notes,
    lat,
    lng,
    digipin: codes.digipin || null,
    pluscode: codes.pluscode || null,
    ts: new Date().toISOString(),
  };
  try {
    if (S.sample) {
      setRows([{ ...row, photos: F.files.map((f) => URL.createObjectURL(f)) }, ...S.all], true);
    } else {
      const photos = await uploadPhotos(id, F.files, (i, n) => (btn.textContent = `Uploading ${i}/${n}…`));
      btn.textContent = "Pinning…";
      await insertReport(row, photos);
      const { rows, sample } = await fetchReports();
      setRows(rows, sample);
    }
  } catch (e) {
    toast("Submit failed: " + (e.message || "unknown error"), "err");
    return reset();
  }
  rememberMe(name, id);
  celebrate(id, name, beforeBadges);
  reset();
}

function celebrate(id, name, beforeBadges) {
  const t = S.treeById.get(id);
  const pts = S.reportPts.get(id);
  const me = myPerson();
  const newBadges = BADGES.filter((b) => me?.badges.has(b.k) && !beforeBadges.has(b.k));
  $("#rp-form").hidden = true;
  const el = $("#rp-done");
  el.classList.add("on");
  el.innerHTML = `
    <div class="done-stamp stamp-press">${stamp({ line: `RECORDED · ${(S.city?.name || "DUMPSPOT").toUpperCase()} · TREE NO. ${pad(t?.n || 0)} · ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()} ·` })}</div>
    <p class="label">Pinned · ${esc(id)}${S.sample ? " · sample mode, not saved" : ""}</p>
    <h1 class="page-h">Tree <em>#${pad(t?.n || 0)}</em> earned.</h1>
    <p class="lede">It's on the map. ${esc(TREE_LINE().split(". ")[1])}</p>
    <div class="done-stats">
      <div class="stat stat-leaf"><span class="stat-l">Points</span><b class="stat-v">+${pts?.total || 0}</b></div>
      <div class="stat"><span class="stat-l">Your total</span><b class="stat-v">${me?.pts || 0}</b></div>
      <div class="stat"><span class="stat-l">Level</span><b class="stat-v stat-sm">${esc(me?.level.name || "")}</b></div>
    </div>
    ${newBadges.length ? `<div class="done-badges"><p class="label">New badge${newBadges.length > 1 ? "s" : ""}</p>${newBadges.map((b) => `<span class="badge-pill">${esc(b.name)}</span>`).join("")}</div>` : ""}
    ${S.all.find((x) => x.id === id) ? `<div class="done-spec"><p class="label">Your report, as a plant</p>${specimenCard(S.all.find((x) => x.id === id))}</div>` : ""}
    <div class="done-actions">
      <a class="sign" href="#/r/${encodeURIComponent(id)}">See it on the map</a>
      <a class="plate-btn" href="#/garden">Visit the garden</a>
      <button class="plate-btn" id="again">Report another</button>
    </div>`;
  const mount = el.querySelector(".spec-mount");
  if (mount) mountSpecimen(mount, S.all.find((x) => x.id === id), { aspect: 0.85 });
  sessionStorage.setItem("ds.focusTree", t?.n);
  $("#again").addEventListener("click", resetForm);
  window.scrollTo({ top: 0 });
}

function resetForm() {
  ["rstate", "rarea", "rspec", "rnotes"].forEach((id) => ($("#" + id).value = ""));
  $$(".tagb.on, .ccard.on, .rf-sev.on").forEach((b) => b.classList.remove("on"));
  $("#rf-scale").style.setProperty("--at", 0);
  cur = 0;
  Object.assign(F, { type: [], sev: [], cats: [], files: [], lat: null, lng: null });
  F.flagged.clear();
  pinMarker?.remove();
  $("#pin-dp").textContent = "";
  $("#pin-pc").textContent = "";
  $("#pin-rev").textContent = "Tap the map to drop a pin.";
  renderPreviews();
  $("#rp-form").hidden = false;
  $("#rp-done").classList.remove("on");
  go("report");
  step(0, true);
  if (S.city) {
    $("#rstate").value = S.city.state || "";
    $("#rarea").value = S.city.name;
    pinMap?.flyTo({ center: [S.city.lng, S.city.lat], zoom: 12 });
  }
  preview();
}
