// Report detail: a drawer that slides in over any view. Route: #/r/<id>
import { $, esc, fmtTs, pad, ago } from "../lib/util.js";
import { formatDigipin } from "../lib/geo.js";
import { S } from "../core/state.js";
import { catMeta, sevRank, sevLabel, SEV_COLORS, RULES } from "../data/derive.js";
import { ICONS, catIcon } from "../ui/icons.js";
import { registerView, toast } from "../ui/shell.js";
import { flyToReport, highlight } from "./map.js";
import { specimenCard, mountSpecimen } from "../ui/specimen.js";

let openId = null, unmount = null;

export function initDetail() {
  $("#scrim").addEventListener("click", close);
  registerView("detail", { enter: open, leave: hide });
}

function close() {
  if (location.hash.startsWith("#/r/")) history.length > 1 ? history.back() : (location.hash = "/map");
}

function hide() {
  if (!openId) return;
  openId = null;
  unmount?.();
  unmount = null;
  $("#drawer").classList.remove("on");
  $("#scrim").classList.remove("on");
  highlight(null);
}

function open(id) {
  const r = S.all.find((x) => x.id === id);
  if (!r) {
    if (S.all.length) toast("That report could not be found.", "err");
    return;
  }
  openId = id;
  const t = S.treeById.get(id);
  const pts = S.reportPts.get(id);
  const s = sevRank(r.sev);
  const photos = r.photos.length
    ? `<div class="dr-photos n${Math.min(r.photos.length, 6)}">${r.photos
        .slice(0, 6)
        .map((p, i) => `<a href="${esc(p)}" target="_blank" rel="noopener" style="--d:${i * 50}ms"><img src="${esc(p)}" alt="Photo ${i + 1} of the reported spot" loading="lazy"></a>`)
        .join("")}</div>`
    : `<div class="dr-nophoto">${ICONS.photo}<span class="mono">No photo</span></div>`;
  const ruleLabel = (k) => RULES.find((x) => x.k === k)?.label || k;
  $("#drawer").innerHTML = `
    <div class="dr-top">
      <span class="mono dr-id">${esc(r.id)}</span>
      <div class="dr-actions">
        <button class="icon-plate" id="dr-copy" title="Copy link">${ICONS.share}</button>
        <a class="icon-plate" href="https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lng}#map=18/${r.lat}/${r.lng}" target="_blank" rel="noopener" title="Open in OpenStreetMap">${ICONS.ext}</a>
        <button class="icon-plate" id="dr-close" title="Close (Esc)">${ICONS.close}</button>
      </div>
    </div>
    <div class="dr-scroll">
      ${photos}
      <div class="dr-body">
        <p class="label">${esc(r.area)}, ${esc(r.state)}</p>
        <h2 class="dr-title">${esc(r.specific)}</h2>
        <p class="mono dr-meta">${esc(fmtTs(r.ts))} · by ${esc(r.reporter)}</p>

        <div class="dr-sev"><span class="dr-sev-bar">${[1, 2, 3, 4].map((i) => `<i style="background:${i <= s ? SEV_COLORS[s] : "var(--line)"}"></i>`).join("")}</span><span class="mono">${sevLabel(s)}</span></div>

        <div class="dr-sec dr-spec"><p class="label">Specimen · drawn from this report</p>${specimenCard(r)}</div>

        ${r.cats.length ? `<div class="dr-sec"><p class="label">Category</p><div class="dr-cats">${r.cats.map((c) => `<span class="cat-pill" style="--c:${catMeta(c).color}">${catIcon(c)}${esc(c)}</span>`).join("")}</div></div>` : ""}
        ${r.type.length ? `<div class="dr-sec"><p class="label">Type of site</p><div class="dr-tags">${r.type.map((x) => `<span class="tagx">${esc(x)}</span>`).join("")}</div></div>` : ""}
        ${r.sev.length ? `<div class="dr-sec"><p class="label">Severity tags</p><div class="dr-tags">${r.sev.map((x) => `<span class="tagx">${esc(x)}</span>`).join("")}</div></div>` : ""}
        ${r.notes ? `<div class="dr-sec"><p class="label">Notes</p><p class="dr-notes">${esc(r.notes)}</p></div>` : ""}

        <div class="dr-sec dr-codes">
          <div><p class="label">Coordinates</p><p class="mono">${(+r.lat).toFixed(6)}, ${(+r.lng).toFixed(6)}</p></div>
          ${r.digipin ? `<div><p class="label">DigiPin</p><p class="mono">${esc(formatDigipin(r.digipin))}</p></div>` : ""}
          ${r.pluscode ? `<div><p class="label">Plus Code</p><p class="mono">${esc(r.pluscode)}</p></div>` : ""}
        </div>

        ${
          t
            ? `<a class="dr-tree" href="#/garden" data-tree="${t.n}">
          <span class="dr-tree-n">${pad(t.n)}</span>
          <span class="dr-tree-b"><span class="label">This report earned a tree</span><b>See it in the garden</b><i class="mono">${esc(t.stage.name)}</i></span>
          <span class="dr-tree-ico" style="color:var(--moss)">${ICONS.tree}</span></a>`
            : ""
        }
        ${
          pts
            ? `<div class="dr-sec"><p class="label">Points earned · ${pts.total}</p><div class="dr-pts">${pts.parts
                .map(([k, v]) => `<span class="mono"><b>+${v}</b> ${esc(ruleLabel(k))}</span>`)
                .join("")}</div></div>`
            : ""
        }
      </div>
    </div>`;
  unmount?.();
  unmount = mountSpecimen($("#drawer .spec-mount"), r, { aspect: 0.72 });
  $("#drawer").classList.add("on");
  $("#scrim").classList.add("on");
  $("#dr-close").addEventListener("click", close);
  $("#dr-copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      toast("Link copied.");
    } catch {
      toast(location.href);
    }
  });
  $(".dr-tree")?.addEventListener("click", () => sessionStorage.setItem("ds.focusTree", t.n));
  if (document.body.dataset.view === "map") flyToReport(r);
}
