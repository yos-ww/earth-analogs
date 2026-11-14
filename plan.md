# Plan: "Analog Atlas", a planetary-analog similarity search for Earth

## Context

Hackathon challenge (`challenge.md`): use open Earth, Moon and Mars data to find and characterize Earth analogs for Moon bases and Mars landing sites. The challenge says: (1) explain what matches, (2) where the analogy breaks down, and (3) how the site helps exploration. Look past known analogs (Atacama, Antarctica, Iceland, Hawaii) and use more than one dataset. "Surprise us."

- **Team:** 2 people, each with Claude Pro in a terminal.
- **Time:** about 25 h of wall-clock time.
- **Submission:** a write-up, a link to the code/data, and a demo of at most 7 slides or a 30-second video, in English.
- **Repo today:** `challenge.md` and `data-sources.md` (URLs for all resources), plus an empty `data/` folder. It is not a git repo yet.
- **Machine:** Apple Silicon, 24 GB RAM, about 387 GB free disk. Homebrew, git and gh are installed. Python is only 3.9; Node, GDAL and conda are not installed.

**Pitch (what wins):** most teams will pick one place and say it "looks like Mars". We instead build a **global, data-driven search engine**. It scores every land cell on Earth against real Moon and Mars landing-site profiles, one dimension at a time (terrain, temperature, aridity, albedo, ice, dust, vegetation). It shows *why* a place matches and *where it breaks down*. It is **validated**: known analogs rank high. It then surfaces **previously unrecognized** sites, which become 2–3 written deep dives.

Scope follows the agreed rule: a **core of about 17 h** that gives a complete demo, a go/no-go checkpoint, and everything else as ordered stretch tiers.

---

## Architecture

```
pipeline/ (Python)                          web/ (static, GitHub Pages)
 download/*.py  -> data/raw/  (gitignored)   index.html + app.js (3D globe: globe.gl / three.js via CDN)
 features.py    -> 0.25° land grid           loads web/data/*:
 targets.py     -> planetary profiles          features.bin  (Uint8, cells × N features)
 score.py       -> validation + candidates     meta.json     (feature names, scale min/max, grid)
 export.py      -> web/data/*                  targets.json  (per-target values + σ + "directional" flag)
                                               candidates.geojson, known_analogs.geojson
docs/ writeup.md, sites/*.md, slides/
```

- **Grid:** 0.25° global, land only. That is about 230k cells × 8 features as Uint8, about 2 MB, small enough for the browser to **re-score live** as weight sliders move.
- **3D globe (main view, decided):** a spinning globe built with the free `globe.gl` library (three.js), loaded from a CDN with no build step.
  - The score grid is painted into an offscreen equirectangular canvas (about 1440×720) that becomes the globe's surface texture, so the globe re-colors as the sliders move.
  - Candidate and known-analog sites are glowing points. Clicking one flies the camera there and opens the "what matches / where it breaks down" panel with its per-dimension bars.
  - An **Earth / Mars / Moon switch** shows the same globe for each world, using a color mosaic and MOLA / LOLA relief, with the landing-site targets marked.
  - A flat-map fallback (Leaflet) is used only if WebGL is unavailable, so B builds the globe first and the fallback last.
- **Scoring per dimension:** `s_i = exp(-((f_i - t_i)/σ_i)²)`, where σ_i is a robust Earth-wide spread (IQR/1.35). Overall score = weighted mean of the s_i. The per-dimension bars in the click popup are the "what matches / what breaks down" explanation.
- **Like-for-like vs. directional dimensions:**
  - Topography (relief, slope, roughness at a ~1 km baseline) and albedo are computed **the same way** on Earth, Moon and Mars.
  - Temperature, aridity and ice cannot be matched in absolute terms. For these, the target is set to Earth's 99th-percentile extreme, and the dimension is flagged *directional* in the UI. This honesty is itself a judging point.
- **Earth limits card on every target:** gravity, vacuum or thin CO₂ atmosphere, radiation. These are stated, not scored.

### Earth features (core: 7, each optional, so if one fails it is dropped)
| Feature | Dataset (source) | Notes |
|---|---|---|
| Relief + roughness (std of elevation), slope | GMTED2010 30″ mean elevation (USGS) | Roughness and slope computed from the elevation, the same way as MOLA/LOLA (the GMTED std file stops at 56°S, so it misses Antarctica) |
| Day LST max, diurnal range, annual min | MODIS MOD11C3 monthly 0.05° (Earthdata) | 2–3 years of monthly files |
| Vegetation (NDVI max) | MODIS MOD13C2 monthly 0.05° | Low = barren |
| Aridity (precip, mm/yr) | GPM IMERG Final monthly (Earthdata) | JAXA GSMaP is the stretch alternative |
| Albedo (white-sky shortwave) | MODIS MCD43C3 0.05° | Direct comparison to TES / LROC albedo |
| Snow/ice fraction | MODIS MOD10CM monthly | Ice analogs |
| Dust (AOD, Deep Blue) | MODIS MOD08_M3 1° | Aeolian analogs |

### Planetary targets (hand-curated `targets.json`, every value cites its source)
- **Mars:** Jezero Crater, Gale Crater, Arcadia Planitia (shallow-ice human landing candidate), Utopia Planitia.
  - Relief and roughness from MOLA MEGDR (PDS), resampled to 1 km.
  - Albedo (and thermal inertia, for display only) from TES global maps (PDS).
  - Temperatures from published rover / Mars Climate Database values.
- **Moon:** a south-pole ridge region (Shackleton–de Gerlache, Artemis III area), and a mare lava-tube / pit region (Marius Hills).
  - Topography from the LOLA polar and global LDEMs (PDS Geosciences LRO page).
  - Temperatures from Diviner (`pds-geosciences.wustl.edu/missions/lro/diviner.htm`).
  - Ice context from LEND and Mini-RF literature values.

### Validation + novelty (the scientific spine)
- `known_analogs.geojson` holds about 15 well-known sites: Atacama Yungay, McMurdo Dry Valleys, Haughton/Devon Island, Mauna Kea, Holuhraun, Rio Tinto, MDRS Utah, Svalbard Bockfjord, Pilbara, Lanzarote, Craters of the Moon, Meteor Crater, Death Valley, Qaidam Basin, Ibn Battuta.
- Report their score percentiles. Success means they sit in the top ~5%.
- **Candidates:** top cells clustered with `scipy.ndimage.label`, keeping only regions **more than 200 km from any known analog**. Rank them by score × **robustness**: the share of 500 random weight perturbations in which the region stays in the top 50.

---

## Roles and interface contract (agreed in hour 1, written into `CLAUDE.md`)

- **Person A (data and science):** downloads, `features.py`, `targets.py`, `score.py`, validation, candidate extraction.
- **Person B (app and story):** `web/` app built first against **mock data** in the contract format, then the deep-dive research, write-up, and slides.
- The contract is the `web/data/*` file formats above. B never waits on A.
- **B does not need the raw data** (15 GB) or the Python environment. B needs only Git, Claude Code, a browser (Chrome or Edge) and the three globe images; A hands over the small `web/data/*` files (a few MB) and, for the stretch terrain view, trimmed elevation tiles for the deep-dive sites.

**Claude Pro limits:** usage is a rolling 5-hour budget per person.
- Use Sonnet for routine coding, and keep Opus for scoring design and the write-up.
- Run `/clear` between tasks, and keep decisions in `CLAUDE.md` so sessions don't re-derive them.
- Run long downloads as plain background scripts, not through Claude.
- When a limit hits, switch to work that doesn't need Claude (downloads, reading, slides).

---

## Timeline (wall-clock hours; staggered sleep keeps one person working)

| Hours | Person A | Person B |
|---|---|---|
| 0–1 | **Together:** `git init` + GitHub repo; `CLAUDE.md` with contract and decisions. Accounts, environment and all 15 GB of data are already done in the pre-hackathon prep (`prep.md`). | same |
| 1–6 | GMTED mean elevation → relief, roughness, slope (computed from the 1 km elevation, since the GMTED roughness file has no data south of 56°S); MODIS/IMERG → 0.25° climatologies | `web/` skeleton: **3D globe** with score texture, weight sliders, target picker, Earth / Mars / Moon switch, click-to-fly with per-dimension bars, mock `features.bin` generator |
| 6–7 | **Checkpoint 1 (go/no-go):** real `features.bin` renders on the globe, and slider drags re-color it smoothly on a normal laptop. Drop any dataset not ready; if the globe is too slow, reduce texture size or fall back to the flat map. | |
| 7–11 | MOLA/LOLA roughness at the same baseline, TES albedo, Diviner temps → `targets.json`; `score.py` validation on known analogs; tune σ/weights until known sites rank high | Known-analog layer, candidate list panel, "directional" badges, Earth-limits card, About/method panel |
| 11–14 | Candidate extraction + robustness + novelty filter → `candidates.geojson` | *Sleep* |
| 14–17 | *Sleep* | Deep dives on the top 2–3 surprise sites: Worldview / Copernicus Sentinel-2 imagery, DEM hillshade, per-dimension data; dossiers in `docs/sites/*.md` (match / breaks down / exploration use) |
| 17–19 | **Checkpoint 2:** freeze the data. Write-up methods + validation sections; figures | Site pages in the app (fly-to + dossier panel); GitHub Pages deploy |
| 19–21 | Write-up finished (`docs/writeup.md`, also exported as PDF) | **7 slides** (below) |
| 21–22 | **Together:** end-to-end check on the live URL, proofread, submit early | |
| 22–25 | Buffer → stretch tiers | |

### The 7 slides
1. The hook: "Earth's next Mars analog isn't where you'd expect", with the spinning globe and the best surprise site image.
2. The problem: analogs are chosen by eye, and the known ones are over-studied.
3. Method: dimensions × Earth / Moon / Mars data, with the like-for-like vs. directional split.
4. Validation: known analogs rank in the top X%.
5. Discovery: map of unrecognized candidates, plus the robustness scores.
6. Deep dive: one site, covering what matches, where it breaks down, and how it helps exploration.
7. Try it: live app link and QR code; Earth's limits; next steps.

---

## Stretch tiers (in order, only after Checkpoint 2)
1. **Twin 3D terrain view for the deep-dive sites (about 2–3 h):** MapLibre GL with tilted 3D terrain, the Earth site next to its Mars or Moon match, both from the same elevation data the scores use. It shows the terrain match directly and is the best footage for the video. A exports trimmed elevation tiles for those sites, so B needs no raw data.
2. **30-second screen-capture video** of the live app (globe spin, slider drag, candidate fly-to, then the twin terrain view if built). Cheap and strong.
3. **Radar dimension at the deep-dive sites:** Sentinel-1 (Copernicus) or RCM/RADARSAT-1 backscatter vs. LRO Mini-RF. This is the one measurement type that exists on both bodies (see `data-sources.md`).
4. **Mineralogy:** ASTER GED emissivity mafic/silica index → a basalt-likeness feature vs. TES surface type.
5. **Reverse search:** click anywhere on the Mars (MOLA + TES) or Moon globe to get its Earth analogs.
6. Feature-space UMAP showing Earth cells and planetary targets together.
7. JAXA GSMaP / G-Portal snow products as multi-agency alternatives.

## Key risks and mitigations
- **HDF4 reading for MODIS:** use the conda-forge GDAL (Homebrew GDAL lacks HDF4); `pyhdf` is the fallback.
- **Download time and size:** limit to 2–3 years of monthly CMG files (about 5 GB total); start in hour 1.5.
- **Earthdata auth:** both create accounts before the clock starts if possible.
- **Planetary values taking too long:** fall back to cited literature values per target; the topography dimension stays computed.
- **Scope creep:** nothing from the stretch tiers starts before Checkpoint 2.
- **3D globe performance or WebGL support:** needs a recent laptop with hardware acceleration; test at Checkpoint 1, keep the texture at about 1440×720, and keep the flat-map fallback working.
- **Globe images:** get the Earth, Mars and Moon mosaics in the pre-hackathon prep (they are not in `data/raw/`).

## Verification
- `python pipeline/score.py --validate` prints known-analog percentiles; target is the median in the top 5%.
- Unit checks:
  - roughness computed identically on a synthetic DEM for Earth and Mars;
  - the feature range in `meta.json` matches the decoded `features.bin`.
- The app works from `python -m http.server` in `web/` and from the GitHub Pages URL. Moving sliders re-colors the globe in under 200 ms, the Earth / Mars / Moon switch works, and every candidate panel shows its per-dimension bars plus the directional flags. Also load it once with WebGL disabled to confirm the flat-map fallback.
- A dry-run submission at hour 21: the write-up link, repo link and slides all open in a private browser window.
