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
- Like-for-like vs. directional vs. n/a is decided per target and per feature by the p1–p99 rule.
- 3D globe (`globe.gl` from a CDN, no build step) is the main view; the Leaflet flat map is a fallback built last.
- Area weighting by cos(latitude) for every percentile, validation and ranking.
- No tuning to the answer: σ from the data rule, equal default weights.
- A science spike at hour 4 tests the result on five quick features before the full pipeline is built (`plan.md` timeline).
- Nothing from the stretch tiers starts before Checkpoint 2.
- Sliders stay the main control (no weight presets). Mission context only explains why a match matters and how the place could be used: a mission card per target, one sentence per dimension, and a "why this place matters" line, all text in `web/missions.js`, not in the contract.
- Every place gets a fingerprint radar chart: one axis per dimension from `meta.json`, unweighted dimension scores, target = outer ring.

## Decisions from the review (`docs/review-notes.md`), proposed defaults

Both people confirm these in hour 0. Until then, code to the default.

| # | Question | Default | Owner |
|---|---|---|---|
| 1 | Validation baseline bias | Score each known site against the targets of its own body only, taking the best. Baseline cells take the best of the same set of targets | A |
| 2 | Terrain window shrinks with latitude | Fixed window of about 28 × 28 km on the ground for every Earth cell | A |
| 3 | Ice compares different things | Name the dimension "Surface snow/ice". No permafrost layer in the core. The write-up and the panel state that Arcadia's ice is below the surface and lunar ice is in shadowed craters | both |
| 4 | Day temperature time of day | Keep MOD11C3 (about 10:30 local time). Pick Mars and Moon day values at about the same local time and record it | B |
| 5 | Albedo definitions differ | Record the kind of each value in `data/targets_literature.csv` (`value_kind`) | B |
| 6 | Polar LOLA grid | Compute slope from projected x/y metres. Read scale and offset from the `.lbl` | A |
| 7 | Targets need one exact point | B picks and cites one centre point for Arcadia Planitia and for the Shackleton–de Gerlache ridge | B |

## Person A's environment

- Python: `~/mamba/envs/analogs/bin/python` (py3.12, GDAL with HDF4/HDF5/netCDF/PDS). Call binaries by full path.
- Raw data and its quirks: `plan.md`, section "Data on disk".
- Run long jobs as plain background scripts, not through Claude.

## Claude usage (both)

- Rolling 5-hour budget each. Use Sonnet for routine coding; keep the strongest model for scoring design and the write-up.
- `/clear` between tasks. Write new decisions into this file so the next session does not re-derive them.
