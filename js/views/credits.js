// Credits: every open-source library, typeface, icon set, tile source and dataset DumpSpot uses.
// Keep in sync with BUILD.md.
import { $, esc } from "../lib/util.js";
import { ICONS } from "../ui/icons.js";
import { registerView } from "../ui/shell.js";

export const CREDITS = [
  { group: "Map & 3D", items: [
    { name: "MapLibre GL JS", what: "The 3D city map: extruded buildings, columns, heat, camera", license: "BSD-3-Clause", url: "https://maplibre.org" },
    { name: "three.js", what: "The survey globe and the 3D garden", license: "MIT", url: "https://threejs.org" },
    { name: "Lenis", what: "Smooth scrolling", license: "MIT", url: "https://github.com/darkroomengineering/lenis" },
    { name: "OpenFreeMap", what: "Free vector map tiles, no key", license: "MIT (code) · ODbL (data)", url: "https://openfreemap.org" },
    { name: "OpenMapTiles", what: "The vector tile schema the map style is written against", license: "BSD-3 · CC-BY 4.0", url: "https://openmaptiles.org" },
    { name: "world-atlas / Natural Earth", what: "Coastlines that place the dots on the globe", license: "ISC · Public domain", url: "https://github.com/topojson/world-atlas" },
    { name: "topojson-client", what: "Decodes the world-atlas land shapes", license: "ISC", url: "https://github.com/topojson/topojson-client" },
  ]},
  { group: "Data", items: [
    { name: "OpenStreetMap", what: "Streets, buildings, places, plus public bins & recycling points", license: "ODbL", url: "https://www.openstreetmap.org/copyright" },
    { name: "Nominatim", what: "City and street search, reverse geocoding", license: "GPL-2.0 (software) · ODbL (data)", url: "https://nominatim.org" },
    { name: "Overpass API", what: "Queries OpenStreetMap for waste infrastructure in your city", license: "AGPL-3.0", url: "https://overpass-api.de" },
    { name: "Open-Meteo", what: "PM2.5 air quality and 7-day rainfall", license: "AGPL-3.0 (software) · CC-BY 4.0 (data)", url: "https://open-meteo.com" },
    { name: "Copernicus CAMS", what: "The air quality model behind Open-Meteo's PM2.5", license: "Copernicus licence (free, attribution)", url: "https://atmosphere.copernicus.eu" },
  ]},
  { group: "Backend & safety", items: [
    { name: "Supabase", what: "Postgres database and photo storage for reports", license: "Apache-2.0", url: "https://supabase.com" },
    { name: "supabase-js", what: "Database client in the browser", license: "MIT", url: "https://github.com/supabase/supabase-js" },
    { name: "face-api.js", what: "On-device face detection so photos show places, not people", license: "MIT", url: "https://github.com/justadudewhohacks/face-api.js" },
    { name: "Open Location Code", what: "Plus Code encoding (algorithm)", license: "Apache-2.0", url: "https://github.com/google/open-location-code" },
    { name: "DIGIPIN", what: "India Post's open digital address grid (algorithm)", license: "Open specification", url: "https://www.indiapost.gov.in" },
  ]},
  { group: "Type & icons", items: [
    { name: "Gloock", what: "Headlines, titles and the wordmark", license: "SIL OFL 1.1", url: "https://github.com/duartp/gloock" },
    { name: "Hanken Grotesk", what: "Reading text", license: "SIL OFL 1.1", url: "https://github.com/marcologous/hanken-grotesk" },
    { name: "B612 Mono", what: "Labels, buttons and numbers", license: "SIL OFL 1.1", url: "https://github.com/polarsys/b612" },
    { name: "Phosphor Icons", what: "Every pictogram", license: "MIT", url: "https://phosphoricons.com" },
    { name: "OpenMoji", what: "Spot, the dog in the logo, stamp and empty states (recoloured)", license: "CC BY-SA 4.0", url: "https://openmoji.org" },
    { name: "p5.js", what: "Specimens: each report drawn as a pressed plant from its own data", license: "LGPL-2.1", url: "https://p5js.org" },
  ]},
  { group: "Hosting & tools", items: [
    { name: "Netlify Edge Functions", what: "Keeps keys server-side for the database proxy", license: "Service (Deno runtime: MIT)", url: "https://docs.netlify.com/edge-functions/overview/" },
    { name: "jsDelivr · unpkg", what: "Serve the open-source libraries above", license: "Free open-source CDNs", url: "https://www.jsdelivr.com" },
  ]},
];

export function initCredits() {
  registerView("credits", {
    enter() {
      $("#v-credits").innerHTML = `
      <div class="page credits">
        <header class="page-head">
          <h1 class="page-h">Built on great tools.</h1>
          <p class="lede">DumpSpot runs on these open-source projects and open data. Thank you to everyone behind them.</p>
          <p class="links"><a class="plate-link" href="https://github.com/gauripod/dumpspot" target="_blank" rel="noopener">${ICONS.ext} Source on GitHub</a></p>
        </header>
        ${CREDITS.map((g) => `<section class="cr-group"><h2 class="cr-h">${esc(g.group)}</h2><div class="cr-grid">
          ${g.items.map((c) => `<a class="cr plate" href="${esc(c.url)}" target="_blank" rel="noopener">
            <b>${esc(c.name)}</b><span>${esc(c.what)}</span><span class="shield">${esc(c.license)}</span></a>`).join("")}
        </div></section>`).join("")}
        <p class="muted small">Thanks to everyone who made these. Map data © OpenStreetMap contributors. DumpSpot itself is made by Gauri. It isn't open source, but <a class="link-btn" href="https://github.com/gauripod/dumpspot.info/blob/main/CONTRIBUTION.md" target="_blank" rel="noopener">contributions are welcome</a>.</p>
      </div>`;
    },
  });
}
