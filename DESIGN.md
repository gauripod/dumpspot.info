# DumpSpot design and brand system

Version 6, "Field notes". Palette, type and identity approved. This document is the source of truth: if a value isn't defined here, it doesn't exist. `styles/tokens.css` is this document in code, `styles/app.css` only consumes tokens, and `#/system` in the app renders all of it live.

---

## 1. What DumpSpot should feel like

A naturalist's field journal laid over a city survey. Calm like a botanical notebook, exact like an architect's drawing, and as smooth to read as the best data journalism. It gets loud in only two places: the problem (clay) and the one thing we ask you to do (the pink Report button).

Three ideas carry the brand:

- **Paper:** the record. Field paper, forest ink, quiet structure.
- **Clay:** what's going wrong. Complaints, hazards, the earth disturbed.
- **Moss:** what grows back. Reports, trees, the people who file them.

What the best current sites taught us (see BUILD.md for the research notes): a slow, calm pace with one idea per screen; detail kept one layer deeper so the surface stays clean; smooth scrolling and page transitions; real material and place rather than decoration.

## 2. What we took from the references (`inspo/`)

| Ref | Lesson | Where it shows up |
| --- | --- | --- |
| `img1` grey plan, lime marks | The base is monochrome. One colour marks what matters. Asterisks mark points. | Grey map, asterisk markers, the logo |
| `img2` aerial, yellow tags | Labels belong *on* the image, as small flat tags joined by thin lines. | Map annotations, tags |
| `img3` blue ink city | One ink can carry a whole picture. | Severity uses one hue family, not a rainbow |
| `img4` flood map | Map furniture: a light title, a plain legend with square swatches, a north arrow. Only two text sizes. | Figure captions, legends, the small type scale |
| `img5` pink collage | A dot, a hairline and a caps label point at the evidence. Repetition along an edge gives rhythm. | Annotation pattern, report detail |
| [designengineer.world](https://designengineer.world) | One continuous stage: the globe is the site. A stamp logo, a two-line tagline, one pill of live counts, and nothing else. Click a cluster and the camera dives in. | The landing globe, the stamp, the count pill, click-to-dive |

What all five share: **the image fills the frame, text is small and sparse, nothing floats, nothing glows.**

## 3. Identity

DumpSpot's identity is three objects and one line. Each has a job; none is used for another's.

**Tagline:** *Field notes for the street you live on.*

### The stamp (primary identity)

A circular herbarium seal: Spot inside a double ring, with *DUMPSPOT · SPOT FINDS THE SPOT · EVERY REPORT EARNS A TREE ·* set around it in B612 Mono. Botanists stamp every pressed specimen; architects stamp every drawing's title block. The stamp says *this has been recorded*, which is what DumpSpot does.

- Used only for big moments: the landing page (turning slowly, one revolution a minute), How DumpSpot works, and the report confirmation.
- **Stamping is the brand action.** When a report is filed, a stamp presses onto the confirmation with its own ring: *RECORDED · CITY · TREE NO. 0123 · DATE ·*. The ring text is the only part that ever changes.
- Ink on paper only. Minimum 64px. Never on a photo, never recoloured, never more than one stamp on screen.
- Component: `stamp()` in `js/ui/brand.js`.

### The mark (everyday identity)

**Spot, the street dog who finds dump spots.** Every street has a dog that knows every corner of it. Spot is ours: paper fur, an ink line, one moss ear, a clay patch over one eye (the spot) and a clay tongue.

- Drawing: OpenMoji's "dog face" (U+1F436), by the OpenMoji project, licensed CC BY-SA 4.0, recoloured into the Field notes palette. The moss ear and the clay patch are our additions; the eyes were redrawn as circles so they can move. This adaptation is shared under the same licence. Credited in BUILD.md and on the Open source page.
- Used in the top bar, the browser tab (`favicon.svg`, heavier line so it holds at 16px) and at the centre of the stamp.
- Motion: Spot pops up on load, tilts its head on hover, and its eyes follow the cursor wherever Spot is on screen. Reduced motion turns all of it off.
- Never recolour, flip, or put Spot on a photo.

### Spot, standing (states)

The same OpenMoji family's standing "dog" (U+1F415), recoloured: paper fur, a clay spot on the flank, a moss collar with a pollen tag. Spot stands in for every waiting or empty moment, so the product never shows a bare spinner or a grey box:

- **Loading:** "Spot is sniffing out the reports." Spot's head bobs and three scent dots pulse ahead of the nose.
- **Empty:** "Spot looked everywhere." Spot stands still.
- **Offline:** Spot stands still beside the plain explanation.
- Toasts carry Spot's face instead of a coloured square. Errors keep the clay square: Spot is never shown next to bad news it didn't cause.

### Specimens (generative, p5.js)

Every report is also drawn as a pressed plant on a herbarium sheet, generated from its own data. Nothing is decorative; each mark encodes a field, and a key under the drawing says which:

| Mark | Encodes |
|---|---|
| Stems | Categories (up to 3). Each category has its own leaf shape: ovate, lanceolate, round or pinnate. |
| Leaves per stem | Tags on the report (site type plus severity tags) |
| Height | Time on the record: a report filed today is a sprout |
| Lean | Hour it was filed: morning leans east, evening west |
| Seed heads (pollen) | Photos, up to 3 |
| Clay stains in the soil | Severity steps |

The seed is the report id, so the same report always grows the same plant. Specimens grow in over 1.8s when scrolled into view and sway while the pointer is over them; otherwise they are still (`noLoop`) and cost nothing. Used in the report drawer, the report confirmation ("Your report, pressed as a specimen"), the specimen drawer on How DumpSpot works (latest six real reports), and the style guide (three made-up examples, labelled). Component: `js/ui/specimen.js`.

### The title block

Every page ends in a title block, set like the one on an architectural drawing: Spot and the wordmark, then cells for Sheet (each page is a numbered sheet: 01 Explore, 02 Garden, 03 Report, 04 How it works, 05 Research study, 06 Design system, 07 Open source), City, On record, Drawn with, and Date. Mono labels, hairline cells, one structure line on top.

### Paper

The ground carries a faint fibre grain (SVG turbulence at 5% ink), so the site reads as a sheet rather than a screen. It is never stronger than that.

### The wordmark

"DumpSpot" in Gloock, sentence case, beside the mark. Never in capitals, never in another face.

### Who's who (the vision, in the identity)

- **Keepers**: anyone who reports. Points, levels and badges are theirs.
- **The gardener**: the person who plants the trees, usually the site's owner. Set the name in `js/data/site.js`.
- **The garden**: one tree for every report, the living proof of both.

## 4a. v8 "Cyanotype" (current, supersedes the colour table below where they differ)

**Why blue.** Green is what every eco and civic site uses (Global Forest Watch, Ecosia, most city-reporting apps), so it can't make DumpSpot recognisable. Cyanotype blue is the blue of blueprints (architecture) and of Anna Atkins' 1843 cyanotype prints of pressed plants (botany): both halves of the brand in one colour. Red-orange problems sit opposite it on the colour wheel, so hazards always stand out.

| Token | Hex | Use |
| --- | --- | --- |
| `--cyan` | `#2448D8` | **Brand.** Links, selection, focus, progress, Spot's ear, the specimen prints. Tint `--cyan-light` `#E8EDFF`. |
| `--ground` | `#EEF1F7` | The page: blueprint paper. Maps, cards, buttons and the bar are white on it. |
| `--moss` | `#1FA34A` | Growth only: trees, points, levels. |
| `--clay` | `#FF4A2E` | Problems. |
| `--pink` | `#FF2E88` | Report a spot, nothing else. |

**Less textbook.** Labels and buttons are sentence case in Hanken Grotesk (500), not uppercase typewriter. Mono stays for numbers and coordinates only. Controls are pill-shaped. Icons are Phosphor duotone, with the fill layer in brand blue.

**Specimens are cyanotypes.** White plant on blue, pollen seed heads, red-orange stains.

**The report form** asks one question at a time (photo, place, kind, severity, you), with a progress rail, keyboard Enter to continue, inline errors, and the report's own specimen growing live beside it as you answer.

**The garden** is a painted panorama (p5.js): trees on rolling hills in the order they were earned, oldest on the left; drag to walk through time. The sky follows the visitor's clock (dawn, day, dusk, night with fireflies) and can be switched. Spot wanders along the front. Hover a tree for its story.

**Globe to city.** The globe turns and descends on one eased curve; as it nears the ground the page fades in and the map carries the same motion on from zoom 4 down to the city, so it reads as one camera move.

**Repetition.** "Every report earns a tree" and the gardener line are said once per page at most. One pink button per screen.

## 4. Colour (v7 "Fresh garden")

Clean white ground, clear living colour. v5's muted paper and clay read as dull, so v7 keeps the same roles and brightens every value.

| Token | Hex | Use | Never |
| --- | --- | --- | --- |
| `--ink` | `#10231A` | Text, Spot's line, the rare strong line | Large fills |
| `--sheet` | `#FFFFFF` | Page ground, panels, inputs, the drawer | |
| `--paper` | `#F5F7F2` | Quiet panels, hover rows | Text |
| `--line` | `#E6E9E2` | Every border and divider | |
| `--stone` | `#6B7A70` | Secondary text, labels | Body text |
| `--moss` | `#1FA34A` | **Brand.** Links, selection, primary controls, trees, points. Tint `--moss-light` `#E3F5E6` for selected states | Complaints |
| `--clay` | `#FF4A2E` | The problem: complaints, hazards, the kicker | Buttons |
| `--sky` | `#3FA9F5` | Water, rain, air | Text |
| `--pollen` | `#FFD23F` | Highlighter stroke (`--mark` `#FFE58A`), seed heads | Text colour |
| `--pink` | `#FF2E88` | **Report a spot**, and nothing else | Anything else |

**Severity** runs from neutral to deep red: `#E6E9E2` untagged, `#FFD9CC` minor, `#FF9473` moderate, `#FF4A2E` severe, `#B3200C` blocking road.

**Clean rules:** borders are 1px `--line`, never black. Things you touch have 6px corners; things that float (menu, toasts, drawer) have 10px corners and one soft shadow. Selected states use the moss tint, not black. The footer is one quiet line. Offline is a small pill. Detail (like the specimen key) folds away until asked for.

**Ratio:** about 85% white, 10% ink and moss, 5% accents. Pink appears once per screen at most.

## 5. Type

Three faces, one job each. All free (SIL OFL).

- **Gloock** (headlines, titles, wordmark). A high-contrast serif with the sharpness of a botanical engraving. Sentence case, one weight.
- **Hanken Grotesk** (everything you read). A calm, open grotesk that stays out of the way.
- **B612 Mono** (labels, numbers, coordinates). Drawn by Airbus for cockpit instruments: the field-instrument voice.

**There are exactly five sizes.** Every piece of text on the site is one of these roles.

| Role | Face | Size / line | Use |
| --- | --- | --- | --- |
| Display | Gloock 400 | 52 / 56 (mobile 36 / 40) | One per page: the page headline |
| Title | Gloock 400 | 28 / 34 (mobile 24 / 30) | Section headings, drawer title |
| Body | Hanken Grotesk 400 | 15 / 24 | Reading text, list items, inputs |
| Small | Hanken Grotesk 400 | 13 / 20 | Captions, notes, secondary lines |
| Label | B612 Mono 400, uppercase, +0.06em | 11 / 16 | Labels, tabs, buttons, tags, legends, units |

Rules:

- **One Display per page.** Sections get Title. Nothing else is bigger than Body.
- Figures (counts, points) use B612 Mono at Title size.
- Gloock never sets anything smaller than Title; Hanken never sets a headline.
- Text width: 680px (`--measure`) for anything longer than one line.

## 6. Space and grid

Base unit 4px. Only these steps exist:

| Token | px | Use |
| --- | --- | --- |
| `--sp-1` | 4 | Inside a label or tag |
| `--sp-2` | 8 | Between a label and its value, icon and text |
| `--sp-3` | 12 | Inside small components, list row padding |
| `--sp-4` | 16 | Panel padding, gaps between controls |
| `--sp-5` | 24 | Page gutter, between components |
| `--sp-6` | 32 | Between groups |
| `--sp-7` | 48 | Between sections |
| `--sp-8` | 64 | Page top and bottom |

Grid: content max width 1200px (`--page`), reading column 680px (`--measure`), gutter 24px (16px on phones). The top bar is 52px.

## 7. Lines and surfaces

- **Structure line:** 1px ink. Panels, section dividers, figures, inputs on focus.
- **Hairline:** 1px `--line` (`#C4C2B9`). Rows inside lists and tables.
- No other border widths. No radius anywhere. No shadows, blur, gradients or coloured side stripes. The single exception is the glossy Report a spot button.
- Highlight = a lichen band behind text (`--mark`), never a coloured box.

## 8. Components

| Component | Spec |
| --- | --- |
| **Report a spot** | The one glossy object on the site, like a sticker on a blueprint (img5): a pink gradient with a light top edge, an inset shadow, and a sheen that sweeps across on hover. Label type, 36px tall. Used only for reporting. |
| **Primary button** | Moss fill, white text, Label type, 36px tall, 16px side padding. Hover: darker moss. |
| **Secondary button** | Transparent, 1px ink border, ink text, same size. Hover: lichen fill. |
| **Text link** | Moss, underlined 1px, 3px offset. |
| **Segmented control** | 1px ink frame, Label type, 30px tall. Selected: ink fill, lichen text. |
| **Panel** | Sheet, 1px ink border, 16px padding. Heading in Label type. |
| **Tag** (`img2`) | Lichen fill, ink Label type, 4px by 6px padding. |
| **Annotation** (`img2`, `img5`) | 1px ink hairline up from the point, a tag at its end with Small type and a Title-weight place name. |
| **Legend** (`img4`) | Label heading, square 10px swatches, Small type entries. |
| **List row** | Body title, Small meta below, 12px vertical padding, hairline between rows. No coloured bars, no icons. |
| **Stat** | Label above, Title-size mono figure below. |
| **Field** | Sheet fill, 1px graphite border, 40px tall, Body type. Focus: ink border. |
| **Note** | Slab panel with a 10px rust square before the text. |

## 9. Interaction and motion

The site behaves like a data story you can touch. Four rules:

1. **Reading drives the map.** On Explore the map is pinned while you scroll. Each section is a step, and the step that crosses the middle of the screen tells the map what to show. You never have to find the right control to see what the text is talking about.

   | Step | The map shows | Legend says |
   | --- | --- | --- |
   | 01 The city | Clusters by severity, with up to three annotated hotspots | Worst problem reported |
   | 02 What | Every report; the most reported kind in rust, the rest faded | Showing: that kind / everything else |
   | 03 When | Every report; the last seven days in rust | Showing: last 7 days / earlier |
   | 04 Where | Flies to the place reported most, with 250 m, 500 m and 1 km rings | Worst problem reported |
   | 05 Context | Whatever open data layers you turn on | Each layer's own legend |

2. **Hover previews, click commits.** Hovering a bar shows that category on the map and lets go when you leave. Clicking keeps it as a filter, everywhere. Hovering a place draws its distance rings; clicking flies there. Keyboard focus does exactly what hover does.
3. **Everything on the map answers back.** A circle shows its count on hover and zooms in on click. An annotation is a button that takes you to its hotspot. An asterisk opens its report. The corner readout shows the coordinates and DigiPin under the cursor, like a surveyor's instrument.
4. **The legend always matches the map.** If the map changes what it shows, the legend changes in the same frame.

Motion only explains a change, and it has three speeds: 140ms for hover feedback, 260ms for panels, page cross-fades and the selected-tab bar, and the map's own flights (about 1.2s). Scrolling is smoothed with Lenis; pages cross-fade with the browser's View Transitions. On first load the city frame inks in, then the circles, like a plotter drawing. The headline, dek and meta rise in 120ms apart. No counting numbers, no bouncing, no pulsing, no parallax. `prefers-reduced-motion` turns all of it off.


### Smoothness rules (v7)

- Entrances use `--ease-out` (cubic-bezier(0.16, 1, 0.3, 1)), 560ms. Exits are faster (220ms) than entrances.
- Page changes: the bar holds still (its own view-transition name) while the page fades out and the new one rises 10px into place.
- Sections rise 14px into place once, as they scroll into view, staggered 70ms. Not on the map or garden, which have their own choreography.
- The report drawer slides on `--sheet-ease` (cubic-bezier(0.32, 0.72, 0, 1)); the page behind blurs by 2px.
- Pressable things give way to 97% on press using the `scale` property, so it never fights a transform.
- Every hover changes colour over `--fast`; nothing snaps.
- Reduced motion turns all of this off.

## 10. Writing

- Plain sentences, numbers first: "84 spots reported in Bengaluru."
- No em dashes, no exclamation marks, no "please", no "successfully".
- **Trees:** every report *earns* a tree; the gardener plants it wherever there's room for it to grow. Never say the tree is planted where you reported, never name the species, and never call reporters gardeners. Reporters are keepers.
- Buttons are verbs: "Report a spot", "Show every city".

## 11. Pages

| Page | Shape |
| --- | --- |
| **Explore** | A data story: kicker, Display headline written from the data, dek, a full-width map figure with caption and legend, then three short sections (what, when, where), then the reason to report. |
| **All reports** | Display count, search, rows grouped by day. |
| **Garden** | The trees fill the screen. One Body line underneath. The register and Gardeners open on request. |
| **Report a spot** | Four numbered steps in the reading column. A small panel shows what the report adds. |
| **Research study** | Its own demo data, clearly labelled. |
