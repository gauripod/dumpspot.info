// #/about: the vision, in one page. Keepers report, the record makes it public,
// the gardener plants the tree each report earns.
import { $, fmtN } from "../lib/util.js";
import { S } from "../core/state.js";
import { stamp } from "../ui/brand.js";
import { ICONS } from "../ui/icons.js";
import { registerView } from "../ui/shell.js";
import { gardenerName } from "../data/site.js";
import { specimenCard, mountAll } from "../ui/specimen.js";
import { spotWalk } from "../ui/brand.js";

let off = null;

export function initAbout() {
  registerView("about", {
    enter() {
      off?.();
      const n = S.all.length, keepers = S.people.size;
      const latest = [...S.all].sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 6);
      $("#v-about").innerHTML = `
      <article class="page about">
        <header class="page-head">
          <p class="kicker">How DumpSpot works</p>
          <h1 class="page-h">Report trash. <em>Get a tree planted.</em></h1>
          <p class="lede">See trash on your street? Snap it, pin it, done. It goes on a public map so it's harder to ignore. And every report gets a tree planted.</p>
        </header>

        <ol class="chapters">
          <li class="chapter">
            <span class="chapter-n">01</span>
            <div><h2>You report</h2>
            <p>Anyone who reports. Photo, pin, name. No account. You get points, levels and badges.</p></div>
          </li>
          <li class="chapter">
            <span class="chapter-n">02</span>
            <div><h2>It goes on the map</h2>
            <p>Every report shows up on the map. You can see where trash piles up, what kind, and which spots keep coming back.</p></div>
          </li>
          <li class="chapter">
            <span class="chapter-n">03</span>
            <div><h2>A tree gets planted</h2>
            <p>One report, one tree. We plant it wherever there's space, not necessarily where you reported. The garden keeps count.</p></div>
          </li>
        </ol>

        <section class="spec-sheet">
          <div class="spec-sheet-head">
            <h2 class="t-title">The specimen drawer</h2>
            <p class="t-small muted">Each report is drawn as a plant from its own data. Stems are categories, leaves are tags, height is age, lean is the hour, yellow heads are photos, stains are severity.</p>
          </div>
          ${
            latest.length
              ? `<div class="spec-grid">${latest.map((r) => specimenCard(r, { label: `${r.area || "Unnamed spot"} · ${new Date(r.ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`, key: false })).join("")}</div>`
              : `<div class="spot-empty">${spotWalk()}<p class="t-small">${S.offline ? "Reports are offline, so there's nothing here yet." : "No reports yet."}</p></div>`
          }
        </section>

        <section class="roles">
          <div class="role"><span class="label">Keepers</span><b class="t-figure">${fmtN(keepers)}</b><p class="t-small">People who report.</p><a class="link-btn" href="#/ranks">See the keepers</a></div>
          <div class="role"><span class="label">Reports</span><b class="t-figure">${fmtN(n)}</b><p class="t-small">Each with a photo, a pin and a time.</p><a class="link-btn" href="#/map">Explore the record</a></div>
          <div class="role"><span class="label">Trees earned</span><b class="t-figure leaf">${fmtN(n)}</b><p class="t-small">One for every report, planted by ${gardenerName()}.</p><a class="link-btn" href="#/garden">Visit the garden</a></div>
        </section>

        <section class="contrib">
          <div>
            <p class="label">Contributions welcome</p>
            <h2 class="t-title">Help build DumpSpot</h2>
            <p>DumpSpot is made by Gauri. It isn't open source, but the code is public and help is very welcome: bug reports, ideas, fixes, design, more cities.</p>
          </div>
          <div class="contrib-actions">
            <a class="sign" href="https://github.com/gauripod/dumpspot.info/blob/main/CONTRIBUTION.md" target="_blank" rel="noopener">How to contribute</a>
            <a class="plate-btn" href="https://github.com/gauripod/dumpspot.info/issues" target="_blank" rel="noopener">Report a bug</a>
          </div>
        </section>

        <section class="about-end">
          <span class="about-stamp">${stamp({ spin: true })}</span>
          <p class="lede">Seen something?</p>
          <a class="sign sign-report" href="#/report"><svg class="i-plus" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>Report a spot</a>
        </section>
      </article>`;
      const byId = new Map(latest.map((r) => [String(r.id), r]));
      off = mountAll($("#v-about"), (id) => byId.get(id), { aspect: 1.15 });
    },
    leave() {
      off?.();
      off = null;
    },
  });
}
