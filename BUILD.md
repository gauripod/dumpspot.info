# Built with: thank you

DumpSpot is built on open-source software and open data. DumpSpot itself is not open source (see LICENSE), but contributions are welcome.
This file thanks every one of them and says what each does here. The same list is in the app under **More → Open source & data** (`js/views/credits.js`); keep both in sync.

## Map & 3D

| Project | What it does in DumpSpot | License |
| --- | --- | --- |
| [MapLibre GL JS](https://maplibre.org) | The 3D city map: extruded buildings, report columns, heat, camera | BSD-3-Clause |
| [three.js](https://threejs.org) | The survey globe on the city picker and the 3D garden | MIT |
| [Lenis](https://github.com/darkroomengineering/lenis) | Smooth scrolling | MIT |
| [OpenFreeMap](https://openfreemap.org) | Free vector map tiles, no API key | MIT (code), ODbL (data) |
| [OpenMapTiles](https://openmaptiles.org) | Vector tile schema the "Field notes" map style is written against | BSD-3, CC-BY 4.0 |
| [world-atlas](https://github.com/topojson/world-atlas) / [Natural Earth](https://www.naturalearthdata.com) | Coastlines that put the globe's dots on real land | ISC, public domain |
| [topojson-client](https://github.com/topojson/topojson-client) | Decodes the world-atlas land shapes | ISC |

## Data

| Source | What it does in DumpSpot | License |
| --- | --- | --- |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | Streets, buildings and places; public bins, recycling points and dump sites | ODbL |
| [Nominatim](https://nominatim.org) | City and street search, reverse geocoding | GPL-2.0, ODbL data |
| [Overpass API](https://overpass-api.de) | Fetches waste infrastructure inside the chosen city | AGPL-3.0 |
| [Open-Meteo](https://open-meteo.com) | Current PM2.5 grid and rainfall over the last 7 days | AGPL-3.0, CC-BY 4.0 data |
| [Copernicus CAMS](https://atmosphere.copernicus.eu) | Air-quality model behind Open-Meteo's PM2.5 | Copernicus licence (free, attribution) |

## Backend & safety

| Project | What it does in DumpSpot | License |
| --- | --- | --- |
| [Supabase](https://supabase.com) | Postgres + storage for reports and photos | Apache-2.0 |
| [supabase-js](https://github.com/supabase/supabase-js) | Browser database client | MIT |
| [face-api.js](https://github.com/justadudewhohacks/face-api.js) | On-device face detection, so photos show places not people | MIT |
| [Open Location Code](https://github.com/google/open-location-code) | Plus Code algorithm | Apache-2.0 |
| DIGIPIN (India Post) | Digital address grid algorithm | Open specification |

## Type & icons

| Project | Use | License |
| --- | --- | --- |
| [Gloock](https://github.com/duartp/gloock) | Headlines, titles and the wordmark | SIL OFL 1.1 |
| [Hanken Grotesk](https://github.com/marcologous/hanken-grotesk) | Reading text | SIL OFL 1.1 |
| [B612 Mono](https://github.com/polarsys/b612) | Labels, buttons and numbers | SIL OFL 1.1 |
| [Phosphor Icons](https://phosphoricons.com) | Every pictogram | MIT |
| [OpenMoji](https://openmoji.org) | Spot, the dog: "dog face" in the logo, stamp and favicon, "dog" (standing) in loading and empty states, both recoloured | CC BY-SA 4.0 |
| [p5.js](https://p5js.org) | Specimens: every report drawn as a pressed plant, generated from its own data | LGPL-2.1 |

## Hosting & tools

| Project | Use |
| --- | --- |
| [Netlify Edge Functions](https://docs.netlify.com/edge-functions/overview/) | Database proxy that keeps keys server-side |
| [jsDelivr](https://www.jsdelivr.com), [unpkg](https://unpkg.com) | CDNs serving the libraries above |

---

## How the build works

There is no bundler. `index.html` loads ES modules from `js/` and the libraries above from CDNs at pinned versions.
`node build.js` (run by Netlify) only checks env vars and writes `config.js` with the inspect lock.
Local: `node scripts/dev.mjs` · backup: `node scripts/backup.mjs` · the research study uses its own generated demo dataset.

Map data © OpenStreetMap contributors. Thank you to every maintainer and mapper.
