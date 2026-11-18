// Everything the revamp adds (trees, points, levels, badges, cities) is computed
// from the existing report rows. Nothing here is stored in the database.

import { DAY, seeded } from "../lib/util.js";

export const CATS = [
  { key: "Plastic waste", label: "Plastic", icon: "bag", color: "#2F7DD1", tree: "neem" },
  { key: "Food waste", label: "Food waste", icon: "food", color: "#C99A1E", tree: "mango" },
  { key: "Construction", label: "Debris", icon: "wall", color: "#8C7B66", tree: "peepal" },
  { key: "Nala / Sewage", label: "Nala / Sewage", icon: "drop", color: "#169C9C", tree: "arjun" },
  { key: "Burning garbage", label: "Burning", icon: "flame", color: "#8E3B6E", tree: "banyan" },
  { key: "E-waste", label: "E-waste", icon: "chip", color: "#7357D9", tree: "gulmohar" },
  { key: "Medical waste", label: "Medical", icon: "pill", color: "#D2427F", tree: "ashoka" },
  { key: "Animal waste", label: "Animal", icon: "paw", color: "#9A6440", tree: "jamun" },
  { key: "Mixed / general", label: "Mixed", icon: "bin", color: "#5A6B85", tree: "amaltas" },
];
export const catMeta = (key) => CATS.find((c) => c.key === key) || CATS[8];
export const TYPES = ["Road", "Footpath", "Nala / Drain", "Open plot", "Park", "Market", "Near school", "Near hospital", "Road encroachment"];
export const SEVS = ["Minor", "Moderate", "Severe", "Blocking road"];
export const SEV_COLORS = ["#E3E8F5", "#B9C6F7", "#7D93F0", "#2448D8", "#101C63"];

export function sevRank(sev) {
  if (!sev || !sev.length) return 0;
  let best = 0;
  for (const s of sev) {
    const l = s.toLowerCase();
    const v = l.includes("block") ? 4 : l.includes("severe") ? 3 : l.includes("moderate") ? 2 : 1;
    best = Math.max(best, v);
  }
  return best;
}
export const sevLabel = (n) => ["Untagged", "Minor", "Moderate", "Severe", "Blocking"][n];

// ── Trees ──────────────────────────────────────────────────────────────
// shape: round | umbrella | cone | column | spread | layered
export const SPECIES = {
  neem: { name: "Neem", latin: "Azadirachta indica", shape: "round", leaf: "#45B04E", h: 1.0 },
  mango: { name: "Mango", latin: "Mangifera indica", shape: "round", leaf: "#268A44", h: 1.05 },
  peepal: { name: "Peepal", latin: "Ficus religiosa", shape: "spread", leaf: "#5CC45E", h: 1.15 },
  arjun: { name: "Arjun", latin: "Terminalia arjuna", shape: "column", leaf: "#35A356", h: 1.3 },
  banyan: { name: "Banyan", latin: "Ficus benghalensis", shape: "umbrella", leaf: "#22803E", h: 1.0 },
  gulmohar: { name: "Gulmohar", latin: "Delonix regia", shape: "umbrella", leaf: "#2A9446", h: 0.95 },
  ashoka: { name: "Ashoka", latin: "Polyalthia longifolia", shape: "cone", leaf: "#1E7A3A", h: 1.4 },
  jamun: { name: "Jamun", latin: "Syzygium cumini", shape: "layered", leaf: "#2E9A4E", h: 1.1 },
  amaltas: { name: "Amaltas", latin: "Cassia fistula", shape: "round", leaf: "#E7B52C", h: 0.95 },
};

export const STAGES = [
  { key: "seed", name: "Seed", until: 1, scale: 0.18, co2: 0 },
  { key: "sprout", name: "Sprout", until: 7, scale: 0.35, co2: 0.5 },
  { key: "sapling", name: "Sapling", until: 30, scale: 0.55, co2: 2 },
  { key: "young", name: "Young tree", until: 180, scale: 0.8, co2: 8 },
  { key: "mature", name: "Mature", until: Infinity, scale: 1, co2: 21 },
];

export function stageFor(ts) {
  const days = (Date.now() - new Date(ts)) / DAY;
  return STAGES.find((s) => days < s.until);
}

// One tree per report. Number = order planted across all reports (#1 is the oldest).
export function buildTrees(reports) {
  const asc = [...reports].sort((a, b) => new Date(a.ts) - new Date(b.ts));
  return asc.map((r, i) => {
    const sp = catMeta(r.cats[0]).tree;
    const rnd = seeded(r.id);
    const stage = stageFor(r.ts);
    return {
      n: i + 1,
      id: r.id,
      report: r,
      species: sp,
      ...SPECIES[sp],
      stage,
      jitter: [rnd(), rnd(), rnd(), rnd()],
    };
  });
}

// ── Points ─────────────────────────────────────────────────────────────
export const RULES = [
  { k: "base", label: "File a report", pts: 10 },
  { k: "photo", label: "Each photo (up to 6)", pts: 2 },
  { k: "notes", label: "Notes with real detail (20+ chars)", pts: 4 },
  { k: "cat", label: "Each category tagged (up to 3)", pts: 1 },
  { k: "sev", label: "Severity tagged", pts: 2 },
  { k: "type", label: "Type of site tagged", pts: 2 },
  { k: "pin", label: "Exact pin (DigiPin or Plus Code)", pts: 3 },
  { k: "urgent", label: "Severe or blocking hazard", pts: 3 },
  { k: "pioneer", label: "First ever report in that area", pts: 15 },
];

export function scoreReport(r, isPioneer) {
  const parts = [["base", 10]];
  const ph = Math.min(6, (r.photos || []).length || r._photoCount || 0);
  if (ph) parts.push(["photo", ph * 2]);
  if ((r.notes || "").trim().length >= 20) parts.push(["notes", 4]);
  const c = Math.min(3, (r.cats || []).length);
  if (c) parts.push(["cat", c]);
  if ((r.sev || []).length) parts.push(["sev", 2]);
  if ((r.type || []).length) parts.push(["type", 2]);
  if (r.digipin || r.pluscode) parts.push(["pin", 3]);
  if (sevRank(r.sev) >= 3) parts.push(["urgent", 3]);
  if (isPioneer) parts.push(["pioneer", 15]);
  return { total: parts.reduce((a, p) => a + p[1], 0), parts };
}

export const LEVELS = [
  { at: 0, name: "Seed" },
  { at: 25, name: "Sprout" },
  { at: 75, name: "Sapling" },
  { at: 175, name: "Grove Keeper" },
  { at: 400, name: "Canopy" },
  { at: 900, name: "Old Growth" },
];
export function levelFor(pts) {
  let i = 0;
  while (i < LEVELS.length - 1 && pts >= LEVELS[i + 1].at) i++;
  const cur = LEVELS[i], next = LEVELS[i + 1];
  const prog = next ? (pts - cur.at) / (next.at - cur.at) : 1;
  return { i, ...cur, next, prog };
}

export const BADGES = [
  { k: "first", name: "First Stake", desc: "File your first report" },
  { k: "five", name: "Five Spots", desc: "File 5 reports" },
  { k: "ten", name: "Survey Crew", desc: "File 10 reports" },
  { k: "shutter", name: "Shutterbug", desc: "A report with 6 photos" },
  { k: "pioneer", name: "Pioneer", desc: "First report in a new area" },
  { k: "night", name: "Night Watch", desc: "Report between 10pm and 5am" },
  { k: "dawn", name: "Dawn Patrol", desc: "Report between 5am and 7am" },
  { k: "carto", name: "Cartographer", desc: "Report in 3 different areas" },
  { k: "collector", name: "Taxonomist", desc: "Tag 5 different categories" },
  { k: "streak", name: "Three-Day Streak", desc: "Report on 3 days in a row" },
  { k: "urgent", name: "First Responder", desc: "Flag a road-blocking hazard" },
  { k: "botanist", name: "Wide Eye", desc: "Report 3 different kinds of problem" },
];

export const normName = (s) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");

// Full scoreboard across all reports. Pioneer status is global (first report in an area ever).
export function buildPeople(reports) {
  const asc = [...reports].sort((a, b) => new Date(a.ts) - new Date(b.ts));
  const seenArea = new Set();
  const people = new Map();
  const reportPts = new Map();
  for (const r of asc) {
    const areaKey = normName(r.area) + "|" + normName(r.state);
    const pioneer = !seenArea.has(areaKey);
    seenArea.add(areaKey);
    const sc = scoreReport(r, pioneer);
    reportPts.set(r.id, { ...sc, pioneer });
    const key = normName(r.reporter);
    if (!key) continue;
    if (!people.has(key)) people.set(key, { key, name: r.reporter.trim(), pts: 0, reports: [], pioneer: 0 });
    const p = people.get(key);
    p.pts += sc.total;
    p.reports.push(r);
    if (pioneer) p.pioneer++;
  }
  for (const p of people.values()) {
    p.level = levelFor(p.pts);
    p.badges = badgesFor(p);
    p.species = new Set(p.reports.map((r) => catMeta(r.cats[0]).tree)).size;
    p.last = p.reports[p.reports.length - 1]?.ts;
  }
  return { people, reportPts };
}

function badgesFor(p) {
  const rs = p.reports;
  const got = new Set();
  if (rs.length >= 1) got.add("first");
  if (rs.length >= 5) got.add("five");
  if (rs.length >= 10) got.add("ten");
  if (rs.some((r) => (r.photos || []).length >= 6)) got.add("shutter");
  if (p.pioneer) got.add("pioneer");
  const hours = rs.map((r) => new Date(r.ts).getHours());
  if (hours.some((h) => h >= 22 || h < 5)) got.add("night");
  if (hours.some((h) => h >= 5 && h < 7)) got.add("dawn");
  if (new Set(rs.map((r) => normName(r.area))).size >= 3) got.add("carto");
  if (new Set(rs.flatMap((r) => r.cats || [])).size >= 5) got.add("collector");
  const days = [...new Set(rs.map((r) => Math.floor(new Date(r.ts).setHours(0, 0, 0, 0) / DAY)))].sort((a, b) => a - b);
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = days[i] === days[i - 1] + 1 ? run + 1 : 1;
    if (run >= 3) got.add("streak");
  }
  if (rs.some((r) => sevRank(r.sev) === 4)) got.add("urgent");
  if (new Set(rs.map((r) => catMeta(r.cats[0]).tree)).size >= 3) got.add("botanist");
  return got;
}

// ── Cities from data ───────────────────────────────────────────────────
// Groups reports by their area (district/city) so the picker can suggest places with activity.
export function citiesFromData(reports) {
  const g = new Map();
  for (const r of reports) {
    if (r.lat == null) continue;
    const k = normName(r.area) + "|" + normName(r.state);
    if (!g.has(k)) g.set(k, { name: r.area, state: r.state, pts: [] });
    g.get(k).pts.push(r);
  }
  return [...g.values()]
    .map((c) => {
      const lat = median(c.pts.map((p) => p.lat));
      const lng = median(c.pts.map((p) => p.lng));
      // drop far outliers before computing bounds
      const near = c.pts.filter((p) => Math.abs(p.lat - lat) < 0.6 && Math.abs(p.lng - lng) < 0.6);
      const lats = near.map((p) => p.lat), lngs = near.map((p) => p.lng);
      const bbox = [Math.min(...lngs) - 0.03, Math.min(...lats) - 0.03, Math.max(...lngs) + 0.03, Math.max(...lats) + 0.03];
      return { name: c.name, state: c.state, lat, lng, bbox, count: c.pts.length, radiusKm: 18, source: "data" };
    })
    .sort((a, b) => b.count - a.count);
}

function median(a) {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
}
