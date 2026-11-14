# Plan: "Analog Atlas", a planetary-analog similarity search for Earth

## Context

Hackathon challenge (`challenge.md`): use open Earth, Moon and Mars data to find and characterize Earth analogs for Moon bases and Mars landing sites. The challenge says: (1) explain what matches, (2) where the analogy breaks down, and (3) how the site helps exploration. Look past known analogs (Atacama, Antarctica, Iceland, Hawaii) and use more than one dataset. "Surprise us."

- **Team:** 2 people, each with Claude Pro in a terminal.
- **Time:** about 25 h of wall-clock time.
- **Submission:** a write-up, a link to the code/data, and a demo of at most 7 slides or a 30-second video, in English.
- **Repo today:** git repo on `main` with a GitHub remote (`origin`). Besides this plan it holds the working agreement (`CLAUDE.md`), the file-format contract (`docs/contract.md`), the task split (`docs/tasks.md`) and the known-analog list (`data/known_analogs.csv`). No project code yet.
- **Data:** all 15 GB is in `data/raw/` (gitignored) and every dataset was opened with GDAL on 2026-11-14. Exact contents and quirks are in "Data on disk" below.
- **Machine (Person A):** Apple Silicon, 24 GB RAM. Python env is micromamba `analogs` (py3.12, conda-forge GDAL with HDF4/HDF5/netCDF/PDS); binaries are in `~/mamba/envs/analogs/bin/`.

**Pitch (what wins):** most teams will pick one place and say it "looks like Mars". We instead build a **global, data-driven search engine**. It scores every land cell on Earth against real Moon and Mars landing-site profiles, one dimension at a time (terrain, temperature, aridity, albedo, ice, dust, vegetation). It shows *why* a place matches and *where it breaks down*. It is **validated** against known analogs and against a "just pick barren land" baseline. It then surfaces **under-studied** sites, which become 2–3 written deep dives.

Scope follows the agreed rule: a **core that gives a complete demo by hour 17** (Checkpoint 2), then write-up and slides, with everything else as ordered stretch tiers.

---

## Architecture

```
pipeline/ (Python)                          web/ (static, GitHub Pages)
 features.py    -> 0.25° land grid           index.html + app.js (3D globe: globe.gl / three.js via CDN)
 targets.py     -> planetary profiles        loads web/data/*:
 score.py       -> validation + candidates     cells.bin     (Uint32, one flat grid index per land cell)
 export.py      -> web/data/*                  features.bin  (Uint8, cells × 11 features, 255 = no data)
                                               meta.json     (grid, feature names, dimension of each feature,
                                                              transform + min/max, σ, Earth p1/p99)
                                               targets.json  (per target: values, sources, default weights,
                                                              "directional" and "n/a" flags)
                                               candidates.geojson, known_analogs.geojson
docs/ writeup.md, sites/*.md, slides/
```

- **Grid:** 0.25° global (1440 × 720), land only, about 300k cells. `cells.bin` gives each land cell's index `row*1440 + col` (row 0 = 90°N, col 0 = 180°W). 11 features as Uint8 is about 3.5 MB, small enough for the browser to **re-score live**.
- **Features vs. dimensions:** there are **11 features in 7 dimensions** (table below). The app has one weight slider per *dimension*; features inside a dimension are averaged first. This stops terrain and temperature (3 features each) from counting three times.
- **Scoring per feature:** `s = exp(-((f - t)/σ)²)`, where σ is a robust Earth-wide spread (IQR/1.35, with a floor so features that are mostly zero, like snow, don't get σ = 0). Overall score = weighted mean of the dimension scores.
  - **Missing data:** a feature with no data in a cell (255) is skipped and the weights are renormalized. A cell needs at least 4 dimensions to be scored. Dust has no values over ice sheets and NDVI/LST have polar gaps, so this matters.
  - **Skewed features** (precipitation, relief, roughness, slope) are log-scaled before the Uint8 step; `meta.json` records the transform.
  - **Speed:** when the target changes, compute the 11 per-feature scores once and cache them; a slider move is then just a weighted sum over 300k cells.
- **Like-for-like vs. directional (decided per target and per feature, by a rule):**
  - If the target value lies inside Earth's p1–p99 range, the feature is **like-for-like** and scored as above. Terrain and albedo are always in this group, and some temperatures are too (a Jezero summer afternoon is within Earth's range).
  - If the target lies outside that range (Mars night cold, lunar noon heat, zero rainfall), it is clamped to the nearest end (p1 or p99), scored **one-sided** (anything at or beyond the clamp scores 1), and flagged **directional** in the UI: "Earth can only point in this direction."
  - A feature that has no meaning for a target is **n/a** with weight 0, for example dust (aerosol) for the Moon.
- **Same physical scale on all three bodies:** terrain is computed from elevation samples about 1 km apart inside a window about 28 km wide (one Earth cell at the equator). GMTED 30″ is 0.93 km and MOLA 64 px/deg is 0.93 km, so both are used as they are. LOLA 64 px/deg is 0.47 km and the polar LOLA grid is 240 m, so both are averaged to about 1 km first. Slope uses metres on the ground (east–west spacing scaled by cos latitude).
- **Area weighting:** every percentile, the validation, and the candidate ranking weight cells by cos(latitude). Without this the 0.25° grid over-counts the Arctic and Antarctica.
- **3D globe (main view, decided):** a spinning globe built with the free `globe.gl` library (three.js), loaded from a CDN with no build step.
  - The score grid is painted into an offscreen equirectangular canvas (1440×720) that becomes the globe's surface texture, so the globe re-colors as the sliders move.
  - Candidate and known-analog sites are glowing points. Clicking one flies the camera there and opens the "what matches / where it breaks down" panel with its per-dimension bars.
  - An **Earth / Mars / Moon switch** shows the same globe for each world, using a color mosaic, with the landing-site targets marked.
  - A flat-map fallback (Leaflet) is used only if WebGL is unavailable, so B builds the globe first and the fallback last.
- **Earth limits card on every target:** gravity, vacuum or thin CO₂ atmosphere, radiation. These are stated, not scored.

### Earth features (11 features in 7 dimensions; each is optional, so if one fails it is dropped)
| Dimension | Features | Dataset on disk | Notes |
|---|---|---|---|
| Terrain | Relief (max − min), roughness (std of elevation), mean slope | GMTED2010 30″ mean elevation (`mn30_grd.zip`, an Esri grid; unzip first) | Do not use `sd30`: it stops at 56°S |
| Temperature | Warmest-month day LST, coldest-month night LST, mean day − night range | MOD11C3, 36 months (2021–2023) | These are monthly means, not single-day extremes; planetary values must be picked the same way |
| Vegetation | Yearly max NDVI | MOD13C2, 24 months (2022–2023) | Low = barren |
| Aridity | Mean precipitation, mm/yr | IMERG V07 monthly, 36 months | Array is stored lon × lat (3600 × 1800); transpose it. Unit is mm/h |
| Albedo | White-sky shortwave albedo, median of valid months | MCD43C3, the 15th of each month in 2023 | Median limits the effect of seasonal snow |
| Ice | Mean snow/ice cover fraction | MOD10CM, 35 months (October 2022 is missing; fine for a mean) | |
| Dust | Deep Blue AOD at 550 nm over land (`Deep_Blue_Aerosol_Optical_Depth_550_Land_Mean_Mean`) | MOD08_M3, 12 months of 2023, 1° | No data over snow and ice |

### Planetary targets (hand-curated `targets.json`, every value cites its source)
- **Mars:** Jezero Crater, Gale Crater, Arcadia Planitia (shallow-ice human landing candidate), Utopia Planitia (Zhurong site).
  - Terrain computed from MOLA MEGDR (`megt*`, on disk).
  - Albedo: **cited literature values per site.** There is no Mars albedo map on disk (the TES volume holds thermal inertia only). TES thermal inertia is shown in the panel but not scored, since Earth has no matching global map.
  - Temperatures, dust opacity and ice from published rover / Mars Climate Database / orbital-radar values.
- **Moon:** a south-pole ridge region (Shackleton–de Gerlache, Artemis III area), and a mare region with a lava-tube pit (Marius Hills).
  - Terrain computed from LOLA: `ldem_75s_240m` for the pole, `ldem_64` for Marius Hills.
  - South-pole temperatures and ice from the Diviner polar table on disk (`dlre_prp_south.tab`: 2.88 million rows south of about 76°S with `temp_avg`, `temp_max`, `ice_depth`). It is a table, not a raster, so select rows by lat/lon. It has no minimum temperature; cite that from the literature.
  - Marius Hills temperatures and both Moon albedos from cited literature values.
  - The lava tube itself is not scored (no feature sees underground). It is covered in the dossier text.
- A **first version of `targets.json` with literature values only** is written by B in hours 1–3, so the app and the scoring run on real targets from the start. A later replaces the terrain numbers with computed ones.

### Validation + novelty (the scientific spine)
- `known_analogs.geojson` (exported from `data/known_analogs.csv`, 37 sites so far) holds **about 40 published analog sites**, each tagged with the body (Mars or Moon) and the dimension it is known for. Start from: Atacama Yungay, McMurdo Dry Valleys, Haughton/Devon Island, Mauna Kea, Holuhraun, Rio Tinto, MDRS Utah, Svalbard Bockfjord, Pilbara, Lanzarote, Craters of the Moon, Meteor Crater, Death Valley, Qaidam Basin, Ibn Battuta; add others from the literature (for example Namib, Mojave, Dhofar, Danakil, Tibet, Ladakh, Lake Tyrrell, Arkaroola, Kilbourne Hole, Askja).
- **What we report (no pass/fail on a fixed number):**
  - The area-weighted percentile of each known site, for its best-matching target, next to two baselines: random land cells, and random **barren** cells (max NDVI < 0.15). The claim to support is "known analogs score clearly above random barren land", which shows the score does more than find deserts.
  - The same per dimension. Sites picked for mineralogy or biology (Rio Tinto, Pilbara) are expected to score low; the write-up says so, as proof of what the score cannot see.
- **No tuning to the answer:** σ comes from the data rule above and default weights are equal. If weights are adjusted, it is done on half of the known sites and reported on the other half.
- **Candidates, per target:** take the top 1% of cells by area, group them with `scipy.ndimage.label`, and keep regions **more than 200 km from every known analog**. Rank by score × **robustness** (the share of 500 random weight changes in which the region stays in the top 50). Keep at most 3 regions per continent per target, so the list is not all Sahara or all Antarctica. Permanent ice-sheet cells (snow/ice fraction ≈ 1 all year) are left out of candidates for the rocky Mars targets.
- **Novelty is checked by a person, not only by distance:** before a candidate becomes a deep dive, B searches the literature for "<place> Mars analog" / "lunar analog". The app and write-up call candidates "under-studied", and "unrecognized" only when that search finds nothing.

---

## Roles and interface contract (written into `CLAUDE.md` and `docs/contract.md`)

- **Person A (data and science):** `features.py`, `targets.py`, `score.py`, validation, candidate extraction.
- **Person B (app and story):** `web/` app built first against **mock data** in the contract format, the literature `targets.json` and known-analog list, then the deep-dive research, write-up, and slides.
- The contract is the `web/data/*` file formats above. B never waits on A.
- **B does not need the raw data** (15 GB) or the Python environment. B needs only Git, Claude Code, a browser (Chrome or Edge) and the three globe images; A hands over the small `web/data/*` files (a few MB) and, for the stretch terrain view, trimmed elevation tiles for the deep-dive sites.

**Claude Pro limits:** usage is a rolling 5-hour budget per person.
- Use Sonnet for routine coding, and keep the strongest model for scoring design and the write-up.
- Run `/clear` between tasks, and keep decisions in `CLAUDE.md` so sessions don't re-derive them.
- Run long processing jobs as plain background scripts, not through Claude.
- When a limit hits, switch to work that doesn't need Claude (reading, site research, slides).

---

## Timeline (wall-clock hours; staggered sleep keeps one person working)

| Hours | Person A | Person B |
|---|---|---|
| 0–1 | **Together:** confirm the proposed defaults in `CLAUDE.md` and the formats in `docs/contract.md`; make the repo public so GitHub Pages works; 5-minute data check from `prep.md` §5; download the three globe images if not done. | same |
| 1–3 | **Thin slice first:** land mask + `cells.bin` + two features (terrain roughness, NDVI) exported in the contract format | Globe with score texture and sliders on mock data; literature target values (`data/targets_literature.csv`); finish the known-analog list |
| 3 | **Checkpoint 0:** A's two real features render on B's globe, and the page is live on GitHub Pages. | |
| 3–7 | Remaining 9 features → full `features.bin`; first `score.py` with the missing-data and directional rules | Target picker, Earth / Mars / Moon switch, click-to-fly with per-dimension bars, "directional" badges |
| 7 | **Checkpoint 1 (go/no-go):** all features render, and slider drags re-color the globe smoothly on a normal laptop. Drop any dataset not ready; if the globe is too slow, fall back to the flat map. | |
| 7–11 | MOLA/LOLA terrain and Diviner values → final `targets.json`; validation against known analogs and the two baselines | Known-analog layer, candidate list panel, Earth-limits card, About/method panel |
| 11 | **Science check:** do known analogs beat random barren land? If not, see "result is weak" under risks. | |
| 11–14 | Candidate extraction + robustness + novelty filter → `candidates.geojson` | *Sleep* |
| 14–17 | *Sleep* | Literature check, then deep dives on the top 2–3 sites: Worldview / Copernicus Sentinel-2 imagery, 1 km hillshade, per-dimension data; dossiers in `docs/sites/*.md` (match / breaks down / exploration use) |
| 17–19 | **Checkpoint 2:** freeze the data; the demo is complete. Write-up methods + validation sections; figures | Site pages in the app (fly-to + dossier panel) |
| 19–21 | Write-up finished (`docs/writeup.md`, also exported as PDF) | **7 slides** (below) |
| 21–22 | **Together:** end-to-end check on the live URL, proofread, submit early | |
| 22–25 | Buffer → stretch tiers | |

### The 7 slides
1. The hook: "Earth's next Mars analog isn't where you'd expect", with the spinning globe and the best surprise site image.
2. The problem: analogs are chosen by eye, and the known ones are over-studied.
3. Method: dimensions × Earth / Moon / Mars data, with the like-for-like vs. directional split.
4. Validation: known analogs vs. random barren land, and the dimensions the score cannot see.
5. Discovery: map of under-studied candidates, plus the robustness scores.
6. Deep dive: one site, covering what matches, where it breaks down, and how it helps exploration.
7. Try it: live app link and QR code; Earth's limits; next steps.

---

## Stretch tiers (in order, only after Checkpoint 2)
1. **30-second screen-capture video** of the live app (globe spin, slider drag, candidate fly-to). About 30 minutes of work and a strong demo.
2. **Twin 3D terrain view for the deep-dive sites (about 2–3 h):** MapLibre GL with tilted 3D terrain, the Earth site next to its Mars or Moon match, both from the same elevation data the scores use. A exports trimmed elevation tiles for those sites, so B needs no raw data.
3. **Mars albedo map:** download the USGS TES albedo mosaic and replace the per-site literature albedo with computed values.
4. **Radar dimension at the deep-dive sites:** Sentinel-1 (Copernicus) or RCM/RADARSAT-1 backscatter vs. LRO Mini-RF. This is the one measurement type that exists on both bodies (see `data-sources.md`).
5. **Mineralogy:** ASTER GED emissivity mafic/silica index → a basalt-likeness feature vs. TES surface type.
6. **Reverse search:** click anywhere on the Mars or Moon globe to get its Earth analogs.
7. Feature-space UMAP showing Earth cells and planetary targets together.
8. JAXA GSMaP / G-Portal snow products as multi-agency alternatives.

## Key risks and mitigations
- **The result is weak or obvious** (top cells are just Sahara and Antarctica, or known analogs don't beat barren land): this is the main risk. Mitigations, in order: rank per target rather than one global score; the per-continent cap; lean on the like-for-like dimensions (terrain, albedo), which separate deserts from each other. If it still fails at the hour-11 check, change the story, not the tool: "a quantitative audit of the famous analogs: which dimensions each one really matches, and better-matching neighbours for each". The app, dossiers and slides stay the same.
- **Over-claiming novelty:** a site 200 km from our list can still be published. The literature check in hours 14–17 is required before the word "unrecognized" is used.
- **File-format surprises:** all datasets opened with GDAL on 2026-11-14. Known quirks are listed in "Data on disk". `pyhdf` is the fallback reader for MODIS.
- **Planetary values taking too long:** the literature `targets.json` from hours 1–3 is already a working fallback; only terrain needs computing.
- **Scope creep:** nothing from the stretch tiers starts before Checkpoint 2.
- **3D globe performance or WebGL support:** test at Checkpoints 0 and 1, keep the texture at 1440×720, and keep the flat-map fallback working.
- **Late deploy problems:** GitHub Pages goes live at Checkpoint 0, not at the end.

## Data on disk (`data/raw/`, checked 2026-11-14)
| Folder | Contents | Quirk |
|---|---|---|
| `MOD11C3` | 36 monthly files, 2021–2023 | HDF4 |
| `MOD13C2` | 24 monthly files, 2022–2023 | HDF4 |
| `MCD43C3` | 12 daily files (15th of each month, 2023) | HDF4; polar-night fill values |
| `MOD10CM` | 35 monthly files, 2021–2023 | October 2022 missing |
| `MOD08_M3` | 12 monthly files, 2023 (4.3 GB) | Hundreds of layers per file; read only the Deep Blue 550 nm land mean |
| `IMERG` | 36 monthly files, 2021–2023 | HDF5, `/Grid/precipitation`, lon × lat order, mm/h |
| `gmted` | `mn30_grd.zip`, `sd30_grd.zip` | Esri grid inside the zip; `sd30` unused |
| `mola` | 4 `megt*` tiles, 64 px/deg (926 m) | Open the `.lbl` with GDAL |
| `lola` | `ldem_64`, `ldem_75s_240m`, `ldem_80s_80m` | Height = value × 0.5 m (relative to 1737.4 km) |
| `tes` | Thermal inertia maps (day/night, 2007) | No albedo |
| `diviner` | `dlre_prp_south.tab`, 2.88 M rows | Table; columns `tri_clon`, `tri_clat`, `temp_avg`, `temp_max`, `ice_depth` (−999 = none) |

## Verification
- `python pipeline/score.py --validate` prints, per target, the known-analog percentiles next to the random-land and random-barren baselines.
- Unit checks:
  - roughness and slope computed identically on a synthetic DEM for Earth, Mars and Moon inputs;
  - the feature range in `meta.json` matches the decoded `features.bin`, and `cells.bin` has the same number of cells;
  - a cell with missing features gets the same score in Python and in the browser.
- The app works from `python -m http.server` in `web/` and from the GitHub Pages URL. Moving sliders re-colors the globe in under 200 ms, the Earth / Mars / Moon switch works, and every candidate panel shows its per-dimension bars plus the directional flags. Also load it once with WebGL disabled to confirm the flat-map fallback.
- A dry-run submission at hour 21: the write-up link, repo link and slides all open in a private browser window.
