# Task split

Ordered by the timeline in `plan.md`. Tick a box in the same commit that finishes the task. Formats are in `docs/contract.md`; ownership rules are in `CLAUDE.md`.

## Already done

- [x] Repo on GitHub, both people have write access
- [x] Python env and 15 GB of raw data on A's machine, every dataset opened with GDAL
- [x] Known-analog list: `data/known_analogs.csv`, 37 sites (B)
- [x] List of target values to cite: `docs/target-values-needed.md` (B, reviewed by A)
- [x] `CLAUDE.md`, contract and this task split

## Hour 0: together

- [ ] Read `CLAUDE.md` and `docs/contract.md`; confirm or change the seven proposed defaults in `CLAUDE.md`
- [ ] **Make the repo public** (or host the app elsewhere). GitHub Pages does not work on a private repo on the free plan, and judges need to open the code link
- [ ] Download the three globe images (Earth Blue Marble, USGS Mars colour mosaic, LROC WAC Moon) into `web/img/`

## Person A: data and science

Hours 1–3
- [ ] `pipeline/features.py`: land mask, `cells.bin`, and two features (`roughness`, `ndvi_max`)
- [ ] `pipeline/export.py`: write `web/data/cells.bin`, `features.bin`, `meta.json` in the contract format
- [ ] **Checkpoint 0 (hour 3):** these two features render on B's globe

Hours 3–7
- [ ] Remaining 9 features, with the fixed 28 km terrain window
- [ ] `pipeline/score.py`: scoring with the missing-data and directional rules from the contract
- [ ] **Checkpoint 1 (hour 7):** all features exported; drop any dataset that is not ready

Hours 7–11
- [ ] `pipeline/targets.py`: MOLA and LOLA terrain, Diviner values; merge with `data/targets_literature.csv` into `web/data/targets.json`
- [ ] Export `known_analogs.geojson` from `data/known_analogs.csv`
- [ ] Validation: known analogs vs. random land and random barren land (`score.py --validate`)
- [ ] **Science check (hour 11):** do known analogs beat random barren land?

Hours 11–14
- [ ] Candidate extraction, robustness, 200 km novelty filter → `web/data/candidates.geojson`

Hours 17–21
- [ ] **Checkpoint 2 (hour 17):** freeze the data
- [ ] `docs/writeup.md`: methods and validation sections, figures, PDF export
- [ ] Unit checks listed under "Verification" in `plan.md`
- [ ] Small fixes from `docs/review-notes.md`: script the GMTED and PDS downloads

## Person B: app and story

Hours 1–3
- [ ] `web/mock/`: `cells.bin`, `features.bin`, `meta.json`, `targets.json` in the contract format
- [ ] `web/index.html` + `web/app.js`: globe with the score texture and one slider per dimension, on the mock data
- [ ] `data/targets_literature.csv`: the 30 values in `docs/target-values-needed.md`, plus placeholder terrain values and the Earth-limits values, each with a source
- [ ] One exact centre point for Arcadia Planitia and for the Shackleton–de Gerlache ridge
- [ ] Fill the two "authors TODO" references in `data/known_analogs.csv`
- [ ] Turn on GitHub Pages once the repo is public
- [ ] **Checkpoint 0 (hour 3):** the page is live and shows A's two real features

Hours 3–7
- [ ] Target picker, Earth / Mars / Moon switch
- [ ] Click-to-fly with per-dimension bars and "directional" badges
- [ ] **Checkpoint 1 (hour 7):** slider drags re-colour the globe smoothly; if not, fall back to the flat map

Hours 7–11
- [ ] Known-analog layer, candidate list panel, Earth-limits card, About/method panel

Hours 14–17
- [ ] Literature check on the top candidates; set `novelty`
- [ ] Deep dives on the top 2–3 sites → `docs/sites/*.md` (match / breaks down / exploration use)

Hours 17–21
- [ ] Site pages in the app (fly-to + dossier panel)
- [ ] Flat-map fallback
- [ ] 7 slides → `docs/slides/`

## Hours 21–22: together

- [ ] End-to-end check on the live URL
- [ ] Open the write-up, repo and slides links in a private browser window
- [ ] Proofread and submit early
