// #/system: the design and brand system, rendered from the real tokens and components.
// If something on the site doesn't match this page, the site is wrong. See DESIGN.md.
import { $ } from "../lib/util.js";
import { BRAND, stamp, TAGLINE } from "../ui/brand.js";
import { ICONS } from "../ui/icons.js";
import { SEV_COLORS, sevLabel } from "../data/derive.js";
import { registerView } from "../ui/shell.js";
import { specimenCard, mountAll } from "../ui/specimen.js";

const DEMO = [
  { id: "demo-a", ts: new Date(Date.now() - 2 * 864e5).setHours(8), cats: ["Plastic waste"], type: ["Road"], sev: [], photos: [1] },
  { id: "demo-b", ts: new Date(Date.now() - 40 * 864e5).setHours(14), cats: ["Food waste", "Nala / Sewage"], type: ["Market", "Nala / Drain"], sev: ["Moderate"], photos: [1, 2] },
  { id: "demo-c", ts: new Date(Date.now() - 150 * 864e5).setHours(19), cats: ["Construction", "Nala / Sewage", "Plastic waste"], type: ["Near school", "Footpath"], sev: ["Severe", "Blocking road"], photos: [1, 2, 3] },
];

const COLOURS = [
  ["Ink", "--ink", "Text, structure, Spot's line"],
  ["Paper", "--paper", "Quiet panels, hover rows"],
  ["Sheet", "--sheet", "Page ground, panels, inputs"],
  ["Stone", "--stone", "Secondary text"],
  ["Moss", "--moss", "Brand: links, controls, trees, points"],
  ["Clay", "--clay", "The problem: complaints, hazards"],
  ["Sky", "--sky", "Water, rain"],
  ["Pollen", "--pollen", "Highlighter"],
  ["Report pink", "--pink", "Report a spot, and nothing else"],
];
const TYPE = [
  ["Display", "t-display", "Gloock · 52 / 56 · one per page", "84 spots reported in Bengaluru."],
  ["Title", "t-title", "Gloock · 28 / 34 · sections", "Where it keeps happening"],
  ["Figure", "t-figure", "B612 Mono · 28 / 34 · counts", "1,284"],
  ["Body", "", "Hanken Grotesk 400 · 15 / 24 · reading", "A report takes about a minute: a photo, a pin and your name."],
  ["Small", "t-small", "Hanken Grotesk 400 · 13 / 20 · captions, notes", "Each circle groups reports within about half a kilometre."],
  ["Label", "t-label", "B612 Mono 400 · 11 / 16 · uppercase", "Reports per day"],
];
const SPACE = [4, 8, 12, 16, 24, 32, 48, 64];

export function initSystem() {
  registerView("system", {
    enter() {
      $("#v-system").innerHTML = `
      <div class="page">
        <header class="page-head">
          <p class="kicker">Design system · v7</p>
          <h1 class="page-h">Fresh garden</h1>
          <p class="lede">A clean white sheet with living colour: green for what grows back, red-orange for what is going wrong, a yellow highlighter, and one glossy pink button that asks you to act. Everything on DumpSpot is built from the values on this page.</p>
        </header>

        <section class="sys-sec"><span class="label">Identity · stamp, mark, wordmark</span><p class="lede" style="margin-bottom:var(--sp-5)">${TAGLINE}</p>
          <div class="sys-logo">
            <span class="sys-stamp">${stamp({ spin: true })}</span>
            <span class="brand-mark">${BRAND}</span>
            <div class="brand"><span class="brand-mark">${BRAND}</span><span class="brand-word">DumpSpot</span></div>
            <p class="t-small muted" style="max-width:320px">Spot, the street dog who finds dump spots. Green ear, red-orange spot over one eye. Its eyes follow your cursor. Drawing from OpenMoji, CC BY-SA 4.0, recoloured.</p>
          </div>
        </section>

        <section class="sys-sec"><span class="label">Colour</span>
          <div class="sys-swatches">${COLOURS.map(([n, v, u]) => `<div class="sys-sw"><i style="background:var(${v})"></i><b>${n}</b><span class="muted">${u}</span></div>`).join("")}</div>
          <div class="sys-row" style="margin-top:var(--sp-5)"><span class="label">Severity</span><div class="sys-demo">${[0, 1, 2, 3, 4].map((i) => `<span class="sys-demo t-small"><i class="dot" style="background:${SEV_COLORS[i]}"></i>${sevLabel(i)}</span>`).join("")}</div></div>
        </section>

        <section class="sys-sec"><span class="label">Type · three faces, five roles</span>
          ${TYPE.map(([n, c, spec, s]) => `<div class="sys-row"><span class="label">${n}<br><span class="t-small muted" style="text-transform:none;letter-spacing:0;font-family:var(--font)">${spec}</span></span><p class="${c}">${s}</p></div>`).join("")}
        </section>

        <section class="sys-sec"><span class="label">Space · 4px base</span>
          ${SPACE.map((s, i) => `<div class="sys-row"><span class="label">sp-${i + 1} · ${s}px</span><div class="sys-space"><i style="width:${s}px"></i></div></div>`).join("")}
        </section>

        <section class="sys-sec"><span class="label">Components</span>
          <div class="sys-row"><span class="label">Buttons</span><div class="sys-demo"><a class="sign sign-report"><svg class="i-plus" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>Report a spot</a><a class="sign">Primary action</a><button class="plate-btn">Show every city</button><a class="link-btn">Text link</a></div></div>
          <div class="sys-row"><span class="label">Segmented</span><div class="sys-demo"><div class="seg"><button class="on">Clusters</button><button>Every report</button><span class="seg-thumb" style="width:94px"></span></div></div></div>
          <div class="sys-row"><span class="label">Tag</span><div class="sys-demo"><span class="tag">Silk Board · 12 reports</span></div></div>
          <div class="sys-row"><span class="label">Stat</span><div class="sys-demo" style="gap:var(--sp-6)"><div class="stat"><b class="stat-v">84</b><span class="stat-l">Reports</span></div><div class="stat stat-leaf"><b class="stat-v">84</b><span class="stat-l">Trees</span></div></div></div>
          <div class="sys-row"><span class="label">Field</span><div style="max-width:320px;width:100%"><div class="field"><label>Your name <b class="req">required</b></label><input placeholder="What to call you"></div></div></div>
          <div class="sys-row"><span class="label">Note</span><div class="gd-empty" style="position:static;transform:none"><p>Reports are <b class="off-word">offline</b> right now.</p></div></div>
          <div class="sys-row"><span class="label">List row</span><div style="width:100%"><a class="lrow" style="grid-template-columns:72px 1fr"><span class="lrow-time">2:14 pm</span><span class="lrow-main"><span class="lrow-t"><span class="ul">Silk Board Junction</span></span><span class="lrow-a">Bengaluru Urban, Karnataka</span></span></a></div></div>
          <div class="sys-row"><span class="label">Specimen</span><div style="width:100%"><p class="t-small muted" style="margin-bottom:var(--sp-3)">Example specimens from made-up reports: a fresh single-category report, a 40-day-old one, and a severe 5-month-old one with three categories.</p><div class="spec-grid spec-grid-3">${DEMO.map((r, i) => specimenCard(r, { label: ["2 days · 1 category", "40 days · 2 categories", "5 months · severe"][i] })).join("")}</div></div></div>
          <div class="sys-row"><span class="label">Highlight</span><p>Every report <mark>earns a tree</mark>. The gardener plants it wherever there's room to grow.</p></div>
        </section>

        <section class="sys-sec"><span class="label">Rules</span>
          <div class="sys-row"><span class="label">Lines</span><p class="t-small">Every border is 1px line grey, never black. Controls have 6px corners. Menus, toasts and the drawer have 10px corners and one soft shadow. No gradients except the pink button.</p></div>
          <div class="sys-row"><span class="label">Hierarchy</span><p class="t-small">One Display per page. Sections use Title. Nothing else is bigger than Body. Figures use Title size in mono.</p></div>
          <div class="sys-row"><span class="label">Colour ratio</span><p class="t-small">About 85% white, 10% ink and moss, 5% colour. If a screen looks colourful, something is wrong.</p></div>
          <div class="sys-row"><span class="label">Writing</span><p class="t-small">Plain sentences, numbers first. No em dashes. Reports earn trees; the gardener plants them wherever there's room to grow. Never say the tree is planted where you reported, and never name the species. Reporters are keepers, not gardeners.</p></div>
        </section>
      </div>`;
      mountAll($("#v-system"), (id) => DEMO.find((r) => r.id === id), { aspect: 1.15 });
    },
  });
}
