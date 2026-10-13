# DumpSpot — Developer Reference

---

## Tech stack

| Layer               | Tool                                  | Notes                                                        |
| ------------------- | ------------------------------------- | ------------------------------------------------------------ |
| Markup              | HTML5                                 | Single file, no templating                                   |
| Styles              | CSS3                                  | Custom properties, grid, no preprocessor                     |
| Logic               | Vanilla JS (ES2020+)                  | Async/await, modules via script tags                         |
| Maps                | Leaflet.js 1.9.4                      | Markers, popups, tile layers, draggable pins                 |
| Map tiles           | CartoDB Voyager                       | English labels, neutral grey. Dark tiles for detail mini-map |
| Location search     | Nominatim (OSM)                       | Free, no key, returns address + coordinates                  |
| IP geolocation      | ipapi.co → geojs.io                   | Silent fallback chain, no prompt                             |
| Location encoding   | DigiPin (India) + Plus Codes (global) | Both implemented in plain JS, no libraries                   |
| Face detection      | face-api.js 0.22.2                    | TinyFaceDetector model, loaded from author's GitHub Pages    |
| Toast notifications | Toastify.js                           | CDN                                                          |
| Fonts               | Google Fonts CDN                      | Playfair Display, Space Mono, DM Sans                        |
| Backend             | Postgres + object storage             | Hosted database + S3-compatible file storage                 |
| Hosting             | Netlify                               | Static deploy, env vars, build command                       |

---

## File structure

```
index.html       Page shell — nav, all page divs, script/link imports
style.css        All styles — tokens, nav, feed, list, form, detail, components
app.js           All logic — see breakdown below
config.js        LOCK_INSPECT_ENV only — generated, gitignored. Keys stay in the host environment.
build.js         Checks the environment, writes only the lock flag
netlify.toml     Build command and proxy routes
netlify/edge-functions/proxy.js  Server proxy for map tiles and the database
favicon.svg      SVG icon
.gitignore       Excludes config.js
```

---

## app.js — what's in it

| Section                   | What it does                                                                  |
| ------------------------- | ----------------------------------------------------------------------------- |
| Inspect lock              | Disables F12/Ctrl+U/right-click if `LOCK_INSPECT_ENV = true`                  |
| `getDb()`                 | Lazy DB client — talks to the same-origin proxy, which holds the key          |
| `maybeShowWelcome()`      | Session-scoped welcome toast, one per browser session                         |
| `toast()`                 | Wrapper for Toastify — green (info) or red (error)                            |
| `ICONS`                   | SVG strings for all 8 garbage category icons + photo placeholder              |
| `CATS`                    | Category definitions — key, icon name, display label                          |
| `genId()`                 | Generates `DS-YYYYMMDD-HHMMSS-XXXX`                                           |
| `fmtTs()`                 | Formats ISO timestamp — viewer's local timezone, IST in brackets if non-India |
| `normLocation()`          | Title-cases location strings — `bengaluru` → `Bengaluru`                      |
| `looksLikeAbbr()`         | Detects all-caps ≤4 char strings like `GGN`, `MH`                             |
| `goPage()`                | SPA page switching — shows/hides `.pg` divs, updates nav tabs                 |
| `fetchReports()`          | Fetches all reports + photos from DB, populates `reports` array               |
| `initMap()`               | Creates Leaflet map, loads tiles, calls `fetchReports()` + `locateUser()`     |
| `locateUser()`            | Silent IP geolocation — tries ipapi.co (prod only), falls back to geojs.io    |
| `renderMarkers()`         | Clears and redraws all map pins from filtered data                            |
| `buildPopHTML()`          | Builds popup HTML for a report marker                                         |
| `sevClass()`              | Maps severity array to CSS class name                                         |
| `groupByTime()`           | Splits reports into Today / Yesterday / This Week / older buckets             |
| `renderLCard()`           | Renders a single list row card                                                |
| `renderGroup()`           | Renders a time-group heading + its cards                                      |
| `renderWall()`            | Renders the full chronological list                                           |
| `buildStateFilter()`      | Populates state dropdown from live data                                       |
| `buildCatFilter()`        | Populates category dropdown + report form category cards                      |
| `applyFilters()`          | Filters reports by state/area/category, updates map + list + count            |
| `setView()`               | Toggles between map and list view                                             |
| `sizeViews()`             | Sets map and list height to fill viewport below toolbar                       |
| `renderDetail()`          | Populates detail page with report data + mini Leaflet map                     |
| `onLocInput()`            | Debounced location search trigger                                             |
| `searchLoc()`             | Nominatim search, populates autocomplete dropdown                             |
| `pickLoc()`               | Stores selected coordinates, shows draggable pin map                          |
| `validateLocationField()` | On-blur Nominatim check — warns if city entered as state or vice versa        |
| `encodeDigipin()`         | Pure JS DigiPin encoder — India bounding box only                             |
| `encodePlusCode()`        | Pure JS Plus Code (OLC) encoder — works globally                              |
| `getLocationCode()`       | Returns `{ digipin, pluscode }` for any coordinates                           |
| `initPinMap()`            | Creates draggable confirmation pin map below location field                   |
| `updatePinInfo()`         | Updates DigiPin + Plus Code display, triggers reverse geocode                 |
| `reverseGeocode()`        | Nominatim reverse lookup, updates location text field + confirmation label    |
| `ABUSE`                   | Abuse word list — English, Hindi, Hinglish, leet-speak bypass variants        |
| `GIBBERISH_PATTERNS`      | Regex patterns for keyboard mashing, repeated chars, known sequences          |
| `containsAbuse()`         | Normalises string (leet-speak) then checks against ABUSE list                 |
| `isGibberish()`           | Checks string against GIBBERISH_PATTERNS + low unique-char heuristic          |
| `checkTextSpam()`         | Runs abuse + gibberish on all required fields + notes                         |
| `analyseImage()`          | Canvas-based image check — blank, low variance, illustration detection        |
| `loadFaceApi()`           | Loads face-api.js TinyFaceDetector model with 8s timeout                      |
| `checkFaceInImage()`      | Runs face detection on a single image file                                    |
| `checkAllImages()`        | Runs all image checks across all uploaded files                               |
| `flaggedImageIndices`     | Tracks which photos were warned — enables warn-then-remove flow               |
| `upFiles`                 | Array of compressed File objects ready for upload                             |
| `initUpload()`            | Sets up drag/drop + file input event listeners                                |
| `addFiles()`              | Compresses each file via canvas before adding to `upFiles`                    |
| `compressImage()`         | Canvas resize to max 1280px + WebP encode at 82% quality                      |
| `renderPreviews()`        | Renders photo preview grid with remove buttons                                |
| `submitReport()`          | Full submit flow — text spam → image check → geocode → upload → insert        |
| `resetForm()`             | Clears all form state ready for a new report                                  |

---

## Database

### Tables

**`reports`**

```
id          text PRIMARY KEY        DS-YYYYMMDD-HHMMSS-XXXX
reporter    text NOT NULL           reporter's name (plain text, no auth)
state       text NOT NULL           normalised via DB trigger
area        text NOT NULL           normalised via DB trigger
specific    text NOT NULL           street-level location, normalised
type        text[]                  site type tags (Road, Footpath, Market etc)
cats        text[]                  garbage categories (Plastic waste, Nala / Sewage etc)
sev         text[]                  severity (Minor, Moderate, Severe, Blocking road)
notes       text                    optional freeform description
lat         float8                  decimal degrees, WGS84
lng         float8                  decimal degrees, WGS84
digipin     text                    India only — DigiPin code (e.g. FCJ9-REL-EEB)
pluscode    text                    global — Plus Code (e.g. 7JVW52GR+WF)
ts          timestamptz             submission time, default now(), stored UTC
```

**`report_photos`**

```
id          uuid PRIMARY KEY        auto-generated
report_id   text → reports(id)      cascade delete — photos removed with report
url         text NOT NULL           public URL from object storage
position    int                     display order 1–6
```

### How tables relate

- One report → many photos (`report_photos.report_id` references `reports.id`)
- Delete a report → all its photos rows are deleted automatically (cascade)
- Photos are fetched in a single join query: `select *, report_photos(url, position)`
- Photos are sorted by `position` before display

### Location normalisation trigger

Runs on every insert and update — enforces title-case regardless of what the frontend sends:

```sql
create or replace function normalize_location()
returns trigger as $$
begin
  new.state    := initcap(trim(new.state));
  new.area     := initcap(trim(new.area));
  new.specific := initcap(trim(new.specific));
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_normalize_location on reports;
create trigger trg_normalize_location
before insert or update on reports
for each row execute function normalize_location();
```

One-time cleanup for existing rows:

```sql
update reports
set
  state    = initcap(trim(state)),
  area     = initcap(trim(area)),
  specific = initcap(trim(specific))
where
  state    is distinct from initcap(trim(state))
  or area  is distinct from initcap(trim(area))
  or specific is distinct from initcap(trim(specific));
```

Add new columns if not present:

```sql
alter table reports add column if not exists digipin  text;
alter table reports add column if not exists pluscode text;
```

### Row level security

Public read + insert. No update or delete from the browser:

```sql
alter table reports enable row level security;
alter table report_photos enable row level security;

create policy "public read reports"   on reports       for select using (true);
create policy "public insert reports" on reports       for insert with check (true);
create policy "public read photos"    on report_photos for select using (true);
create policy "public insert photos"  on report_photos for insert with check (true);
```

---

## Object storage — images

Bucket: `report-photos`, public read.

Storage policies:

```sql
create policy "public uploads" on storage.objects
  for insert with check (bucket_id = 'report-photos');

create policy "public reads" on storage.objects
  for select using (bucket_id = 'report-photos');
```

### Upload path structure

Each report gets its own folder: `{report_id}/{position}.webp`

Example:

```
report-photos/
  DS-20260322-143022-A3F1/
    1.webp
    2.webp
    3.webp
```

### Image compression

Before upload, every photo is processed in the browser:

1. Drawn onto an 80×80 canvas for analysis (spam checks)
2. If it passes, redrawn onto a canvas scaled to max 1280px on the longest side
3. Exported as WebP at 82% quality
4. Stored as a `File` object in `upFiles[]`
5. Uploaded to storage on submit

A 4MB phone photo typically becomes 150–300KB. No quality loss visible at report sizes.

---

## Location encoding

### DigiPin (India only)

- Covers bounding box: 2.5°N–38.5°N, 63.5°E–99.5°E
- Pure JS implementation, no library, no API
- 4×4 uniform grid subdivision at each of 8 levels
- Character set: `FCJ9RELEEBEMG8D7VT6KH5LNQP4SZ3Y2X1W0`
- Separators after positions 3 and 6: `FCJ9-REL-EEB`
- Returns `null` outside India bounding box

### Plus Codes (global)

- Open Location Code standard (Google open-source)
- Pure JS implementation, no library, no CDN
- Works for any lat/lng on Earth
- 10-character code: 8 chars + `+` + 5 chars
- Example: `7JVW52GR+WF` (Bengaluru)
- Character set: `23456789CFGHJMPQRVWX`

### What gets stored

India: both `digipin` and `pluscode` columns populated
Outside India: only `pluscode` populated, `digipin` is null

---

## index.html — structure

```
<nav>                    sticky top nav — logo, Feed tab, + Report tab
<div id="pg-feed">       feed page — toolbar + map-wrap + list-wrap
  <div class="toolbar">  filter dropdowns, map/list toggle, spot count
  <div id="map-wrap">    Leaflet map container
  <div id="list-wrap">   chronological list container
<div id="pg-detail">     detail page — back button, content, mini-map
<div id="pg-report">     report form — 3-col grid, photo upload, submit
```

Script load order (bottom of body):

```
leaflet.js → supabase-js → toastify → window._db alias → config.js →
open-location-code → face-api.js → app.js
```

---

## style.css — structure

```
:root                    design tokens — colours, nav height, font vars
*, body                  reset, base font, user-select
.pg, #pg-feed            page show/hide, feed flex layout
nav, .nlogo, .ntab       navbar — logo, tabs, active states
.toolbar, .fsel          filter bar, dropdowns
.vtog, .vbtn, .cnt       map/list toggle, spot count
#map-wrap, leaflet       map container, tile filter, popup, pin styles
#list-wrap, .clist       list wrapper, padding, max-width
.clist-group, .clist-heading   group container, heading sizes per tier
.lcard                   list row card — grid, hover slide + underline
#pg-detail               detail page padding, max-width
.det-*                   detail page components — photos, badge, labels, map
#pg-report               report page padding
.rp-*, .form-grid        report page header, 3-col grid, responsive breakpoints
.form-notes-row          notes row spanning cols 1+2
.fl-label, .fl-site etc  form labels with section-specific colours
input, textarea          field base styles, focus ring
.loc-search-wrap         location autocomplete container + dropdown
.tag, .ccard             site type tags, category cards — selected states
.uparea, .pgrid, .pitem  photo upload zone, preview grid, preview items
.sub-row, .sub-btn       submit row, submit button
.succ                    success screen
.toastify override       toast base style
```
