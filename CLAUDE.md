# Analog Atlas: working agreement

Two-person hackathon project. Read this first in every session; it replaces re-deriving decisions.

- What we are building and why: `plan.md`
- File formats both sides code against: `docs/contract.md`
- Who does what, in order: `docs/tasks.md`
- The challenge text: `challenge.md`

## Roles

| | Person A (`yos-ww`) | Person B (`birbaskagezgin`) |
|---|---|---|
| Area | Data and science | App and story |
| Owns | `pipeline/`, `setup/`, `web/data/` (generated), `docs/writeup.md` | `web/` except `web/data/`, `web/mock/`, `data/known_analogs.csv`, `data/targets_literature.csv`, `docs/sites/`, `docs/slides/` |
| Needs | 15 GB in `data/raw/`, micromamba env `analogs` | Git, a browser, Claude Code. No raw data, no Python env |

Shared files (`CLAUDE.md`, `plan.md`, `docs/contract.md`, `docs/tasks.md`, `README.md`): say so in chat before editing, then commit and push straight away.

## Rules that keep us unblocked

1. **The contract is the interface.** A writes `web/data/*`; B reads it. B builds against `web/mock/*` in the same format and never waits on A. The app picks the folder from one constant (`DATA_DIR` in `web/app.js`).
2. **Stay in your own folders.** If you need a change in the other person's area, ask them; do not edit it.
3. **Changing the contract** means editing `docs/contract.md` in the same commit as the code change, and telling the other person.
4. **`web/data/` is generated.** Never edit it by hand. It is committed (a few MB) so GitHub Pages can serve it.
5. **`data/raw/` is never committed** (15 GB, gitignored).

## Git

- Work on `main`. Commit small and often. Always `git pull --rebase` before `git push`.
- Because each person stays in their own folders, conflicts should only happen in shared files.
- No force-push.

## Decisions already made (do not reopen)

- 0.25° global land grid, 12 features in 8 dimensions, one slider per dimension. The eighth, geology, is 8.55 µm emissivity (`Emis_29` in the MOD11C3 files already on disk).
- Score: `exp(-((f - t)/σ)²)` per feature, mean within a dimension, weighted mean across dimensions. Exact rules in `docs/contract.md`.
- Every feature is scored like-for-like; a target value beyond Earth's min–max is only labelled "beyond Earth" and scores low everywhere (contract version 2). This replaced the one-sided p1–p99 rule on 2026-11-15, agreed by both, because it gave false 100s. Old and new numbers: `docs/writeup.md`, "Choices, and when they were made", item 5.
- 3D globe (`globe.gl` from a CDN, no build step) is the main view; the Leaflet flat map is a stretch fallback (see the presentation-plan decision below).
- Area weighting by cos(latitude) for every percentile, validation and ranking.
- No tuning to the answer: σ from the data rule, equal default weights.
- A science spike at hour 4 tests the result on five quick features before the full pipeline is built (`plan.md` timeline).
- Nothing from the stretch tiers starts before Checkpoint 2.
- Sliders stay the main control (no weight presets). Mission context only explains why a match matters and how the place could be used: a mission card per target, one sentence per dimension, and a "why this place matters" line, all text in `web/missions.js`, not in the contract.
- Every place gets a fingerprint radar chart: one axis per dimension from `meta.json`, unweighted dimension scores, target = outer ring.

- The famous analog sites (`data/known_analogs.csv`) exist to **validate** that the method works: if the score is sound, those sites should rank clearly above random barren land. They are the test, not the product. The discoveries are the under-studied candidates, and the 200 km filter only keeps known sites from being listed as discoveries.
- The four proposals in `docs/presentation-plan.md` are accepted: optional `validation.json`, tour mode, flat-map fallback moved to stretch (re-promoted to core only if the second-laptop WebGL test at Checkpoint 1 fails), and a one-dimension view.

## Decisions from the review (`docs/review-notes.md`), confirmed

Both people confirmed these (2026-11-14). Code to them; they are not open.

| # | Question | Default | Owner |
|---|---|---|---|
| 1 | Validation baseline bias | Score each known site against the targets of its own body only, taking the best. Baseline cells take the best of the same set of targets | A |
| 2 | Terrain window shrinks with latitude | Fixed window of about 28 × 28 km on the ground for every Earth cell | A |
| 3 | Ice compares different things | Name the dimension "Surface snow/ice". No permafrost layer in the core. The write-up and the panel state that Arcadia's ice is below the surface and lunar ice is in shadowed craters | both |
| 4 | Day temperature time of day | Keep MOD11C3 (about 10:30 local time). Pick Mars and Moon day values at about the same local time and record it | B |
| 5 | Albedo definitions differ | Record the kind of each value in `data/targets_literature.csv` (`value_kind`) | B |
| 6 | Polar LOLA grid | Compute slope from projected x/y metres. Read scale and offset from the `.lbl` | A |
| 7 | Targets need one exact point | B picks and cites one centre point for Arcadia Planitia and for the Shackleton–de Gerlache ridge | B |

## Decisions from the rubric review (2026-11-14, both agreed)

Judged on Impact, Creativity, Validity, Relevance, Presentation (1–5 each); the gap is Presentation and Impact, not science. Details and B's prioritised list: `docs/messages.md` (entry "review against the judging rubric").

- **Data frozen at about 17:30 on 2026-11-14** (Checkpoint 2 brought forward), **then regenerated once on 2026-11-15** for the scoring change above (54 candidates), then **again for dust on bare ground only and finds on bare ground only** (36 candidates; every site's #1 find unchanged), then robustness measured as the top 38% of a target's regions instead of a fixed top 50 (32 candidates, #1s unchanged; writeup "Choices" item 7). Write-up: `docs/writeup.md`, "Choices", items 5 and 6.. `web/data/` changes only for bug fixes, announced in `docs/messages.md` first. Candidate ids are final again from 2026-11-15.
- **Aridity: scoring unchanged.** The app shows the weakest dimension other than aridity as "where it breaks down" and marks aridity as limited by the rainfall data.
- **No new science features or stretch data** (e.g. LOLA normal albedo) before the pitch; time goes to slides, video, tour, mission cards, "Does it work?", one deep dive (Makran–Chagai belt) and the write-up.
- **Pitch hook:** Gale #1 (Hormozgan) is 355 km from Doha; always with "no analog study found in a first-pass search" until Scholar/ADS is done.
- Write-up figures come from `python -m pipeline.figures` (`docs/figures/`).

## Person A's environment

- Python: `~/mamba/envs/analogs/bin/python` (py3.12, GDAL with HDF4/HDF5/netCDF/PDS). Call binaries by full path.
- Raw data and its quirks: `plan.md`, section "Data on disk".
- Run long jobs as plain background scripts, not through Claude.

## Claude usage (both)

- Rolling 5-hour budget each. Use Sonnet for routine coding; keep the strongest model for scoring design and the write-up.
- `/clear` between tasks. Write new decisions into this file so the next session does not re-derive them.
