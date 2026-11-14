# Presentation plan: one 3D globe that shows everything, plus the written report

Status: **proposal by Person B, not yet agreed.** It builds on `plan.md`, `docs/contract.md` and `docs/tasks.md`; it changes the order of a few tasks and adds three small items, listed under "Changes to the existing plan".

## Goal

At the end of the hackathon we hand in two things that tell the same story:

1. **The globe** (live on GitHub Pages): a 3D interactive globe where a judge can see the whole project without reading anything else. The method, the results, the validation, the sites and the limits are all reachable from the globe.
2. **The document** (`docs/writeup.md`, exported to PDF): the written report, with the same sections and figures, for judges who read rather than click.

The 30-second video and the 7 slides are cut from the globe (screen capture), so they cost little extra.

## Is it possible in about 25 hours?

**Yes, with a fixed scope.** The pieces are known to work in a browser:

| Piece | Why it's feasible |
|---|---|
| 3D globe | `globe.gl` (three.js) from a CDN, no build step. Points, labels, rings and a custom surface texture are built in. |
| Live re-scoring | 300k cells × 11 features is about 3.3 M operations per slider move: tens of milliseconds in plain JavaScript. |
| Colouring the globe | Paint scores into a 1440×720 canvas, use it as a `THREE.CanvasTexture`, set `needsUpdate = true`. |
| Fly-to | `globe.pointOfView({ lat, lng, altitude }, ms)`. |
| Mars and Moon globes | Same globe with a different image (4k JPEG, a few MB each). |
| Reading the report in the app | Render the markdown dossiers with `marked` from a CDN. |

**The main risks** are time, not technology:
- Person B builds the whole app alone, with a Claude Pro usage limit. The scope below is ordered so the demo works at every checkpoint.
- The science result may be weak (top cells are just "deserts"). That is Person A's risk and is covered in `plan.md`. The globe works either way.
- Large images and WebGL on the judges' computers: test the live URL on a second, ordinary laptop at Checkpoint 1.

## What the globe shows

### Mission context: why a match matters

The target picker and the seven sliders stay as the main controls. What is added is an explanation, for every match, of **why it is important for a mission and how the place could be used**. This answers the challenge's third question ("how could studying or using your Earth analog help prepare for exploration") inside the app, not only in the report.

It has three parts, all hand-written text in the app (`web/missions.js`), so the contract does not change:

1. **Mission card per target** (shown in the Target panel). What is planned or happening there and what still has to be tested on Earth. Examples:
   - Jezero: Perseverance is caching samples for return; rover driving and sampling on delta and crater-floor terrain.
   - Arcadia Planitia: a candidate human landing site because of shallow ice; drilling and water extraction.
   - Shackleton–de Gerlache: the Artemis landing region; operations in extreme cold, low sun and long shadows.
2. **What each dimension is good for** (one sentence per dimension and body). Examples:

   | Dimension | Why a match matters |
   |---|---|
   | Terrain | Landing hazard tests, rover mobility, route planning, EVA walking |
   | Temperature | Testing equipment, batteries and materials in extreme cold or large day–night swings |
   | Aridity | Dry-limit-of-life studies; how organics are preserved; dust-dry soils |
   | Vegetation (barren) | Instruments see bare ground, as on Mars and the Moon; no false biology signal |
   | Albedo | Camera, navigation and thermal behaviour of a similar bright or dark surface |
   | Ice | Drilling, ice prospecting and water extraction (ISRU) |
   | Dust | Dust on solar panels, seals and optics; landing plume tests |

3. **"Why this place matters" in the Place, Candidate and Dossier panels.** Built automatically from the place's strongest dimensions plus the target's mission card. Example: *"Strong terrain and dust match with Jezero: a good place to test rover driving and dust protection for Perseverance-type missions. Weak on temperature: cold-related tests should be done elsewhere."* The weak dimensions are named too, so the text also says where the analogy breaks down.

- The deep-dive dossiers (`docs/sites/*.md`) expand this into a full "how it helps exploration" section.
- Cost: about 1–2 hours for Person B, mostly writing the text; it can be written before the hackathon because it is research, not code.

### Fingerprint chart

Every place gets a small seven-sided radar chart, one axis per dimension (terrain, temperature, vegetation, aridity, albedo, ice, dust).

- The **Earth place** is a filled shape of its dimension scores (0–1); the outer ring is a perfect match with the target.
- Axes with no data are drawn dashed; axes marked n/a for the target are greyed out; directional axes get a small arrow.
- One look shows what matches (long arms) and where the analogy breaks down (short arms).
- Drawn as inline SVG from the per-dimension scores the app already computes, so it needs no new data.
- Used in the Place, Candidate and Dossier panels, in the tour captions, and exported as images for the slides and the report.

### Views (top bar)

| View | Shows | Data |
|---|---|---|
| **Earth: match score** | Earth coloured by how well each place matches the chosen Mars or Moon target. Sliders re-colour it live. | `cells.bin`, `features.bin`, `meta.json`, `targets.json` |
| **Earth: one dimension** | The score for a single dimension (terrain, temperature, aridity, ...), to show *why* a region matches. | same |
| **Mars** / **Moon** | The planet itself, with its landing-site targets marked. Clicking a target selects it for the Earth view. | globe images, `targets.json` |

### Layers (toggle on and off)

- Known analog sites (37–40 points, coloured by Moon or Mars).
- Our candidate sites (glowing points, sized by robustness).
- Deep-dive sites (2–3, highlighted).

### Panels (side panel, opened by clicking)

| Panel | Contents |
|---|---|
| **Target** | The chosen Mars or Moon site: its values, sources, and its Earth-limits card (gravity, pressure, radiation). |
| **Place** | Click any spot on Earth: overall score, its fingerprint chart, a bar per dimension, "directional" badges, and the nearest known analog. |
| **Candidate** | Fingerprint and bars, plus robustness, distance to the nearest known analog, novelty label, and a link to its dossier. |
| **Dossier** | The deep-dive site page (`docs/sites/*.md`) with its fingerprint at the top: what matches, where it breaks down, how it helps exploration, images. |
| **How it works** | The method in plain words, the data sources, Earth's limits. |
| **Does it work?** | Validation: known analogs vs. random land and random barren land, per target and per dimension. |

### Tour mode (the presentation)

A "Play tour" button runs a scripted sequence of about 8 steps. Each step flies the camera, switches view or layer, and shows a short caption:

1. Spinning Earth: "Where on Earth is most like Mars?"
2. Switch to Mars, show Jezero; switch back to Earth, which colours by match.
3. Drag a slider (scripted): the map changes, "each dimension can be weighed", and the panel says why that dimension matters for the mission.
4. Show the known analogs: "the famous sites score high, so the method works" (validation number).
5. Show the candidates: "and here are places nobody has studied".
6. Fly to deep-dive site 1, show its fingerprint and "why this place matters", open its dossier: what matches, what breaks down, and what a mission team could test there.
7. Same for the Moon target.
8. Earth's limits and the link to the report.

The tour is the live demo, the source of the 30-second video (screen capture), and the outline of the 7 slides. It is a list of steps in `web/tour.js`, so the story can be changed without touching the app.

## The document

`docs/writeup.md`, exported to PDF. The same sections as the globe's panels, so the two never disagree:

| Section | Writer | Source |
|---|---|---|
| Summary (half a page) | B | The tour captions |
| The problem and our idea | B | `challenge.md`, `plan.md` pitch |
| Data | A | `plan.md` feature table, `data-sources.md` |
| Method: features, scoring, like-for-like vs. directional | A | `docs/contract.md` |
| Validation | A | `score.py --validate` output, figures |
| Results: candidate map and ranking | A | `candidates.geojson`, a globe screenshot |
| Deep-dive sites (2–3) | B | `docs/sites/*.md` |
| What the score cannot see, and Earth's limits | both | `plan.md`, review notes |
| How to use it and next steps | B | the app, stretch tiers |
| References | both | `data/known_analogs.csv`, `data/targets_literature.csv` |

## Who does what, by hour

Times follow `plan.md` and `docs/tasks.md`. Items that are new or moved are marked **(new)** or **(moved)**.

### Hour 0: together
- Confirm the 7 defaults in `CLAUDE.md`, this plan, and the contract additions below.
- Make the repo public; turn on GitHub Pages.
- Download the three globe images into `web/img/` at 4k (keeps loading fast).

### Hours 1–3
| Person A | Person B |
|---|---|
| Land mask, `cells.bin`, two features, export in contract format | `web/mock/*`; globe with score texture and sliders on mock data; `data/targets_literature.csv` |
| **Checkpoint 0:** A's two real features render on B's globe, live on GitHub Pages | |

### Hours 3–7
| Person A | Person B |
|---|---|
| Remaining 9 features; `score.py` | Target picker and sliders; Earth / Mars / Moon views; click any place → Place panel with **fingerprint chart (new, ~1–2 h)**, dimension bars, badges and **"why this place matters" text (new, ~1 h)**; **one-dimension view (new)** |
| **Checkpoint 1:** all features render; sliders re-colour smoothly; tested on a second laptop | |

### Hours 7–11
| Person A | Person B |
|---|---|
| Terrain for targets, `targets.json`; validation; **`validation.json` (new)** | Known-analog layer; Target panel with Earth-limits card; How-it-works panel; **Does-it-work panel (new)** reading `validation.json` |
| **Science check** (hour 11) | |

### Hours 11–14: B sleeps
| Person A | Person B |
|---|---|
| Candidates, robustness, novelty filter → `candidates.geojson` | sleep |

### Hours 14–17: A sleeps
| Person A | Person B |
|---|---|
| sleep | Candidate layer and Candidate panel; literature check on top candidates; dossiers for 2–3 sites in `docs/sites/` |

### Hours 17–21
| Person A | Person B |
|---|---|
| **Checkpoint 2:** freeze data. Write-up: data, method, validation, results sections; figures | Dossier panel in the app; **Tour mode (new)**; write-up: summary, problem, sites, use sections |
| Write-up finished, exported to PDF | Record the 30-second video from the tour; 7 slides from the tour steps |

### Hours 21–22: together
- End-to-end check on the live URL from a private window and from a second laptop.
- Proofread the write-up; check every link; submit early.

### Hours 22–25: buffer, then stretch
In order: flat-map fallback **(moved, was core)**; reverse search (click Mars → Earth matches); side-by-side 3D terrain for deep-dive sites; the other stretch tiers from `plan.md`.

## Changes to the existing plan (need A's agreement)

1. **Contract addition: `web/data/validation.json`** (written by A's `score.py --validate`), so the app can show the validation. Proposed shape:
   ```json
   { "targets": { "jezero": {
       "known_percentile_median": 0.91,
       "random_land_median": 0.50,
       "random_barren_median": 0.72,
       "per_dimension": { "terrain": { "known": 0.8, "barren": 0.6 } } } } }
   ```
   Numbers are placeholders. If A prefers, B can show a static figure from the write-up instead.
2. **Tour mode added** in hours 17–21. It replaces separate slide-making work, because the slides and the video are taken from it.
3. **Flat-map fallback moved to stretch.** All current browsers run WebGL; the live URL is tested on a second laptop at Checkpoint 1 instead. If that test fails, the fallback comes back into the core.
4. **Mission context and fingerprint charts added.** The sliders stay as the main control; each match explains why it matters for a mission, and each place gets a fingerprint chart. Both are app-only (Person B): no contract change and no work for Person A.

## What we cut, in order, if we fall behind

1. Tour captions become plain slides (keep the camera moves).
2. One-dimension view.
3. "Why this place matters" shows only the target's mission card, not the generated sentence. Keep the fingerprint: it carries "where the analogy breaks down".
4. Does-it-work panel becomes a static image.
5. Moon targets in the app (keep Mars only).
6. Last resort: the globe shows the score and the candidates only; everything else lives in the write-up.

## Done means

- The live URL opens on an ordinary laptop in under 10 seconds, and every view, layer and panel above works.
- The tour runs from start to end without errors.
- `docs/writeup.md` and its PDF cover every section in the table above, and agree with the app.
- The video (30 s) or the 7 slides exist, and every link in the submission opens from a private window.
