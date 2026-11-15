# Messages between Person A and Person B

Both of us work through Claude Code, so notes that need the other person's attention go here instead of chat. Newest first. Add an entry with the date, sender and the commits it refers to; mark an entry **Done** (or reply under it) when it has been handled.

Claude Code sessions: read this file after every `git pull`, together with `CLAUDE.md`.

---

## 2026-11-15 · A → B · scoring is now like-for-like (contract version 2): data regenerated, six things for you

**Open for you: items 1–6. Item 1 first: until `web/score.js` is updated, the live app scores with the old rule while the finds come from the new one.** You agreed to the change in chat; this entry records what was done and what is left. It also answers your three questions (end of entry).

**Why.** The one-sided rule scored every cell beyond Earth's p1 or p99 as a perfect match. The compare mode made that visible:
- Shackleton's slope is 15.2° and Earth goes up to 25.2°, yet every slope above 13.4° scored 100.
- Where Earth cannot match at all (Mars day–night range, lunar temperatures), Earth's most extreme 1% also scored 100.

**What changed (A's side, this commit).**
- `pipeline/score.py`: every feature is scored `exp(−((f − t)/σ)²)`. `directional()` is now only a label: `low` / `high` when the target is outside `[min, max]` in `meta.json`.
- `docs/contract.md` is version 2 (scoring rules 2–3 and the "beyond Earth" line); `meta.json` has `contract_version: 2`.
- Regenerated: `validation.json`, `candidates.geojson`, `tests/golden_scores.json`, `docs/figures/*`. `cells.bin`, `features.bin`, `targets.json` and `known_analogs.geojson` are unchanged.
- `docs/writeup.md`: new numbers, and the change is listed as item 5 under "Choices, and when they were made", with the old and new results side by side. I also changed two sentences in your Summary (54 candidates; the "Does it work?" numbers). Please check the wording.
- `CLAUDE.md` and `README.md` record the decision. All five pipeline checks pass.

**What it did to the results.**

| | Old: known vs barren, p | New: known vs barren, p |
|---|---|---|
| Mars, best of 4 | 0.89 vs 0.76, 0.024 | 0.90 vs 0.72, 0.005 |
| Moon, best of 2 | 0.70 vs 0.57, 0.210 | 0.66 vs 0.44, 0.070 |
| Jezero | 0.87 vs 0.56, 0.002 | 0.87 vs 0.49, 0.0004 |
| Arcadia | 0.89 vs 0.79, 0.063 | 0.89 vs 0.76, 0.031 |
| Gale | 0.86 vs 0.77, 0.097 | 0.86 vs 0.74, 0.052 |
| Utopia | 0.87 vs 0.79, 0.080 | 0.81 vs 0.77, 0.240 (worse) |
| Marius Hills | 0.73 vs 0.60, 0.199 | 0.68 vs 0.45, 0.055 |
| Shackleton | 0.67 vs 0.57, 0.194 | 0.61 vs 0.65, 0.822 (worse) |

- **Finds: 54 (was 55).** 30 are the same cell, 5 moved by less than 150 km, and 19 are new places. 25 old ids are gone.
- **The pitch finds hold.** Jezero #1 is the same Makran cell (72) and its top 3 are unchanged. Gale #1 is the same Hormozgan cell (71 → 68), still about 355 km from Doha.
- **New #1s:** Arcadia #1 is now 25.62 N 60.12 E (Makran; the old #1 is #2). Marius Hills #1 is now 21.38 S 14.12 E (Damaraland; the old #1 in Iran is #6).
- **Scores drop a little:** Gale 71 → 68, Utopia 72 → 70, Arcadia 74 → 72, Shackleton 64 → 62, Marius Hills 77 → 69 (each site's #1 find).
- **Temperature is now 0.00 at almost every top find.** They are warm deserts and match on terrain, albedo, dust, geology, bare ground and no snow, not on temperature. "Where it breaks down" will now name temperature for them, which is correct.

**For you:**

1. **`web/score.js`, two small changes** (I did not touch your file):
   - `directional(feature, t)`: return `t < feature.min ? "low" : t > feature.max ? "high" : null`.
   - `featureScore(p, f)`: always `const q = (f - p.t) / p.sigma; return Math.exp(-q * q);` (the `p.d` branches go; `p1` / `p99` are no longer needed in the plan).
   - Then run the golden check against the new `tests/golden_scores.json`. Expect 306/306.
2. **Texts in `web/app.js` that describe the old rule:**
   - The compare notes ("Earth never gets as cold as …, so this shows Earth's coldest places"; "… shows Earth's most extreme places"). New meaning: "No place on Earth reaches …'s value, so every place scores low on this."
   - The tie note "(many places on Earth reach the closest possible value to …)". Ties at 100 now only happen for real matches (no snow, no plants).
   - "Does it work?": "The evidence is **modest**: about 1 in N …" now reads 1 in about 200 for Mars. The caveats still apply (it is not corrected for testing several targets; Utopia alone is not significant; no claim for the Moon), so the wording needs your eye. The tour's "Modest evidence, and we say so" too.
3. **Literature check for the new finds.** 17 of the 54 fall outside the boxes in `web/regions.js` and show as "not checked yet" (it was 3):
   - Jezero: 18.12 N 37.12 E (#7), 34.38 N 114.38 W (#10)
   - Gale: 22.12 N 19.38 E (#7), 29.62 N 8.62 W (#8)
   - Utopia: 29.12 N 48.12 E (#2), 10.88 N 10.62 E (#6), 28.12 S 134.38 E (#7)
   - Arcadia: 36.12 N 60.38 E (#3), 34.88 N 5.88 E (#6)
   - Shackleton: 42.62 N 88.12 E (#3), 43.88 N 93.88 E (#6), 17.62 N 37.88 E (#8)
   - Marius Hills: 2.88 N 36.38 E (#2), 25.38 N 39.12 E (#3), 46.62 S 69.88 W (#9), 40.62 S 68.38 W (#10), 28.62 N 114.12 W (#12)

   Five of these are in a top 3: Utopia #2, Arcadia #3, Shackleton #3, and Marius Hills #2 and #3. Some probably only need a wider box (e.g. Gale #8 sits just outside "Moroccan Sahara and Anti-Atlas").
4. **Tour and pitch:** the two captions in `web/tour.js` (Makran for Jezero #1, southern Iran salt domes for Gale #1) are still right. Slides that quote 55 finds, 89 vs 76, or any score need the new numbers.
5. **`docs/literature-check.md` and the deep dive:** check that they don't name a find that left the list. The Makran–Chagai belt is still the first-ranked find for Jezero, Gale, Utopia and Arcadia.
6. **Retake screenshots** that show scores or the find list.

**Answers to your three questions:**
1. **Live top 5:** fine to show, with the "Top 5 … on dust" label and not "finds".
2. **Tie-break by the full score:** sound. I reproduced your Gale-on-dust list exactly with the pipeline (old rule). With the new rule most ties disappear; the rule is still right for the real ones.
3. **Find outlines:** option (b), but as a list of cells per find, not polygons. Your option (a) would not match the pipeline: it splits regions at peaks whose pieces are later dropped, so the kept finds would absorb those cells. Not started; Yosif and you still have to decide whether to do it before the pitch.

---

## 2026-11-15 · B → A · Yosif's list built (items 1–8); two questions on compare mode, one idea

**Open for you: questions 1–3 below. Everything else is FYI.** Changes are in `web/` only. No change to `web/data/`, `score.js` or the contract. The golden check is still 306/306, the tour runs start to finish with `?tour=1`, and Gale #1 and the Makran finds show as cyan finds.

**Built** (answers the entry below):
1. **"Compare only…"**: 8 property chips under the site cards. Ticked = weight 1, unticked = 0.
   - The glow and a **live top 5** (list and cyan dots on the globe) switch to the ticked properties.
   - One-sided notes ("Earth never gets as cold as Gale…") come from your p1–p99 rule. A rainfall note mentions Antarctica.
   - The panel's big number stays the **full 8-property score**. The compare score is its own line ("100/100 on dust only"), because one-sided properties give 100 to Earth's whole extreme 1%.
   - A slider move, Reset or the tour turns compare mode off.
2. The glow is red → white-hot. The accent colour stays copper.
3. **Two dot kinds:**
   - our finds: filled cyan dots that pulse
   - known sites: hollow light rings with a dark outline, current body only

   The verdict wording stays in the panel badge.
4. "by Team Sol" under the title.
5. The country search is removed (`web/places.js` is kept for later).
6. **Country + coordinates** under the place name on click. Countries come from Natural Earth 1:110m via `world-atlas@2.0.2` (CDN), checked in the browser. Coastal cells look up to 0.5° around.
7. The floating map key is replaced by a small ramp line in the panel (the two scores, the two dot kinds, the "What does the glow mean?" fold-out).
8. The welcome pop-up is removed.

Phone pass: the `polygonOffset` fix is on `glowMat` (not yet tested on an iPhone). The bottom-sheet layout is still to do.

**Questions for you (science):**
1. **Live top 5 ranking.** It's simpler than `candidates.py`: it ranks cells by the compare score (ice sheets skipped for Mars) and greedily keeps cells at least 200 km apart. There's no region grouping, area or robustness, so the panel calls them "Top 5 … on dust", not finds. Is that OK to show?
2. **Tie-break.** One-sided properties make many cells tie at 100. I order ties by the score shown (whole points), then by the full 8-property score with the site's default weights. Example: Gale on dust → Oman, India, India, Nigeria, Nigeria (all 100; 57, 49, 48, 48, 48 on all 8). Is that a sound rule, or would you prefer another?
3. **Idea: outline each find as a region instead of a dot.** `candidates.py` already builds the regions, but `candidates.geojson` only keeps the best cell. Two ways:
   - **(a) Rebuild in the browser, our side only.** Take the top-1% mask (no ice sheets for Mars), join 8-connected cells from each candidate's best cell, give each cell to its nearest candidate, and trace the outline. The app would check each region's area against your `area_km2`.
   - **(b) You export the polygons**, e.g. in a `regions.geojson`. That's a contract change during the freeze.

   B hasn't decided yet. Which would you prefer, and does (a) match your split closely enough?

---

## 2026-11-15 · A → B · Yosif's feedback after your UI pass, and a phone pass before the pitch

**Built by B, 2026-11-15** (items 1–8; see the B → A entry above). The phone pass is still open.

**Open for you: your call on each item.** These are Yosif's own ideas from using the live app. Claude added notes on how each one fits what's already built. None of them touches `web/data/` or the contract, and item 1 doesn't need a change to `score.js` either.

Yosif likes the six site cards (Jezero etc.) as buttons.

1. **"Compare only…" mode under the site cards.** Today every place gets one overall score from all 8 dimensions together. This mode would let you tick one or more of the 8 dimensions (e.g. only Dust, or Dust + Temperature). The glow and a **top 5 list** then show which places on Earth are most like the site on just those. The point is that you can see how your chosen metric picks out the most relevant places. It also serves researchers who need a site that matches specific properties.
   - The scoring already supports it. A weight of 0 drops a dimension from the weighted mean, so ticked = 1 and unticked = 0 is just another setting of the existing sliders. The difference is that the control sits up front instead of being hidden in "Map options".
   - The top 5 needs a live ranking over all cells, because the current "Top finds" uses the precomputed candidates. The list should keep places at least ~200 km apart, as the candidates do, or it will show five cells of the same desert.
   - One-sided features: label them, e.g. "Earth never gets as cold as Mars nights, so this shows Earth's coldest places".
   - Rainfall alone goes 100% to Antarctica, because IMERG reads 0 there (known caveat). A short note on that dimension would help.
   - Good demos, from Claude's quick check of where the top 1% goes: **Temperature** (Mars sites → Greenland ice sheet, Shackleton → Antarctica, Marius Hills → Tibet and the Sahara), **Terrain** (Gale and Shackleton → Tibet and the Andes, flat Utopia → flat plains), **Dust** (Mars sites → Sahara and Arabia). These are rough lat/lon boxes, so they're fine for choosing demos but not for quoting.
   - This takes the "one-dimension view" in `docs/presentation-plan.md` (accepted, not built yet) and extends it to several dimensions. It isn't a weight preset, because the user picks the dimensions.
2. **Glow in red instead of copper.** This means the similarity glow on the globe (the ramp from the site's top 20% to its top 1%), not the accent colour of the buttons and headings. Yosif would like it red rather than the current copper/orange.
3. **Two kinds of dot instead of five colours.** Today the globe has green (new find), yellow (little studied), blue (not checked yet), grey (known area our search found too), and rust / grey-blue for the known Mars / Moon sites. Yosif would like just two groups, matching the story: known sites are the test, our finds are the discoveries. They differ in colour, shape and size, so they work on the red glow, on a projector, on a phone and for colour-blind viewers:
   - **Our finds** (new, little studied, not checked yet): **filled bright cyan** dots, a bit larger, keeping the pulse they have now. Cyan stands out against the whole red → white-hot glow and the night side. Green on a red glow is the classic red–green colour-blindness pair.
   - **Known sites** (the known Mars and Moon sites, and "known area our search found too"): **small hollow white rings with a dark outline**, or small light-grey dots with a dark outline if rings are fiddly. Plain white would vanish on the white-hot glow, and known sites score high, so they sit exactly there.
   - Optional: show only the known sites for the current body (Mars sites when a Mars site is picked). That removes the Mars/Moon colour split and cuts clutter.
   - globe.gl draws points as small cylinders with no outline. An outline or ring needs a small workaround, e.g. a slightly larger dark point underneath, or the rings/HTML layer.
   - Keep the finer verdict ("No analog study found yet" vs "little studied") in the result panel text. The pitch relies on the careful wording, even if the dot no longer shows it.
4. **"by Team Sol"** under the "Analog Atlas" title.
5. **Remove the country search** ("How Mars-like is your place?"). Yosif has decided on this; it may come back later. Nothing in the tour depends on it. The Qatar line (55/100) is now optional, to be mentioned in the pitch only if we want to, and Qatar can still be clicked on the globe.
6. **Simple location info on click.** Clicking any place should show its coordinates and its present-day country up front, not only under "More details".
   - Coordinates: `fmtLatLon` already exists, so this just means moving it under the heading.
   - Country: there's no lookup for arbitrary clicks today. The boxes in `places.js` overlap and cover only a few countries. One option is a small public-domain country-outline file (Natural Earth 1:110m, about 100 KB as TopoJSON from a CDN) with a point-in-polygon check in the browser, so no geocoding service is needed. Borders are de facto and approximate. Antarctica and the ocean get no country.
7. **Remove the floating map key**, the "Glows where Earth is like …" box over the globe. Yosif likes the glow itself but not the floating box. Replace it with **one small line in the side panel**: a thin red ramp with the two scores, and the two dot kinds from item 3. The "What does the glow mean?" text can stay behind a small fold-out there.
8. **Remove the first-visit welcome pop-up** ("▶ Watch the 50-second tour / Explore myself"). It feels like a pop-up ad. The Tour button in the header stays. (Claude had suggested the welcome in its earlier list; Yosif has overruled that.)

Panel layout (items 9–11). Do these before the phone pass, because they decide what the phone layout is:

9. **Show the result near the top when a place is clicked.** Today the result comes third, below the six tall site cards and the "Top finds" list, so on a phone it lands below the fold. Yosif's options were to move the result to the top, or to collapse the site cards into a single row once a site is picked. Claude recommends the collapse: moving the result above the site picker makes the panel jump around. Order when a place is clicked: site row, result, then "Top finds" and the compare mode (item 1). On phones this is the same swipeable chip row as in the phone pass below.
10. **Compact site cards:** name only, with short names, and the mission line only on the selected card.
    - Short names, e.g. Jezero, Gale, Utopia, Arcadia, "Shackleton (south pole)", Marius Hills. `shortName` currently cuts at the bracket, which leaves long names like "Shackleton-de Gerlache ridge".
    - Keep the small "Mars" / "Moon" row labels, so the body stays clear without the longer text.
    - The "N new finds" count can move from every card to the selected card's line or the "Top finds" heading.
11. **Sentence case for headings**, keeping caps only for the "Analog Atlas" title. Today `.sec-title` uses `text-transform: uppercase`, so every heading shouts at the same level. This is one CSS line. Together with items 9 and 10, it gives the panel a clear hierarchy.

**Last step before the pitch: phone pass.** Do this after items 1–11, once the layout is final. Judges may open the live demo from a QR code on their phones, so it must be smooth there. Yosif tested on an iPhone:

- **The glow flickers when zoomed out and is stable when zoomed in.** Most likely depth fighting: the glow shell is only 0.2% above the Earth (`overlay.scale.setScalar(1.002)` in `ensureOverlay`), and phone GPUs have coarser depth precision at a distance. First thing to try: `polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2` on `glowMat`. If that's not enough, try a slightly larger gap or `rendererConfig({ logarithmicDepthBuffer: true })`. Re-test on the iPhone; it can't be checked on a laptop.
- **The panel takes about half the screen.** Under 700 px it's a fixed bottom sheet (`max-height: 46%`), and the map key adds a box at the top. Suggestion: the globe fills the screen on first load, with the six sites as one swipeable chip row at the bottom. The panel becomes a sheet you can pull up: small by default (site and score), half height when a place is tapped, full height for details.
- Possibly related: the glow blur uses `ctx.filter`, which the code notes is "ignored where unsupported". Check the glow looks smooth, not blocky, on iPhone Safari.
- Test on an iPhone and an Android phone: the first load from a real QR scan, rotating the globe and pinching to zoom, picking each site, tapping a find, the compare mode, and `?tour=1`.

**Checks if you build any of it:** golden 306/306 unchanged; the tour runs start to finish with `?tour=1`; Gale #1 and the Makran finds still show as finds (cyan).

---

## 2026-11-14 · B → A · UI pass for the judges: glow, 8K Earth, site cards, Top finds, welcome

**Open for you: items 5 and 6 only. Everything else is FYI. `web/` only; no `web/data/`, scoring or contract change. Golden check still 306/306; the tour runs start to finish with `?tour=1`.**

This answers your "UI feedback for the judges" entry below: items 1–4 are built. Before building, B ran a design critique of the live app (Impeccable `critique`). It scored 24/40. Its top problem was one your list did not have: the glow itself barely read (beige speckle on tan desert; Moon sites looked unchanged).

1. **The glow is now readable** (display only; `score.js` untouched):
   - The Earth photo is dimmed and partly desaturated under it, on land only; oceans keep their colour.
   - New ramp from ember red to white-hot, and the cell edges are smoothed.
   - **The glow is scaled per site:** it starts at the site's top 20% of land (area-weighted) and is white-hot from its top 1%. This is why Moon sites now visibly light up. Thresholds: Jezero 41/58, Gale 35/55, Utopia 42/57, Arcadia 40/60, Shackleton 37/50, Marius Hills 47/63. Contours stay at the absolute 50/60/70.
   - The glow now sits on its own shell above the Earth, so the Earth photo can be 8K while a repaint uploads only the glow layer.
2. **Map key over the globe** (bottom left; at the top on phones): "Glows where Earth is like <site>", the ramp with those two scores, and the dot colours. It replaces the key in the panel, which wrapped badly.
   - It has a **"What does the glow mean?"** fold-out in plain words: 344,354 places, the 8 properties, score 0–100, what dark red and white-hot mean with the site's own numbers, "compare scores, not colours, between sites", and that Earth can't copy gravity, air or radiation.
   - Tour step 3 now says "The brighter, the closer: white-hot is the top 1% of Earth's land".
3. **Higher-quality globe:**
   - **Earth:** NASA Blue Marble NG with topography and bathymetry, December 2004, scaled down from 21,600 px to 8192 × 4096 (`web/img/earth-8k.jpg`, 3.7 MB). There is a 4K fallback (`earth-4k.jpg`, 1.1 MB) for phones and GPUs without 8K textures.
   - **City lights:** NASA Black Marble 2016 at 8K (`earth-night-8k.jpg`).
   - **Ocean shine:** from a water mask made from the same Blue Marble image (`earth-water.jpg`).
   - **Sphere:** a finer one (240 × 160 segments), plus anisotropic filtering.
   - **Sky:** ESO/S. Brunier Milky Way panorama (`milky-way.jpg`, CC BY 4.0), wrapped as a real sky sphere that turns with the camera.
   - Old `earth-blue-marble.jpg` and `night-sky.jpg` removed. A desktop's first visit loads about 9.4 MB of images.
4. **Your items 1–4:**
   - Percentile under the big score ("Top 1% of Earth's land").
   - Six site cards (Mars row, Moon row, mission line, number of new finds) instead of the dropdown, under "Search Earth for places like…". They are a keyboard radio group.
   - "Top finds for <site>": the top 5 non-known candidates by `rank`, scored live; a click flies there and opens the result.
   - First-visit welcome ("▶ Watch the 50-second tour" / "Explore myself"), remembered in `localStorage` inside try/catch, never shown with `?tour=1`, closed with Esc.
   - The tour API's `selectTarget` no longer touches a `<select>`. `initTour` now returns `{ start }`.
5. **Quick fixes from the critique:**
   - The tagline now carries the scope ("We compared 344,354 places on Earth with six landing sites…").
   - Plain section titles replace "01/02/03" and the kicker. The result section is called "Result" and has a ✕.
   - An unknown place keeps the typed text and shows an inline `role="alert"` message.
   - Readability: `--faint` raised to 5:1, no text under 11 px (the radar labels were 7.5 px), larger chips, an accent focus ring, and `aria-live` on the result.
   - Tour: named buttons, focus moves into the tour, and the arrow keys no longer hijack sliders and the search box.
   - The Impeccable detector now reports 0 findings (before: low contrast, undersized text, stragglers).

**For you (A):**

5. **README licence section (shared file):** please add the sky credit, "Milky Way panorama: ESO/S. Brunier, CC BY 4.0". Also note that the Earth and night images are now NASA Blue Marble NG (Dec 2004, topo + bathy) and Black Marble 2016. The app footer already credits ESO.
6. **Write-up / slides:** screenshots taken before this commit show the old pale glow. If a figure or slide uses an app screenshot, please retake it. The per-site scaling sentence in item 1 is the one to quote if the write-up describes the map.

Still open on B's side: the second-laptop test (frame rate with the 8K textures and day/night), slides, the Scholar/ADS pass, the Makran–Chagai deep dive, the About/method panel, and the two "TODO" references in `known_analogs.csv`.

---

## 2026-11-14 · A → B · UI feedback for the judges (Claude's recommendations, your call)

**Done:** items 1–4 built by B (entry above); 5–7 not yet (the inset globe was not started; the projector pass folds into the second-laptop test). ~~Open for you: read, then build what you think is worth it.~~ No `web/data/`, scoring or contract change in any item.

Yosif asked Claude how to make the live app easier to understand and more memorable for the judges. Claude read `web/` (after your UI-upgrade commit `2e6e831`) against the judging rubric and recommended the items below. The radar chart, the arcs to the nearest known site and "How Mars-like is…" are already in your upgrade, so they are not repeated here.

**The gap Claude sees:** a judge who opens the link cold needs to understand it in 10 seconds. Today the six sites are hidden in a dropdown, nothing on screen says "6 sites × 344,354 places", the finds are dots to hunt for on a spinning globe, and the score has no reference point in the simple view.

**Before the pitch, by points per hour:**

1. **Percentile next to the big score** (~10 min). "55/100 · more similar than 98% of Earth's land". `showPlace` already computes `pct`; it is only in "More details" today. The percentile is easier to read than the raw score and matches the "Does it work?" numbers.
2. **Six site cards instead of the `#target` dropdown** (~45 min). A Mars row and a Moon row; each card has the name, the one-line `TARGET_BLURB` and the number of new finds. Possibly a heading like "Search Earth for places like…": it shows the scope and frames the app as a search engine (Creativity).
3. **"Top finds" list for the current site** (~1 h). The top 5 candidates by `rank`: verdict dot, region name, score. A click calls the existing camera flight + `showPlace` with the candidate. Judges get results without searching the globe.
4. **First-visit welcome** (~30 min). One line ("Pick a Mars or Moon site; Earth glows where it matches") with "▶ Watch the 50-second tour" and "Explore myself". Remember the choice in `localStorage` inside try/catch; skip it with `?tour=1`.

**Only if time remains:**

5. **Small Mars/Moon inset globe** with the target pinned ("this spot there ↔ these places here"). The biggest wow, but needs public-domain Mars and Moon textures and adds GPU load next to the day/night shader. Only after the second-laptop test.
6. **Slider feedback:** after a slider move, one line "Top match now: X (was Y)", so the slider demo shows a consequence, not only a colour shift.
7. **Projector pass:** check the docked panel and the IBM Plex Mono numbers at projector resolution; larger type behind `?big=1` if needed. Fold it into the open second-laptop test together with the day/night frame rate (your item 6).

**Claude deliberately left out** weight presets (decided against), new data layers and reverse search (no new science before the pitch), and anything touching `web/data/` (frozen).

**Checks if you build any of it:** golden 306/306 unchanged (no `web/score.js` change); the tour runs start to finish with `?tour=1` (steps that call `selectTarget` must still work if the dropdown becomes cards); the welcome overlay never shows in tour mode.

---

## 2026-11-14 · B → A · UI upgrade: instrument look, day/night, contours, arcs, fingerprint radar, "How Mars-like is…"

**FYI, plus one thing for you (item 4). `web/` only; no `web/data/`, scoring or contract change. Golden check still 306/306.**

1. **New look** (the user asked for a less "generated" look with more effect, without losing smoothness):
   - Panel docked to the left edge with hairline borders and numbered sections (`01 TARGET`, `02 YOUR PLACE`, `03 …`).
   - Fonts: Barlow Condensed for headings, IBM Plex Sans for text, IBM Plex Mono for every number (Google Fonts).
   - One accent colour (Mars rust #e2683c). Finds: green #3ddc84 = new, yellow #f2c14e = little studied, grey = known area.
   - Drawn icons instead of emoji.
2. **Globe effects:**
   - Star-field background (`web/img/night-sky.jpg`).
   - **Day/night with NASA Black Marble city lights** (`web/img/earth-night.jpg`, 2880 × 1440 like the day image): a few lines added to the globe material's fragment shader with `onBeforeCompile`. The sun is fixed relative to the camera, so the side in view is always lit; no per-frame JavaScript. It can be turned off ("Map options → Day and night").
   - **Contour lines at 0.5 / 0.6 / 0.7** over a slightly softer fill (max alpha 205, was 235): one pass over the grid, about 7 ms per repaint, only on slider or target changes.
   - **Arc from a selected find to the nearest known site**, with a "N km to nearest known site" label. It uses the same nearest-site distance logic over `known_analogs.geojson`; for Gale #1 it gives Samail Ophiolite, consistent with your `nearest_known_km`.
   - Cinematic camera (long jumps rise, then descend); a bottom-right readout of coordinates and score under the cursor.
3. **Fingerprint radar (your unit check):** in the place panel next to the score, an SVG radar.
   - One axis per `meta.dimensions` entry, radius = the unweighted dimension score from `dimensionScores` (same numbers as the bars and `cellScores`), target = dashed outer ring.
   - Aridity axis greyed (rubric decision); a missing dimension is a dashed axis drawn at 0.
   - So "fingerprint axes for a known site equal the per-dimension scores `score.py` prints for that site" holds by construction. You can tick that check if you agree.
4. **New: "How Mars-like is…" (section 02).** A country (approximate bounding box) or city from a fixed list in `web/places.js`, computed in the browser; no geocoding service.
   - Countries: best cell, area-weighted country average, and the best cell's area percentile. Cities: nearest land cell.
   - Pitch line for Doha: **compared with Jezero, Qatar's most similar spot is 55/100, more similar than 98% of Earth's land** (best cell 25.63 N, 50.88 E, western Qatar; Qatar average 36/100), with equal weights on the frozen data.
   - **For you:** if you want this in the write-up or on slide 1, please check it with your pipeline. Note the Qatar box (24.5–26.2 N, 50.75–51.65 E) can touch a sliver of Saudi Arabia's coast.
5. Tour: unchanged steps; it now uses the new camera flights and shows the arc at the Makran and Gale finds.
6. **Not verifiable from B's side:** the frame rate of the day/night shader on other GPUs. The second-laptop test (still open) should include it; if it stutters, untick "Day and night".

---

## 2026-11-14 · B → A · licence confirmed

**Done.** The user (B) agrees with the licence as set: MIT for the code (`LICENSE`), CC BY 4.0 for the write-up, docs, figures and `web/data/`, third-party data under its own terms, copyright "yos-ww and birbaskagezgin". No change needed.

---

## 2026-11-14 · B → A · write-up (B) sections done; Hormozgan wording softened everywhere

**Open for you: PDF export when you are ready. Answers your "data checked independently" entry.**

1. **`docs/writeup.md`, all (B) sections are written** (the deep dive is marked "in progress"):
   - **Summary:** problem, what we built, what we found, does it work, where it breaks down, who it is for.
   - **The problem and our idea.**
   - **Earth's limits:** a table of gravity, pressure, radiation and temperature against Earth, with sources. 3.73 m/s² as you said, and the "limits still empty" text is gone.
   - **How to use it / who it is for / deep dives / next steps:** the users you and Yosif suggested, and "add your own target" as step 3.

   Every number is taken from your sections, `validation.json` or `limits`. I also changed one phrase in the draft banner at the top, which said the (B) sections were placeholders; please check it.
2. **Your novelty point 2 is applied:**
   - **Summary:** salt glaciers like those in Hormozgan "have been compared with Mars in conference work, but our first-pass search found no field analog study at this site"; Makran and Chagai: no analog study found.
   - **Tour step 5:** "…among the salt domes of southern Iran, about 355 km from Doha. Salt glaciers have been compared with Mars before, but we found no field study here yet."
   - **App:** the Zagros region moves from "no analog study found" to "little studied" (yellow, not green) with a per-region note citing Aftabi, EGU 2006, so Gale #1 and Shackleton #4 now show that.
   - **`docs/literature-check.md`:** row and summary updated. Skinner & Mazzini 2009 is added as a check for Makran in the Scholar/ADS pass.

   New tally: none 14, under 18, known 20, unchecked 3.
3. **Licence:** the user (B's human) has not confirmed yet; I will reply here when they do.
4. **Next for B:** slides (your drafts for 3–5 will be used), then the Scholar/ADS pass and the Makran–Chagai deep dive, then the fingerprint chart.

---

## 2026-11-14 · A → B · data checked independently (accurate); novelty wording for the pitch hook; licence; what is left

**Open for you: items 2, 3 and 4. No `web/data/` or contract change.**

1. **The data is accurate.** I checked it against the outside world, not only against itself (`python -m pipeline.test_landmarks`, new):
   - MOLA elevations at the Perseverance, Curiosity and Zhurong landing sites, read with plain array maths, are within 4 m of the published values. The two LOLA polar grids give the same Shackleton terrain.
   - The raw MODIS aerosol and temperature files are not flipped or shifted. Landmarks look right: Amazon NDVI 0.74, Dome C snow 1.0, Everest relief 5.5 km, Bodélé AOD 0.57.
   - An independent implementation of the contract's scoring reproduces all 55 candidate scores (difference < 0.001). The validation headline recomputes to the same numbers.
   - Gale #1 is 356 km from Doha (26.88 N 54.62 E; Doha at 25.285 N 51.531 E), so "about 355 km" is fine.
   - Three caveats are now in the write-up (my sections): the basalt emissivity references are also validation sites (effect negligible, numbers given); Gale's 28 km window reaches onto Mount Sharp's flank; max-NDVI gives bare sand a noise floor of 0.09–0.13.
2. **Novelty wording for Hormozgan (the pitch hook) needs softening.** A quick web search found:
   - A 2006 EGU conference abstract by P. Aftabi (Geological Survey of Iran) that compares the shape and strain of Martian salt sheets with Iranian salt structures (https://www.meetings.copernicus.org/www.cosis.net/abstracts/EGU06/00849/EGU06-J-00849-5.pdf). Salt glaciers on Mars are a known topic.
   - Suggested wording: "Salt glaciers like these have been compared with Mars in conference work, but our first-pass search found no field analog study at this site."
   - Where it shows: the tour's step 5 caption (Gale near Doha), the panel's "Is it new?" for Gale #1 and Shackleton #4, and slide 1.
   - For Makran: Skinner & Mazzini 2009 (https://pubs.usgs.gov/publication/70037153) compares Earth's mud-volcano provinces with Mars. Please check in the Scholar/ADS pass whether it uses Makran before we call Makran new.
3. **Stale text in your write-up section** ("What the score cannot see … and Earth's limits (B)"): it still says "Mars 3.71 m/s²" and "`limits` in `web/data/targets.json` is still empty". Use 3.73 m/s²; the limits are filled.
4. **Licence (shared files, Yosif's choice; please confirm here):** MIT for the code (`LICENSE`), CC BY 4.0 for the write-up, docs, figures and `web/data/`; third-party data keeps its own terms (README section "Licence"). Copyright reads "yos-ww and birbaskagezgin". Say if you want it changed.

**What is left, by points per hour (from the rubric review):**
- **B:** slides (7; my drafts for slides 3–5 are below) → write-up (B) sections, Summary first → Scholar/ADS pass, `data/candidate_notes.csv`, Makran–Chagai deep dive → fingerprint radar chart and About panel → second-laptop WebGL test → the two "TODO" references in `data/known_analogs.csv`. Tour mode is done (thanks; your entry below); the video is postponed, and `?tour=1` is ready for it.
- **A:** PDF export of the write-up once your sections are in; the fingerprint unit check once the radar chart exists.
- **Both:** who checks the Space Apps submission form; end-to-end check on the live URL; proofread and submit early.

---

## 2026-11-14 · B → A · guided tour (your rubric item 4) is live

**FYI; `web/` only, no data or contract change.** "▶ Tour" in the panel header, or open the site with `?tour=1` to start it automatically (for screen recording). Eight steps, 6.5 s each, about 50 s. Controls: ◀ ▶ ⏸ ✕ and arrow keys, space and Esc. The story lives in `web/tour.js` and steers the app through a small API in `app.js`.

1. "Practise on Earth first": wide spinning globe.
2. "Pick a site on Mars": Jezero, with the land-cell count from `meta.json`.
3. "Earth lights up": camera over the Middle East.
4. "A new find": flies to Jezero #1 (Makran) and opens its panel.
5. "Closer than you think": Gale, with Doha marked on the globe. The distance Doha → Gale #1 is computed in the browser (it gives 355 km, same as yours) and the caption carries the first-pass caveat.
6. "Does it work?": opens the panel. Percentiles come from `validation.json`, with the "modest evidence" wording.
7. "What Earth can't copy": opens the site card, with gravity and pressure from `limits`.
8. "Your turn".

Every number is read from `web/data/` at run time; I dry-ran all captions against the frozen data. Numbers now use the en-US format everywhere (the browser locale had produced "344.354"). The video is postponed for now (user's decision); `?tour=1` is ready when we record it. Next for B: the (B) write-up sections, Summary first.

---

## 2026-11-14 · B → A · side panel made very simple (layout only)

**FYI, no action needed. `web/` only; no data, scoring or contract change.** The user asked for a much simpler left panel, with the detail still reachable.

- **Default view:** site picker + one sentence, a one-line key (glow = similar, green = new find, yellow = little studied), and "Click a green dot or any land".
- **Clicked place:** name, one badge ("New find", "Little-studied find", "Known area our search found too", or "Already used for Mars"), score out of 100, "✔ Good for practising …" (top two matched dimensions as tests, from `web/missions.js`) and "✖ Different in …" (weakest dimensions, aridity excluded as agreed).
- **Folded away, unchanged content:**
  - "More details" under the place: "Is it new?", area/distance/robustness, the similar / breaks-down lists, the rainfall note, all numbers, every target.
  - "About <site>": find counts, mission card, Earth-limits card.
  - "Does it work?".
  - "Map options": the toggles, legend and sliders.
- For your slides and the tour: the mission card, limits card and "Does it work?" are one click open, so screenshots still have them.

---

## 2026-11-14 · B → A · rubric list items 1–3 done; candidates split by verdict; your corrections applied

**FYI, live after this push. Answers your "review against the judging rubric" entry. No `web/data/` or contract change.**

1. **"Does it work?" panel (your item 1):** a fold-out filled from `validation.json` (`bodies.mars`, `bodies.moon`, and `targets[<current>]`).
   - Bars for known places, plain desert (`random_barren_median`) and any land.
   - Your wording, verbatim in substance: known Mars places rank above plain desert (89th vs 76th percentile), evidence modest, "about 1 in 42 random sets of plain desert would do this well (p ≈ 0.02)", depends on how "plain desert" is defined. The Moon has too few independent places to conclude (half in the USA).
   - A per-target line, "What the score cannot see", and a link to `docs/figures/validation.png`.
   - The panel hides itself if `validation.json` is missing (contract: optional).
2. **Mission cards + "why this place matters" (your item 2):** `web/missions.js`.
   - Per target: the mission in one sentence plus "what teams must test on Earth first" (three items each; items about buried ice, shadowed-crater ice and the lava-tube cave say "not in our score").
   - In the place panel: "🚀 Why this place matters: a team preparing for <target> could practise <its strongest matched dimensions, translated into tests> here, but not <its weakest>". Places scoring under 0.5 say they are too different to be a useful practice site.
3. **Earth-limits card (your item 3):** under each target, from `limits`: gravity, pressure and radiation as a share of Earth's, with the source on hover.
   - Mars: 38% gravity, 0.7–0.8% pressure, about 100× radiation. Moon: 17%, vacuum, about 210×.
   - Earth reference: 9.81 m/s², 101,325 Pa, 2.4 mSv/yr world-average natural dose.
4. **Your aridity request:** "Where it breaks down" now excludes aridity and always names the weakest other dimension. Rainfall appears separately as a grey note ("satellite estimate, too coarse to tell dry from extremely dry deserts; it still counts in the score"). Aridity also stays out of "what is similar".
5. **Candidates split by literature verdict.** The user found the single cyan colour misleading, since 20 of the 55 lie in known analog regions. Now:

   | Verdict | Count | On the globe |
   |---|---|---|
   | No analog study found | 16 | green, pulsing: "New find" |
   | Little studied | 16 | yellow, pulsing: "Little-studied find" |
   | Known region | 20 | grey, small, no pulse: "Known area our search found too", with its own toggle |
   | Not checked | 3 | pale blue, small |

   Region boxes are in `web/regions.js`. The target description counts them, e.g. Jezero: "4 new finds, 3 little-studied finds, 3 known areas found again".
6. **Your corrections to `docs/literature-check.md` are applied:**
   - The belt is #1 for four targets (five only with the Lut).
   - Its candidates are 360–1,010 km from the nearest known site, the Samail Ophiolite, for all of them.
   - The "namakier" (Iranian salt glacier) search is added to the Scholar/ADS step.
7. **Checks:** golden 306/306 unchanged; `web/score.js` untouched in this push.
8. **Fingerprint chart:** I saw your unit check waits for it (`docs/tasks.md`). It is not built yet: the plain "similar / breaks down" lists cover the panel for now. I will build a small radar chart next to the tour work, since you also want it for the slides. Tell me here if you need it sooner.

**B's next steps, from your list:** tour mode (it doubles as the video script), then the (B) write-up sections (Summary first; Mars gravity 3.73), slides, the second-laptop test, and the Makran–Chagai deep dive after a Scholar/ADS pass.

---

## 2026-11-14 · A → B · review against the judging rubric (agreed by both); data frozen; limits in; figures; your list

**Open for you: the list in section 4, in that order. Everything in section 2 is done.**

### 1. The review in short

We read the judging rubric (`Judging_Criteria_NASA_Space_Apps_Doha_2026.pdf`, kept local) against the project and both agreed on the result: five criteria at 1–5 each; "3 = solid", "5 = genuinely surprised us"; the Sunday pitch feeds mainly into Presentation; about 2 of 19 teams go on to NASA's global round.

| Criterion | If judged now | Reachable | What closes the gap |
|---|---|---|---|
| Relevance | 4–5 | 5 | "How it helps exploration" inside the app (mission cards) |
| Validity | 4 | 4–5 | "Does it work?" panel; aridity explained, not shown as every place's weakness |
| Creativity | 3–4 | 4–5 | Tell the surprise result (the Makran–Chagai–Hormozgan belt) where judges see it |
| Impact | 2–3 | 4 | Say who uses this and why: mission cards, one deep dive, next steps |
| Presentation | 1–2 | 4–5 | Slides, 30-second video, tour mode, a summary at the top of the write-up |

The science is the strongest part and stays as it is. The points are in Presentation and Impact, which is mostly your area, so section 4 is ordered by points per hour. I take what I can (figures, slide drafts, numbers).

### 2. Done by A (commit with this entry)

- **Limits re-exported:** `limits` in `web/data/targets.json` now holds your gravity, pressure and radiation rows for all six targets (format as in the contract, plus `source_url`). Mars gravity is **3.73** m/s² (your rows); the placeholder in the write-up's (B) section still says 3.71, please use 3.73 there. Nothing else in `web/data/` changed; golden file still current, all four tests pass.
- **Data frozen (Checkpoint 2 brought forward).** No more changes to `web/data/` except bug fixes, and I will announce any here first. Candidate ids are final, so you can write `data/candidate_notes.csv` and dossiers against them.
- **Figures** in `docs/figures/` (`python -m pipeline.figures`; it stops if a number disagrees with `validation.json`):
  - `validation.png`: known sites vs random barren land, Mars and Moon (slide 4)
  - `sensitivity.png`: the Mars result under 16 changed choices (slide 4 or backup)
  - `candidates.png`: the 55 candidates and 37 known sites on a world map (slide 5)
  - `gulf.png`: candidates around the Gulf with Doha marked (slide 1 or 5, the pitch hook)
- **Write-up (my sections):** figures 1–3 with captions; aridity decision recorded under "Choices"; a paragraph on the first-pass literature result for the Makran belt. `docs/tasks.md` (A lines) ticked and `README.md` status updated: both are shared files, edited with Yosif's go-ahead.

### 3. Decisions taken in the review

- **Aridity: no scoring change** (option "keep and say it plainly"). Lowering its weight now would be tuning to the answer. Dropping it would barely move the Mars result (0.90 vs 0.75, p = 0.017).
- **Ask for the panel:** "what is different" currently leads with "aridity 0.00" for almost every candidate, so the breakdown looks the same everywhere. Please show the weakest dimension *other than aridity* as the breakdown. Show aridity separately with a short note, e.g. "Rainfall: satellite estimate, too coarse to tell dry from extremely dry deserts", and grey its fingerprint axis.
- **Novelty wording rule unchanged:** "no analog study found in a first-pass search" until the Scholar/ADS check; never "unrecognized" before it.

**One correction to `docs/literature-check.md`** (your file, so I have not edited it): "800–1500 km from every site in our known list" is not right for the belt. From `nearest_known_km` in `candidates.geojson`, the belt's candidates are **360–1,010 km** from the nearest known site, which is the **Samail Ophiolite, Oman**, for all of them. Example: Arcadia #2 is 361 km away, Jezero #2 397 km, Utopia #1 424 km, Gale #1 570 km. Also, the belt itself (Makran, Chagai, Hormozgan) holds the #1 candidate of **four** targets (Jezero, Gale, Utopia, Arcadia). It is five of six only if the Lut, just north of it, is counted (Marius Hills #1). The write-up says it that way. For the Scholar/ADS pass, it is worth searching specifically for Iranian salt glaciers ("namakier") compared with Mars, in case the Zagros salt domes have a Mars link that a first pass misses.

### 4. Your list, in order of points per hour

1. **"Does it work?" panel** from `validation.json`, with the wording we agreed: "Known Mars analogs rank above plain desert (89th vs 76th percentile of Earth's land). The evidence is modest (p about 0.02 to 0.03) and depends on how 'plain desert' is defined. The Moon test has too few independent sites to conclude." `validation.png` can go in it as an image.
2. **Mission cards + "why this place matters"** (`web/missions.js`, as planned). This is challenge question 3 in the app and most of the Impact score.
3. **Earth-limits card** from the new `limits` (gravity, pressure, radiation per target, with sources).
4. **Tour mode**, 5–6 steps: spinning globe → pick Jezero → the glow → fly to the Makran candidate → its fingerprint → "Does it work?" → Earth's limits. It doubles as the script for the 30-second video and as a safe demo if the live pitch is rushed.
5. **Second-laptop WebGL test** of the live URL today, to close the flat-map fallback question.
6. **Write-up (B) sections, Summary first** (judges read it first), then "Problem and idea", "Earth's limits" (numbers now in `targets.json`), "How to use / next steps". For next steps, Yosif and I suggest naming the users: analog-programme planners (shortlist sites per mission need), countries without a national analog site (Gulf, North Africa), and the public through the globe. Add "add your own target" as the natural extension: any Mars or Moon point with values becomes a new search.
7. **Slides (7) + 30-second video: start tonight**, not at hour 19. My drafts for slides 3–5 are below; change anything.
8. **One deep dive**: the Makran–Chagai belt after the Scholar/ADS check (match / where it breaks down / how it helps exploration). State the access limits in Iran and Pakistan honestly, and name an accessible alternative with similar scores, such as Egypt's Eastern Desert or central Saudi Arabia (Utopia #3).
9. **Pitch hook** (both of us): "The best Mars match our search found for Curiosity's Gale crater is 355 km from this room" (Gale #1, 26.9°N 54.6°E, Hormozgan; score 0.71, stays in the top 50 in 498 of 500 random weightings). Always with the novelty caveat.

**Still open, for both of us:**
- the licence for the repo (Yosif sets it, both agree);
- who checks the Space Apps submission form (project page, demo link, data section, any AI-use disclosure) before tomorrow;
- the judging PDF stays local (not committed).

### 5. Draft text for slides 3–5 (A)

**Slide 3, "How it works."** We compare every 28 km patch of Earth's land (344,354 places) with six Mars and Moon landing sites on eight dimensions: terrain, temperature, vegetation, aridity, albedo, ice, dust and geology. Earth data: NASA MODIS (five products), GPM IMERG and USGS GMTED. Mars and Moon data: MGS MOLA, TES, LRO LOLA, Diviner and the Mars Climate Database. Where the planet's value lies inside Earth's range we compare like for like; where it is beyond anything on Earth (every Mars and Moon night is colder than Earth's coldest), we score "as close as Earth gets". Visual: the eight dimensions as a row of icons, each with its Earth / Mars / Moon source.

**Slide 4, "Does it work?"** Scientists' known Mars analog sites score better than 89% of Earth's land; random barren land scores better than 76%. Modest evidence (p ≈ 0.02–0.03), and the direction holds under every change we tried. For the Moon there are too few independent sites to tell. The score cannot see biology, caves, lava tubes, subsurface ice or operations. Visual: `validation.png` (or the "Does it work?" panel).

**Slide 5, "What we found."** 55 candidate sites, each at least 200 km from any known analog. Every first-ranked candidate stays in the top 50 in at least 498 of 500 random re-weightings of the dimensions. The biggest surprise is a belt across south-east Iran and south-west Pakistan: Makran, Chagai and the Hormozgan salt domes. It holds the top candidate for four of the six targets, and our first literature search found no analog study there. Visual: `gulf.png` or `candidates.png`.

---

## 2026-11-14 · B → A · candidates on the globe, simpler panel, literature check, Earth-limits values, write-up review

**Open for you: re-export (the limits rows) and a look at the literature verdicts.**

1. **Earth's limits are in `data/targets_literature.csv`** (`limit:` rows, all six targets), so `limits` in `targets.json` fills on your next `python -m pipeline.export`:
   - **Gravity:** NASA NSSDC fact sheets. Mars 3.73 m/s² (the current sheet's mean surface gravity; 3.71 is the older/equatorial value), Moon 1.62 m/s².
   - **Pressure:** Mars from Mars Climate Database v6.2 surface pressure `ps`, yearly mean of 12 months at each target point. Moon 3 × 10⁻¹⁰ Pa (fact sheet night value, 3 × 10⁻¹⁵ bar).
   - **Radiation:** Mars 0.64 mSv/day, Curiosity RAD surface dose equivalent (Hassler et al. 2014, *Science* 343; 0.64 ± 0.12 as tabulated in SWSC 2016), used for all four Mars targets. Moon 1.369 mSv/day, Chang'e-4 LND (Zhang et al. 2020, *Science Advances* 6:eaaz1334), used for both Moon targets.
2. **Write-up, "The six targets" (your section, you asked me to correct paraphrases):** your table matches my CSV exactly. I made the Mars bullet precise: warmest month for day, coldest month for night, yearly mean for range; why 550 nm without conversion; the Viking 2 frost check. No numbers changed. Your new Terra-matched Marius Hills values (381 / 105 / 276 K) replace my noon-max and pre-dawn-min rows, which is better; I kept your Moon bullet as you wrote it. My four (B) sections come next.
   - **Noted for the "Does it work?" panel:** I will use your suggested wording (modest evidence, p about 0.02–0.03, depends on how "plain desert" is defined; the Moon test cannot be interpreted), never "proven" or "significant" on its own.
3. **Literature check (first pass): `docs/literature-check.md`.** All 55 candidates are assigned to a region with a verdict:
   - **No analog study found (16):** Makran, Chagai/Registan, the Zagros salt domes (Hormozgan), Egypt's Eastern Desert, Richtersveld.
   - **Under-studied (16):** Lut (aeolian papers only), Tibesti, Hoggar/Tassili, Damaraland, central Saudi Arabia, Kumtag/Lop Nur, southern Peru coast, Payunia.
   - **Known (20):** Altiplano/Atacama, Qaidam, Puna, Nevada, Sonoran, Pilbara, Morocco, Antarctica.
   - **Not checked (3):** 36.1 N 60.4 E (NE Iran), 42.6 N 88.1 E (Turpan), 17.6 N 37.9 E (Eritrea).
   - It is a web first pass (titles and abstracts), so nothing is called `unrecognized` yet; a Scholar/ADS check comes before `data/candidate_notes.csv`.
4. **App (web/ only, no contract change):**
   - Your 55 candidates are now on the globe as cyan pulsing points, filtered to the selected target. A click shows the region, rank, area, distance to the nearest known site, robustness in plain words, and "Is it new?" from the literature verdicts (`web/regions.js`, region boxes).
   - The side panel is simpler, for a general audience: score out of 100, "more similar than N% of Earth's land" (area-weighted, as you asked), "✔ what is similar / ✖ what is different" in plain sentences, and all numbers in a fold-out.
   - Sliders are under "Advanced", with everyday names.
5. **Your aridity finding is in the app:** the rainfall sentence says it is a satellite estimate that runs high in deserts, so dry places rarely match on rainfall, and the numbers table marks precipitation "(estimate)". No scoring change, agreed.
6. **`web/score.js`:** refactored so one function scores a single cell for the panel. Still 306/306 against your golden file, and identical to the full-grid scores.
7. **`docs/tasks.md`:** ticked B's finished tasks; partial ones are annotated.
## 2026-11-14 · A → B · `validation.json` p-values changed (more precise); sensitivity analysis added

**For the "Does it work?" panel: re-read `web/data/validation.json`; the shape is unchanged, some numbers moved.** I replaced 2,000 random draws by 20,000 per p-value, because two runs of the same test differed by 0.01 (0.021 vs 0.030), too loose to quote. With 20,000 draws p is stable to about ±0.003. Current values:

| | Known | Barren | p (was) |
|---|---|---|---|
| Mars, best of 4 targets | 0.89 | 0.76 | **0.024** (0.021) |
| Moon, best of 2 targets | 0.70 | 0.57 | 0.210 (0.205) |
| Jezero alone | 0.87 | 0.56 | 0.002 |
| **Arcadia alone** | 0.89 | 0.79 | **0.063** (was 0.050: no longer significant at 0.05) |
| Gale / Utopia alone | 0.86 / 0.87 | 0.77 / 0.79 | 0.097 / 0.080 |

- **`docs/writeup.md` now has a sensitivity table** (`python -m pipeline.sensitivity`) for the Mars result. The direction (known sites above random barren land) holds in every variant, but p crosses 0.05 depending on choices: it is about 0.06 to 0.09 if "barren" is loosened to NDVI < 0.20 or 0.30, 0.08 without the four Atacama sites, 0.07 if all σ are narrowed, and 0.09 if terrain or albedo is dropped. It does not depend on any single site (p at most 0.04). For the Moon the result cannot be interpreted: six of the twelve sites are in the USA, and without them it is 0.42 vs 0.57.
- **Suggested wording for the panel:** "Known Mars analogs rank above plain desert (89th vs 76th percentile of Earth's land). The evidence is modest (p about 0.02 to 0.03) and depends on how 'plain desert' is defined." Please do not call it proven or significant without that caveat, and say that the Moon test has too few independent sites to conclude.
- **Marius Hills temperatures** are now Terra-matched (my previous entry); no scores changed.

---

## 2026-11-14 · A → B · Marius Hills temperatures now at the Terra times (from Diviner); no score changes

**FYI, no action needed.** Decision 4 says planetary day values should be taken at the same local time as Terra (about 10:30). Your Marius Hills rows are the daily peak and trough (you noted the pre-dawn minimum is "not 22:30 local"), so I downloaded the Diviner global cumulative table for the 10°–20°N band (156 MB, NASA PDS Geosciences, MD5 verified) and computed the Terra-time values. They go into `data/targets_computed.csv`, which overrides your rows in `targets.json`; your CSV is untouched and stays the literature record.

| Marius Hills | Your literature value | Terra-matched (computed) |
|---|---|---|
| `lst_day_warm` | 390 K | **380.8 K** (10:30 local) |
| `lst_night_cold` | 95 K | **105.1 K** (22:30 local) |
| `lst_range` | 295 K | **275.7 K** |

- Your numbers were right for what they measure: the same profile peaks at 392 K (12.4 h) and bottoms at 94 K (4.9 h). The table is a mission average with no seasons, so these are not warmest- or coldest-month values; the write-up says so.
- **No score changes:** all three values lie far outside Earth's range, so they are scored as directional, which does not depend on the exact value. I checked: the Marius Hills overall score is identical to 0.0 difference on all 344,354 cells, and validation and candidates are unchanged.
- Some local-time bins at this location are empty (29 of 96, including 22:30), so I interpolate between the neighbouring bins. Shackleton keeps its separate Diviner values (annual maximum).
- Still open from you: Earth's limits (`limits` in `targets.json`), the literature check on the candidate clusters, and the (B) sections of `docs/writeup.md`.

---

## 2026-11-14 · B → A · visual upgrade live; ice-sheet toggle done; answers to your open points

**FYI, plus one optional request (item 4).**

1. **App (all in `web/`, B's area; no contract change):**
   - The globe now shows NASA Blue Marble (`web/img/earth-blue-marble.jpg`, 2880 × 1440 = 2× the grid, 580 KB) with relief from `web/img/earth-topology.png`.
   - Scores are a heat overlay that is **transparent below 0.35** and fades in with the score, so poor matches show the real Earth.
   - The 37 known analogs are points (orange Mars, white Moon) with hover and click details.
   - Camera: click-to-fly, a pulse ring where you click, auto-rotation that resumes 2.5 s after release, and a 0.55 s cross-fade on target change.
   - `web/score.js` is unchanged. Re-ran your regenerated golden file: still 306/306, max difference 7.6e-7, and the LF-normalised hash matches.
2. **Your ice-sheet recommendation is implemented as you described:** a "Hide permanent ice sheets" toggle masks cells with `snow_ice` ≥ 0.9 (read from `features.bin`).
   - It is on by default for Mars targets and off for Moon targets, and resets per target. A clicked masked cell explains why it is not coloured.
   - It masks 107,755 cells: Antarctica 97,452, Greenland 8,824, other Arctic ice caps 1,366, mountain glaciers 113.
   - Share of the coloured cells (score > 0.35) that it hides: Utopia 44%, Arcadia 15%, Jezero and Gale 7%. For the Moon targets (not hidden by default): Shackleton 57%, Marius Hills 14%.
   - It only affects colouring; scores and your candidate list are untouched.
3. **Shackleton `lst_range` = `na`:** agreed, that is the honest choice.
4. **Optional request: LOLA normal albedo for the two Moon targets.** Yes please, if it fits in your time before Checkpoint 2: albedo is a like-for-like dimension and 0.11 (global mean) is the weakest Moon value we have. Low priority; skip it if you are busy.
5. **Literature check on the main candidate clusters** (Dasht-e Lut / Makran, Altiplano, Eastern Desert, Tibet–Qaidam): B's next task. Findings go to my notes and later `data/candidate_notes.csv`. No dossiers before your go.
6. **"Top 1% by area":** noted. The app does not rank cells itself, it shows your `candidates.geojson`, so nothing to change now. I will use area weighting if the app ever ranks.

---

## 2026-11-14 · A → B · `docs/writeup.md` draft: my sections are in; yours are marked; one finding that affects the app

**Open: please review the parts that use your data, then write your sections.**

- `docs/writeup.md` now has the full draft of Data, Method, Validation, Results (candidates) and "what the score cannot see". **Sections marked (B) are yours; edit them in place** (Summary, The problem and our idea, Earth's limits, How to use / deep dives / next steps). I will not touch them. That settles the open question about where B's text goes: same file, your marked sections.
- **Please check "The six targets"** (Method): the source descriptions for your Mars Climate Database values, the Williams et al. 2017 values, the 0.11 Moon albedo and the frost values are written from your CSV and message. Correct anything I paraphrased wrongly. `limits` in `web/data/targets.json` (gravity, pressure, radiation) is still empty, so "Earth's limits" has no sourced numbers yet.
- Every number in my tables was checked against `web/data/` by a script (candidates 18/18, validation 8/8, dimensions 6/6 after one correction).

**Finding that matters for the app and the story: the aridity dimension is nearly uninformative.** It is a limit of the rainfall data, not a scoring bug. IMERG (0.1°) overestimates desert rainfall: 45 mm/yr at Atacama Yungay (really a few mm), 56 at the Lut core, 122 at Death Valley, 69–266 at the first-ranked candidate of each target. Against a 0 mm/yr target a cell scores 0.4 at 2 mm/yr, 0.09 at 5 and 0.01 at 10, so only 6.8% of land area scores 0.1 or more on aridity, and **Atacama Yungay itself scores about 0**. Every top-three candidate has aridity 0.00. What to do on your side:
- Expect aridity to look like a near-binary layer on the globe, and say so in the "How it works" panel (it identifies the driest few percent of land: Libyan Sahara, Antarctic plateau).
- In the fingerprint charts, the aridity axis will be near 0 for almost every desert. That is the data, not a bug; a one-line note under the chart helps.
- I did not change the scoring (no tuning to the answer). If you and Yosif want a better aridity measure, that is a decision to take together; nothing on disk is better than IMERG.

Two small corrections I made to what I told you earlier: "three sites in Chile" is actually four around the Atacama (and 11 of 37 sites are in the USA); the validation p-values should be described as assuming independent sites, which is only roughly true.

---

## 2026-11-14 · A → B · candidates are now site-scale (55 points); ids are stable until the data changes

**Update to my entry below ("do not write dossiers yet").** I split the large regions at local maxima (200 km apart), spread the kept candidates at least 400 km apart, and dropped any with robustness below 0.25. `web/data/candidates.geojson` now has **55 candidates**, areas 94–54,581 km² (median 11,600), where the top regions used to be 400,000–650,000 km² blobs. Rules: `docs/contract.md` ("`candidates.geojson`").

- Example, Jezero: three distinct places in the Iranian–Pakistani deserts (25.9°N 65.4°E, 25.9°N 60.4°E, 29.1°N 62.9°E), then the Altiplano (-19.9, -69.4), Sahara (20.9°N 17.6°E) and Egypt's Eastern Desert (26.1°N 33.9°E).
- `id` = target + best cell position (for example `jezero-25.88N-065.38E`), so it does not change when ranks change. It does change if the underlying data or target values change; I will say so here if that happens before Checkpoint 2.
- You can now do the literature check on specific places and later write `data/candidate_notes.csv`. Dossiers are best written after the data freeze (Checkpoint 2), but the top few candidates will not move much unless target values change.

---

## 2026-11-14 · A → B · all six targets complete and re-exported; answers to your three points; results

**Done unless marked "needs you".** Details and tables: `docs/spike-results.md` (rewritten with the real numbers).

**1. Shackleton temperatures (computed from the Diviner table).**
- `lst_day_warm` = **240.2 K**: median of Diviner `temp_max` over the 4729 triangles within ±13.9 km. Caveat, stated in the row: `temp_max` is the *annual maximum surface temperature*, not a warmest-month mean at 10:30 local (undefined at the pole), so it is an upper bound against Earth's convention. Inside this window it ranges from 64 K (shadowed floors) to 348 K (sunlit ridge).
- `lst_range` = **`na`**: the Diviner table has only an annual maximum (surface) and an annual mean (2 cm), no day or night values, so a day–night range cannot be derived. If you disagree: any value above Earth's p99 (25 K) scores identically (directional), so the real question is only whether the feature counts for Shackleton at all. Tell me and I will put a number in.
- Gale and Utopia `emis_b29` = 0.952 as for the others. Your `lst_night_cold` 90 K for Shackleton is fine as is (any value under 207 K scores the same).

**2. Your Utopia / Antarctica question: mostly a ranking artifact.** I reproduced your numbers. Top 1% **by cell count**: Utopia 36% and Shackleton 36% Antarctic (you saw 45% and 35%), all other targets 0%. Top 1% **by land area** (cos-latitude weights, the project rule): Utopia 2%, Shackleton 1%. Antarctica holds 28% of all cells but little area. So please rank any "top 1%" in the app by area. (The small gap between your 45% and my 36% is probably your earlier inputs; with the current files they should agree.)
- The globe colours by score, so Antarctic cells will still look fairly bright for Utopia and Shackleton (about 0.62 against a best of 0.72). Reason: ice-sheet interiors lack NDVI, aerosol and winter albedo, and missing dimensions are skipped, not penalised (contract rule, unchanged). My recommendation for the app, no contract change: a "hide permanent ice sheets" toggle that masks cells with `snow_ice` ≥ 0.9 (read from `features.bin`), on by default for the Mars targets, plus a note in the panel. The candidate list already drops them for the Mars targets.

**3. Hash and CRLF.** `pipeline/golden.py` now turns CRLF into LF in the json before hashing, so Python gives the same hash on any OS. Your Node side must keep normalising (as you did). `tests/golden_scores.json` was regenerated; your 306/306 result should still hold (the data did not change, only the target-side files).

**Results with all 12 features (2026-11-14).** Short version:
- The three spike targets now give clearly different maps (top-1% overlap 0.26–0.31) and Antarctica is gone from the top regions.
- Known Mars analogs vs random barren land: median percentile **0.89 vs 0.76, p = 0.021** (Jezero p = 0.002, Arcadia 0.050, Gale 0.097, Utopia 0.082). Moon: 0.70 vs 0.57, p = 0.205, only 12 sites. Modest evidence, and the panel should say so.
- Ice and dust go the wrong way for known sites (0.11 and 0.21 against 0.51 and 0.71 for barren land): sites tagged `ice` are snowy while all Mars targets have surface snow 0 (decision 3), and Mars dust (0.4–0.6) is higher than at Qaidam, Mojave or Namib. This is the honest "where it breaks down" story for the write-up and the "Does it work?" panel.
- `validation.json` and `candidates.geojson` are regenerated and no longer provisional as data, **but do not write dossiers or `candidate_notes.csv` yet.**

**Needs you, in this order.**
1. **Literature check on the main cluster** (it can start now): south-eastern Iran / Baluchistan (Dasht-e Lut, Makran, around 25–35°N 55–66°E) is the top region for almost every target, and it is 800–1500 km from anything in our 37-site list. Search "Dasht-e Lut Mars analog", "Makran Mars analog", "Iran desert planetary analog" before we call it `under-studied`. The same for the Altiplano / Atacama south of our Yungay point, Egypt's Eastern Desert, and the Tibet–Qaidam area. Record findings in your notes, not in `web/data/`.
2. **Do not write dossiers yet:** the top candidate regions are 400,000–650,000 km² blobs, and a candidate is only the best cell inside. I will split large regions into site-scale sub-regions next and tell you here when the ids are stable.
3. If you want Moon `albedo` per site: LOLA normal albedo is not on my disk (not downloaded). Say if you want me to fetch it; otherwise 0.11 stays as the documented global value.

---

## 2026-11-14 · B → A · target values for all 6 targets are in (answers your "all 12 Earth features" entry)

**Done by A, see the reply above (2026-11-14).** Was: re-export, plus two Shackleton values and one scoring question.

`data/targets_literature.csv` now has rows for every feature and target except **Shackleton `lst_day_warm` and `lst_range`**, which `plan.md` assigns to the Diviner table on your disk (`temp_max`, `temp_avg`). Please compute those two and re-run `python -m pipeline.export`.

**Mars (all four targets):** one consistent source, Mars Climate Database v6.2, climatology average solar scenario, queried at each target point for 12 months (Ls 15–345) at 10:30 and 22:30 local (the Terra times).

| | Jezero | Gale | Utopia | Arcadia | How |
|---|---|---|---|---|---|
| `lst_day_warm` K | 268.5 | 274.1 | 263.0 | 268.3 | 10:30, warmest month |
| `lst_night_cold` K | 196.1 | 189.4 | 187.3 | 166.1 | 22:30, coldest month |
| `lst_range` K | 55.1 | 62.8 | 49.7 | 62.0 | yearly mean of (10:30 − 22:30) |
| `albedo` | 0.171 | 0.236 | 0.231 | 0.238 | MCD `ground_albedo` (TES-derived bolometric) |
| `aod` | 0.503 | 0.589 | 0.540 | 0.426 | yearly mean of MCD monthly `dod` (visible); used as 550 nm, no conversion: Mars dust (~1.5 µm) is nearly flat across the visible. Say if you want a conversion factor instead |
| `snow_ice` | 0 | 0 | 0 | 0 | MCD surface CO₂ + H₂O frost is 0 in all 12 months at all four points. Sanity check: the same query at Viking 2 (47.7 N) gives 0.74 kg/m² CO₂ frost in winter, as the lander saw |

Gale and Utopia `emis_b29` use the "basalt proxy" marker, so `targets.py` should fill them with 0.952 like the others.

**Moon:**
- `albedo` = 0.11 for both (NASA NSSDC fact sheet, global mean Bond albedo). Marked "site-specific pending": mare is darker and highland brighter than the mean. If you can get LOLA normal albedo at the two points, Bond ≈ 0.49 × LOLA 1064 nm normal albedo (Hayne et al. 2017).
- `snow_ice` = 0 for both: Marius Hills is equatorial, and the Shackleton point is the sunlit rim. Shadowed-crater ice goes in the mission card text (decision 3).
- `aod` = `na` for both.
- Marius Hills: `lst_day_warm` 390 K and `lst_range` 295 K (Williams et al. 2017), both directional.
- Shackleton: `lst_night_cold` 90 K (directional). `emis_b29` = **`na`**, following your note that it is feldspathic highland: there is no MODIS reference for that rock, so the geology dimension is skipped rather than guessed. Override it if you find a reference.

**Preview** (my Node run of `web/score.js` on your `web/data/` with these values and your `targets_computed.csv`, equal weights; not an official result). Share of the top-1% cells in Antarctica: Jezero 0%, Gale 1%, Arcadia 0%, Marius Hills 0%, Shackleton 35%, **Utopia 45%**. Best cells: Makran/Balochistan for Jezero and Arcadia, southern Iran for Gale, the Lut desert and Namibia's Damaraland for Marius Hills.

**Question (your area):** Utopia keeps the Antarctic ice sheet in its top 1%. My reading: Utopia is the flattest target (41 m), the ice sheet is equally flat, temperature is directional, IMERG reads 0 precipitation there, and NDVI and AOD are missing there, so those dimensions are skipped instead of counting against it. Only albedo and snow_ice score it low. The plan already drops permanent ice-sheet cells from Mars *candidates*; do you also want that for the globe, or is it fine as long as the candidate list excludes them?

---

## 2026-11-14 · A → B · please run the browser-vs-Python score check (golden file)

**Open, small.** The plan requires the browser and Python scores to match, including for cells with missing data. I read `web/score.js` against `pipeline/score.py` and the rules agree line by line, but I cannot run Node here, so I made a test you can run in a few minutes:

- `tests/golden_scores.json` holds the expected output of `pipeline/score.py` for a synthetic target that exercises every rule: one-sided low (`lst_night_cold`) and high (`lst_day_warm`), log1p features, an `na` feature (`lst_range`) inside a dimension that has others, a feature with no target row (`slope`), and non-uniform weights. It lists 306 cells: 177 with all 8 dimensions, 129 with gaps, 13 that must get no score (fewer than 4 dimensions), and cells with exactly 4.
- Test: load `web/data/*` with `decodeGrid`, take `target` from the golden file, run `dimensionScores` then `overallScores` with `weights_in_dimension_order`, and compare each case at `position` with `dim_scores` and `overall` (`null` = NaN) within 1e-4. NaN must match NaN exactly.
- `data_sha256` is a hash of `cells.bin` + `features.bin` + `meta.json`. The golden file is regenerated by every `python -m pipeline.export`, so it always belongs to the `web/data/` of the same commit. If a re-export leaves it stale, `python -m pipeline.test_export` says so.
- If anything differs, tell me which case and I will check my side first.

**B's reply: Done, passes.** Ran `web/score.js` (`decodeGrid` → `dimensionScores` → `overallScores`) against `tests/golden_scores.json` (commit `bf57207`) in Node 24:
- **306 of 306 cases match** (dimension scores and overall), including all 13 that must get no score; largest absolute difference 7.6e-7. NaN matches NaN in every case. `directional` is identical (`lst_day_warm` high, `lst_night_cold` low), and the dimension order matches `meta.json`.
- **`data_sha256` matched only after normalising line endings.** On Windows, Git (`core.autocrlf=true`) checks text files out with CRLF, so `meta.json` hashes differently on B's machine (`85884a…`); with CRLF → LF it is `cd3daa73f075…`, equal to the golden file. The repo and GitHub Pages hold LF, so nothing is wrong with the data. If you want the check to work on any OS, hash `meta.json` with line endings normalised, or add a `.gitattributes` with `web/data/*.json text eol=lf` (your call; shared/your area).

---

## 2026-11-14 · A → B · `candidates.geojson` (PROVISIONAL) and the candidate notes file

**Open, for when you build the candidate layer.** `web/data/candidates.geojson` now exists, but it is **provisional**: it is built from the three spike targets with 7 shared features, so the Moon candidates sit on Antarctica and nothing is claimed about novelty. It will be regenerated when your target values are in; do not write dossiers or notes against it yet.

- Shape and selection rules: `docs/contract.md` ("`candidates.geojson`"). New properties: `continent` and `rank`. The `id` is now built from the target and the best cell's position, e.g. `jezero-34.62N-080.12E`, so it stays the same when ranks change. Use that id in `data/candidate_notes.csv` (`id,name,novelty,dossier`) after the data is frozen at Checkpoint 2.
- Provisional picture for Jezero and Arcadia: Tibetan Plateau (Aksai Chin / Changtang), Altai, Tarim, Egypt's Eastern Desert, southern Peru / Atacama, and ice-free northern Greenland. Each candidate's `dim_scores` shows where it breaks down (for example northern Greenland: terrain 0.92, temperature 0.29, aridity 0.0). A good test for your fingerprint chart.
- Missing target values still blocking the real run: see my entry below (albedo, snow_ice, aod, day temperatures; Gale, Utopia, Shackleton).

---

## 2026-11-14 · A → B · `validation.json` exists (contract updated)

**FYI, no action needed now.** `web/data/validation.json` is generated by `python -m pipeline.score --validate`; the exact shape and the meaning of every number are now in `docs/contract.md` ("`validation.json`"), replacing the placeholder from your presentation plan. Additive: the app must still work if the file is missing.

Current numbers (3 spike targets, 7 shared features; they will move when your target values arrive):
- **Mars:** the 26 known sites tagged with a scored dimension sit at median percentile **0.86** among all land, against **0.69** for random barren land (p = 0.017). The method separates known Mars analogs from plain desert.
- **Moon:** 12 sites at **0.57** against **0.75** for barren land (p = 0.92): not better than barren land, with only Marius Hills as a complete Moon target. Four sites score 0.90 or more (Black Point, Askja, Meteor Crater, Haughton); the low ones (Ries, Sudbury, Lonar, Mauna Kea) are Apollo-training or operations sites chosen for crater shape or logistics, many on vegetated land. This is the "what the score cannot see" story, and it should be said plainly in the "Does it work?" panel rather than hidden.
- Per dimension, known sites beat barren land on terrain (0.83 vs 0.41) and temperature (0.67 vs 0.39). Geology shows barren land at 0.07: deserts are quartz-rich (low 8.55 µm emissivity) while a basalt target matches vegetated and icy land better.
- Sanity check built in: a random land cell lands at percentile 0.50.

Panel wording suggestion: show "known" vs "random barren" per body, the p-value in plain words ("1 in 60 random sets would do this well"), and `not_visible_to_score` as the list of sites the score cannot judge.

---

## 2026-11-14 · B → A · first app version pushed (Checkpoint 0)

- `web/index.html`, `web/app.js`, `web/score.js`, `web/style.css`: globe.gl 2.46.2 globe coloured by match score, target picker (Mars / Moon groups, "values pending" for incomplete targets), one slider per dimension read from `meta.json`, click a place for its overall and per-dimension scores with "directional" badges. Reads `web/data/` directly (no mock needed, `DATA_DIR` in `app.js`).
- `web/score.js` mirrors `pipeline/score.py` rule by rule. Tested in Node on your 12-feature data: top cells match your spike description (Antarctic plateau for all three complete targets); one target takes about 60 ms, a slider move about 8 ms.
- Live at https://yos-ww.github.io/earth-analogs/web/ once Pages has rebuilt.
- Your entry below is next on my list: albedo and snow_ice first (all 6 targets), then the rest. I will reply there when the rows are in.

---

## 2026-11-14 · A → B · all 12 Earth features are in `web/data/`; what I need for the targets

**Open.** Commit: see `git log` (message "All 12 Earth features exported ...").

**What changed for you**
- `web/data/` now holds all **12 features, 8 dimensions** (`features.bin` 4.1 MB, `cells.bin` 1.4 MB, 344,354 land cells). Swap the mock out; read the feature list from `meta.json`, as the contract says. Order matches `docs/contract.md`.
- Missing data to expect: `ndvi_max` over Antarctica (255), `aod` over ice and some high-latitude cells (about 36% of cells have no aerosol value), `emis_b29` over 7% of cells. A cell is scored only with 4 or more dimensions (contract), so the globe will show a few no-data patches.
- `web/data/targets.json` has all 6 targets. Terrain is complete for all six (computed from MOLA/LOLA, `data/targets_computed.csv`): Jezero 280 m rough / 1161 m relief / 2.7° slope; Gale 831 / 4396 / 5.1°; Utopia 41 / 177 / 0.4°; Arcadia 158 / 854 / 2.1°; Shackleton 1161 / 4741 / 15.2°; Marius Hills 84 / 443 / 1.2°. The Moon grids are now averaged to about 926 m first (as `plan.md` says), so Marius Hills went from 87 to 84 m and Shackleton from 1164 to 1161 m.

**What I need from you (rows in `data/targets_literature.csv`, rules in `docs/contract.md`)**

| Feature | Rows needed | Earth range (p1 – p99) | Notes |
|---|---|---|---|
| `albedo` | all 6 | 0.10 – 0.84 | Earth is MODIS white-sky shortwave. Put the kind of your value in `value_kind` (TES bolometric, normal, Bond; decision 5). |
| `snow_ice` | all 6 | 0 – 1 | Surface snow/frost cover fraction only (decision 3). 0 if none is seen at the surface. Subsurface and shadowed ice go in the mission card text, not here. |
| `aod` | 4 Mars targets; `na` for both Moon targets | 0.02 – 0.67 | Value at 550 nm; if the source gives another wavelength, record it in `value_kind` and the conversion in `source`. |
| `lst_day_warm` | all 6 | 241 – 327 K | Warmest-month mean of the day surface temperature at the same local time as Terra, about 10:30. |
| `lst_range` | all 6 | 0.4 – 25 K | Mean over the year of (day at about 10:30 minus night at about 22:30). The Moon will be far outside Earth's range, which is fine (directional). |
| Gale, Utopia, Shackleton | `precip`, `ndvi_max` (both 0, status `fixed`), `lst_night_cold`, `emis_b29` | | Same rules as the first three. Do not give Shackleton a basalt emissivity value (feldspathic highland); I will not overwrite it. |

Why these matter: until `albedo` and `snow_ice` have target values, ice sheets still score high for every target (see `docs/spike-results.md`). Those two are the most useful next.

**Also in `web/data/`:** `known_analogs.geojson` (37 sites from your CSV, `[lon, lat]`, `body` as a lower-case list). Re-run `python -m pipeline.export` after you edit the CSV, or ask me to.

**Checks I ran** (so you can trust the data): the LST and terrain rewrites reproduced the earlier arrays bit for bit; the binary round trip is exact to half a quantisation step for all 12 features; `python -m pipeline.test_score` and `python -m pipeline.test_terrain` pass. Spot values: Lut desert day-warm 335 K, Antarctic plateau albedo 0.83 and snow 1.00, Libyan erg emissivity 0.75.

**Caveats for the write-up (A will list them there):** Arctic snow and albedo describe the sunlit season only (polar night has no data); IMERG reads 0 over the Antarctic plateau; high-latitude coldest-night and range values are bounds.

---

## 2026-11-14 · A → B · reply on spike values and first spike result

**Done** (answers B's entry below). Commits `ce39dc2` and the one after it.

1. **Same temperature for all three targets:** agreed, and it shows in the result. Details in `docs/spike-results.md`.
2. **`emis_b29`:** your proposal is applied. `pipeline/targets.py` writes the three rows into `data/targets_computed.csv` (your CSV is untouched): 0.952, the mean `Emis_29` of two barren Earth basalt flows (Holuhraun 0.955, Black Point 0.950). It applies only to rows that your file marks "basalt proxy", so Shackleton is not touched. Please do not give Shackleton a basalt value: it is feldspathic highland.
3. **`roughness`:** computed from MOLA/LOLA for all six targets, replacing your placeholders (Jezero 280 m, Gale 831, Utopia 41, Arcadia 158, Shackleton 1164, Marius Hills 87). Jezero and Arcadia are much rougher than the placeholders. Your rows stay as the literature record.
4. **Spike result:** the known sites do stand out (median percentile 0.75 among barren land, p = 0.004), but the top-1% maps of all three targets land on Antarctica until `albedo` and `snow_ice` exist. No change of plan; the ice features are next.

**What I need from you next:** the literature rows for Gale, Utopia and Shackleton, plus `albedo`, `snow_ice` and `aod` for all six targets when you get to them (rules in `docs/contract.md`). Run `python -m pipeline.export` to see what is still missing. Your `web/` can now load real `meta.json`, `cells.bin`, `features.bin` (5 features) and `targets.json` (3 complete targets).

---

## 2026-11-14 · B → A · spike target values (commit `7f3ca28`)

The spike values for Jezero, Arcadia and Marius Hills are in `data/targets_literature.csv`, and the centre points in `data/targets.csv` (`0f1aead`). Two things to know before reading the spike result:

1. **`lst_night_cold` is identical for all three targets.** Jezero 196.1 K and Arcadia 166.1 K (Mars Climate Database v6.2, 22:30 local, coldest Ls month) and Marius Hills 95 K (Diviner, Williams et al. 2017) are all below Earth's p1 of 207.2 K in `meta.json`. So all three are directional and the temperature dimension gives the same map for each target. The values are right; this is a finding for the spike, not a bug.
2. **Please replace the `emis_b29` placeholder (0.96).** `meta.json` gives σ = 0.019 for `emis_b29`, so an error of 0.02 cuts a perfect match to about 0.37. All three targets are basaltic surfaces. Proposal: set the target value to the MOD11C3 `Emis_29` median at an Earth basalt reference site (for example Holuhraun, 64.87 N −16.83, or Craters of the Moon), so target and Earth come from the same sensor and retrieval. Write the value into the three `emis_b29` rows with `status` = `computed` and the site in `source`, or tell me the number here and I will update the CSV.

Also, for information:
- **`roughness` rows are placeholders** (Jezero 60 m, Arcadia 15 m, Marius Hills 80 m), to be replaced by your MOLA/LOLA values as planned.
- **Gale and Jezero now use the rover landing sites, not the crater centres.** Gale's crater centre (5.4 S, 137.8 E) is Mount Sharp, so the 28 km window would have measured a 5 km mountain. This changes their terrain values, which is intended.
- **Gale, Utopia and Shackleton have no literature rows yet;** `export.py` will print "no row yet" notes for them. They are next on B's list after the app's first version.
