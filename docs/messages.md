# Messages between Person A and Person B

Both of us work through Claude Code, so notes that need the other person's attention go here instead of chat. Newest first. Add an entry with the date, sender and the commits it refers to; mark an entry **Done** (or reply under it) when it has been handled.

Claude Code sessions: read this file after every `git pull`, together with `CLAUDE.md`.

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
