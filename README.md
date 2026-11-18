# DumpSpot

A civic reporting tool for public hazards. See garbage, sewage overflow, road encroachment, burning waste, debris: pin it on the map. No account, no login. A name, a location, a photo.

Built for India, works anywhere.

**Live:** [dumpspot.info](https://dumpspot.info) · **Made by** [Gauri](https://github.com/gauripod)

### Versions

| | Where | Code |
|---|---|---|
| **v2** (current) | [dumpspot.info](https://dumpspot.info) | `index.html`, `js/`, `styles/` |
| **v1** (the original) | [dumpspot.info/v1](https://dumpspot.info/v1/) | `v1/` (`index.html`, `app.js`, `style.css`), kept exactly as it shipped |

Both read the same reports from the same database, so nothing from v1 is lost.

### If reports say "offline"

The reports live in a free Supabase project, and Supabase pauses free projects after about 7 days without activity. Open the Supabase dashboard, find the project marked **Paused** and click **Resume**. Then run `node scripts/check-db.mjs` to confirm. The workflow in `.github/workflows/keep-db-awake.yml` pings the database every 3 days so it doesn't pause again (add `DB_URL` and `DB_KEY` as repository secrets).

---

## What it does

Anyone can open DumpSpot and file a report in under a minute. Reports appear live on a shared map. Every pin is a real location with photos, coordinates, and a timestamp. The more reports, the more pressure on civic bodies to act.

No accounts. No bureaucracy. Just evidence.

---

## Features

**Map feed**

- Asks for your city on first load; "Near me" uses browser location only if you tap it
- Each report is a category pin (garbage, sewage, fire, debris etc) with a popup showing photo, location, reporter, timestamp
- Click any pin to open the full report
- Filter by state, area, or garbage category: map and list update simultaneously

**List feed**

- Chronological view: Today / Yesterday / This Week / older months
- Group headings alternate left and right
- Each row shows location, area, category chips, reporter name, local time
- Hover slides the row right with an underline crawl on the title

**Report form**

- Search location via autocomplete (OpenStreetMap Nominatim, no key required)
- After picking a location, a draggable pin map appears: drag or tap to exact spot
- DigiPin code shown live as pin moves (India only)
- Plus Code shown live as pin moves (global)
- Reverse geocode confirmation updates the location field as pin moves
- 9 garbage category cards, type of site tags, severity tags
- Notes field
- Upload up to 6 photos: compressed to WebP 1280px 82% quality in browser before upload
- State and area fields validated on blur: warns if you enter a city as a state or vice versa

**Spam protection**

- Text: abuse list (English + Hindi + Hinglish), gibberish detection, leet-speak bypass normalisation
- Images: blank/solid colour blocked, low-detail blocked, illustration/artwork detected and warned, face detection via face-api.js
- Warn-then-remove flow for images: first attempt warns, second attempt removes flagged photos automatically

**Detail page**

- Full report layout mirroring the form
- Dark Leaflet mini-map with pink area highlight circle
- Photos in a responsive grid
- Report ID, timestamp in viewer's local timezone (IST shown in brackets for non-India viewers)

**Timestamps**

- Stored as UTC, displayed in viewer's local timezone
- India viewers see IST
- Everyone else sees their local time with `[IST]` in brackets

---

## Navigation

On first load DumpSpot asks which city you're looking after, over a three.js globe drawn from real coastlines where every blue stake is a report. Everything after that is scoped to that city. Change it any time from the city plate or with `C`.

Two destinations, one action:

| Where | Route | What it is |
| --- | --- | --- |
| **Explore** · Map | `#/map` (default) | 3D city (MapLibre GL): columns / pins / heat, city dossier, in-view list, **Layers** of open data, timeline brush, hotspot tour |
| **Explore** · List | `#/ledger` | Every report, grouped Today / Yesterday / This week / months, searchable |
| **Garden** | `#/garden`, `/garden` | One three.js tree per report + sortable table. Species from category, size from age, rings mark tree milestones |
| **Report** | `#/report` | Four-step form with a live preview of the tree it plants and the points it earns |
| You | `#/ranks` | Points, level, badges, leaderboard |
| More → Research | `#/study`, `/study` | The same data as a 2D map, a dashboard and 3D, with timed tasks and exportable results |
| More → Credits | `#/credits` | Every library and dataset used, with licences (also in `BUILD.md`) |
| Detail | `#/r/<id>` | Drawer with photos, codes, tree and points breakdown. Shareable link |

**Layers** (Explore → right panel) put open data beside the reports, each with a computed takeaway: public bins & recycling (OpenStreetMap), PM2.5 now (Open-Meteo), rain over 7 days (Open-Meteo), or your own CSV / GeoJSON.

Keyboard: `E` explore · `L` map/list · `G` garden · `Y` you · `R` report · `C` city · `/` search · `Esc` close.

If the database is unreachable the app says so and shows no reports: it never invents data. Generated demo reports are used only inside the research study (`/study`), so every participant sees the same data.

**Every report plants a tree.** Trees, points, levels, badges and cities are all computed in the browser from the existing `reports` rows: there are no new tables and nothing to migrate.

---

## How it's built

No framework. No build step. ES modules loaded straight in the browser; MapLibre GL, three.js and Supabase from CDN.

- `index.html`: shell, import map, script tags
- `styles/tokens.css`, `styles/app.css`: the Field Plan design system (see `DESIGN.md`)
- `js/main.js`: entry; `js/core/state.js`: state + events; `js/ui/`: router, toasts, icons
- `js/data/db.js`: the only database access (select + insert, same schema as v1)
- `js/data/derive.js`: trees, points, levels, badges, cities
- `js/lib/`: geo (DigiPin, Plus Code, hex bins), spam checks (unchanged from v1), utils
- `js/views/`: city picker + globe, map, ledger, detail, report, garden, ranks, study
- `scripts/dev.mjs`: local server with the same `/sb` and `/tiles` proxy; `scripts/backup.mjs`: read-only snapshot of all rows
- `config.js`: inspect lock only, gitignored, never pushed
- `build.js`: checks the environment exists, then writes the lock flag
- `netlify.toml`: build command and the tile/database proxy
- `netlify/edge-functions/proxy.js`: reads the keys on the server and never sends them to the browser
- `favicon.svg`: the asterisk on highlighter mark

Everything loads from CDN. No npm, no bundler, no local install required.

---

## Running locally

```bash
node scripts/dev.mjs
```

Open `http://localhost:8080`. The dev server proxies `/sb` and `/tiles` like the Netlify edge function, reading `DB_URL`, `DB_KEY` and `CARTER_KEYS` from the environment or your local `config.js`. If the database can't be reached on localhost, the app shows clearly labelled sample data and never saves submissions.

Back up every report before deploying:

```bash
node scripts/backup.mjs
```

---

## Deploying

1. Push `index.html`, `style.css`, `app.js`, `build.js`, `netlify.toml`, `favicon.svg` to GitHub
2. Connect repo to Netlify
3. Set environment variables in Netlify → Site settings → Environment variables:
   - `DB_URL`: your database project URL
   - `DB_KEY`: your publishable API key, not a secret key
   - `CARTER_KEYS`: your CARTO basemap key
   - `LOCK_INSPECT_ENV`: `true` (disables devtools on production)
4. Deploy: Netlify runs `node build.js`. The build only checks that the variables exist. An edge proxy reads `CARTER_KEYS` and `DB_KEY` when a request comes in, so neither value is published in the site.

---

## Report ID

Every report gets `DS-YYYYMMDD-HHMMSS-XXXX`: date, time, 4-char hex. Immutable after creation. Shown on success screen and detail page.

---

## What's not built yet

- No authentication: reporter name is a plain text field [not required at the moment]
- No moderation dashboard or report flagging
- No map clustering for dense report areas
- No editing or deleting reports after submit
- No push notifications for new reports near a location

---

## Licence and contributing

DumpSpot is **not open source**. The code is public so you can read it, learn from it and help: issues and pull requests are very welcome. See [CONTRIBUTION.md](./CONTRIBUTION.md) and [LICENSE](./LICENSE).
Versions published before this change were MIT and stay MIT. The libraries, fonts, icons and data DumpSpot uses keep their own licences ([BUILD.md](./BUILD.md)).

