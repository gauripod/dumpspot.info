# DumpSpot

A civic reporting tool for public hazards. See garbage, sewage overflow, road encroachment, burning waste, debris — pin it on the map. No account, no login. A name, a location, a photo.

Built for India, works anywhere.

---

## What it does

Anyone can open DumpSpot and file a report in under a minute. Reports appear live on a shared map. Every pin is a real location with photos, coordinates, and a timestamp. The more reports, the more pressure on civic bodies to act.

No accounts. No bureaucracy. Just evidence.

---

## Features

**Map feed**

- Interactive map centered to your country on load — no permission asked, silent IP lookup
- Each report is a category pin (garbage, sewage, fire, debris etc) with a popup showing photo, location, reporter, timestamp
- Click any pin to open the full report
- Filter by state, area, or garbage category — map and list update simultaneously

**List feed**

- Chronological view: Today / Yesterday / This Week / older months
- Group headings alternate left and right
- Each row shows location, area, category chips, reporter name, local time
- Hover slides the row right with an underline crawl on the title

**Report form**

- Search location via autocomplete (OpenStreetMap Nominatim, no key required)
- After picking a location, a draggable pin map appears — drag or tap to exact spot
- DigiPin code shown live as pin moves (India only)
- Plus Code shown live as pin moves (global)
- Reverse geocode confirmation updates the location field as pin moves
- 9 garbage category cards, type of site tags, severity tags
- Notes field
- Upload up to 6 photos — compressed to WebP 1280px 82% quality in browser before upload
- State and area fields validated on blur — warns if you enter a city as a state or vice versa

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

## Pages

| Page   | Route                      | What it is                             |
| ------ | -------------------------- | -------------------------------------- |
| Feed   | default                    | Map + list toggle, filters, live count |
| Report | + Report tab               | Form to file a new report              |
| Detail | opens from pin or list row | Full report view with mini-map         |

---

## How it's built

No framework. No build step. Three files that run directly in a browser.

- `index.html` — all markup, page structure, script imports
- `style.css` — all styles, design tokens, layout, components
- `app.js` — all logic: map, list, form, upload, submit, spam checks, location encoding
- `config.js` — inspect lock only, gitignored, never pushed
- `build.js` — checks the environment exists, then writes the lock flag
- `netlify.toml` — build command and the tile/database proxy
- `netlify/edge-functions/proxy.js` — reads the keys on the server and never sends them to the browser
- `favicon.svg` — fairy with a trash bag

Everything loads from CDN. No npm, no bundler, no local install required.

---

## Running locally

```bash
python3 -m http.server 8080
# or
npx serve .
```

Open `http://localhost:8080` with `netlify dev` so the tile and database proxy can read `DB_URL`, `DB_KEY`, and `CARTER_KEYS`. Those values are never written into the site.

---

## Deploying

1. Push `index.html`, `style.css`, `app.js`, `build.js`, `netlify.toml`, `favicon.svg` to GitHub
2. Connect repo to Netlify
3. Set environment variables in Netlify → Site settings → Environment variables:
   - `DB_URL` — your database project URL
   - `DB_KEY` — your publishable API key, not a secret key
   - `CARTER_KEYS` — your CARTO basemap key
   - `LOCK_INSPECT_ENV` — `true` (disables devtools on production)
4. Deploy — Netlify runs `node build.js`. The build only checks that the variables exist. An edge proxy reads `CARTER_KEYS` and `DB_KEY` when a request comes in, so neither value is published in the site.

---

## Report ID

Every report gets `DS-YYYYMMDD-HHMMSS-XXXX` — date, time, 4-char hex. Immutable after creation. Shown on success screen and detail page.

---

## What's not built yet

- No authentication — reporter name is a plain text field [not required at the moment]
- No moderation dashboard or report flagging
- No map clustering for dense report areas
- No editing or deleting reports after submit
- No push notifications for new reports near a location
