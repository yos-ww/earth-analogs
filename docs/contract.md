# Interface contract: `web/data/*`

Version 1. Person A's `pipeline/export.py` writes these files; Person B's app reads them. B's mock files in `web/mock/` use the same names and formats. To change anything here, edit this file in the same commit as the code and tell the other person.

## Grid

- 0.25° global, 1440 columns × 720 rows.
- Row 0 is the northernmost row, column 0 the westernmost.
- Cell centre: `lat = 90 − (row + 0.5) × 0.25`, `lon = −180 + (col + 0.5) × 0.25`.
- Flat index: `row × 1440 + col`.

## Features

Fixed order. This is the column order in `features.bin`.

| # | `id` | Dimension | Unit | Transform |
|---|---|---|---|---|
| 0 | `relief` | `terrain` | m | `log1p` |
| 1 | `roughness` | `terrain` | m | `log1p` |
| 2 | `slope` | `terrain` | degrees | `log1p` |
| 3 | `lst_day_warm` | `temperature` | K | `none` |
| 4 | `lst_night_cold` | `temperature` | K | `none` |
| 5 | `lst_range` | `temperature` | K | `none` |
| 6 | `ndvi_max` | `vegetation` | – | `none` |
| 7 | `precip` | `aridity` | mm/yr | `log1p` |
| 8 | `albedo` | `albedo` | – | `none` |
| 9 | `snow_ice` | `ice` | fraction 0–1 | `none` |
| 10 | `aod` | `dust` | – | `none` |
| 11 | `emis_b29` | `geology` | – (emissivity at 8.55 µm) | `none` |

Dimension order (slider order): `terrain`, `temperature`, `vegetation`, `aridity`, `albedo`, `ice`, `dust`, `geology`.

If a feature is dropped, it is removed from `meta.json` and from `features.bin` together. The app must read the feature list from `meta.json`, not hardcode it.

## `cells.bin`

Little-endian `Uint32`, one value per land cell: the flat grid index. Length = `n_cells`. Sorted ascending.

## `features.bin`

`Uint8`, `n_cells × n_features`, row-major (all features of cell 0, then cell 1, …). Cell order matches `cells.bin`.

- `255` = no data.
- `0–254` encode the transformed value: `x = min + (code / 254) × (max − min)`, where `x` is in **transformed space** (`log1p(value)` for `log1p` features, the value itself for `none`).

## `meta.json`

```json
{
  "contract_version": 1,
  "grid": { "res_deg": 0.25, "ncols": 1440, "nrows": 720 },
  "n_cells": 300000,
  "dimensions": ["terrain", "temperature", "vegetation", "aridity", "albedo", "ice", "dust", "geology"],
  "features": [
    { "id": "relief", "label": "Relief", "dimension": "terrain", "unit": "m",
      "transform": "log1p", "min": 0.0, "max": 8.5, "sigma": 1.2, "p1": 0.7, "p99": 7.9 }
  ]
}
```

`min`, `max`, `sigma`, `p1` and `p99` are all in transformed space. `p1` and `p99` are area-weighted Earth land percentiles.

## `targets.json`

```json
{
  "targets": [
    {
      "id": "jezero", "name": "Jezero Crater", "body": "mars",
      "lat": 18.4, "lon": 77.6,
      "features": {
        "relief":  { "value": 420, "status": "literature", "source": "…", "source_url": "…" },
        "albedo":  { "value": 0.16, "value_kind": "TES bolometric", "status": "literature", "source": "…", "source_url": "…" },
        "precip":  { "value": 0, "status": "fixed", "source": "No rainfall on Mars" },
        "aod":     { "na": true }
      },
      "weights": { "terrain": 1, "temperature": 1, "vegetation": 1, "aridity": 1, "albedo": 1, "ice": 1, "dust": 1, "geology": 1 },
      "not_scored": { "thermal_inertia": { "value": 300, "unit": "J m⁻² K⁻¹ s⁻½", "source": "…" } },
      "limits": {
        "gravity_ms2": { "value": 3.71, "source": "…" },
        "pressure_pa": { "value": 700, "source": "…" },
        "radiation_msv_day": { "value": 0.67, "source": "…" }
      }
    }
  ]
}
```

- `body` is `mars` or `moon`. `lat`/`lon` are planetocentric degrees, east-positive, `lon` in −180…180.
- `value` is in **physical units** (the Unit column above), not transformed. The app applies the feature's transform before scoring.
- `status` is `literature`, `computed` or `fixed`.
- `na: true` means the feature has no meaning for this target; it is skipped.
- Directional is **not stored**. Both sides derive it: a feature is directional when the transformed target value lies outside `[p1, p99]` from `meta.json`.
- The numbers in the example are placeholders, not real values.

### Sources of `targets.json` (both hand-edited, owner: B)

- `data/targets.csv`: one row per target. Columns: `target_id, name, body, lat, lon, source, source_url`. `lat`/`lon` is the one exact centre point (review decision 7).
- `data/targets_literature.csv`: one row per target and value. Columns: `target_id, feature_id, value, unit, value_kind, source, source_url`, plus an optional last column `status` (`literature` if empty, or `fixed` for values like `precip = 0` that need no lookup). Special cases:
  - `value` = `na` makes the feature `{ "na": true }` (for example `aod` for the Moon).
  - `feature_id` = `limit:gravity_ms2`, `limit:pressure_pa` or `limit:radiation_msv_day` goes to `limits`.
  - `feature_id` starting with `info:` (for example `info:thermal_inertia`) goes to `not_scored`.
  - Every other `feature_id` must be a feature `id` from the table above.
- Terrain rows are placeholders until A replaces them with values computed from MOLA and LOLA. A's values go in `data/targets_computed.csv` (same columns, `status` = `computed`, written by `pipeline/targets.py`); `export.py` applies it after the literature file, so a computed value replaces a literature value for the same target and feature. B's file is never edited by A.
- `weights` are all 1 unless a target row says otherwise; `n/a` features follow from the `na` rows.
- **From hour 1, A's `export.py` also writes `web/data/targets.json` from these two CSVs** (literature values only). `pipeline/targets.py` later replaces the terrain values with computed ones. B can therefore replace the mock `targets.json` as soon as the CSVs exist.

### Rules for cited values

- **Ice (`snow_ice`):** the surface snow or frost cover fraction, matching what MOD10CM measures. Shallow subsurface ice (Arcadia) and permanently shadowed ice (Shackleton) are not surface cover: score the surface value (0 if none is seen) and say so in the mission card (review decision 3).
- **Dust (`aod`):** give the value at 550 nm. If the source reports another wavelength (880 nm, 9 µm), put the original wavelength in `value_kind` and the conversion in `source`.
- **Vegetation (`ndvi_max`):** the same fixed value for every target, `0`, status `fixed` (it is directional).
- **Temperatures:** monthly means, with the local time of day in `value_kind` (Earth's MOD11C3 is about 10:30 local).

## Scoring (must give the same number in Python and in the browser)

For one target and one cell, in transformed space, with `f` = cell value, `t` = target value, `σ` = `sigma`:

1. Skip the feature if the cell code is `255` or the target has `na: true`.
2. Like-for-like (`p1 ≤ t ≤ p99`): `s = exp(−((f − t) / σ)²)`.
3. Directional:
   - `t < p1`: `s = 1` if `f ≤ p1`, else `exp(−((f − p1) / σ)²)`.
   - `t > p99`: `s = 1` if `f ≥ p99`, else `exp(−((f − p99) / σ)²)`.
4. Dimension score = mean of its features that were not skipped. A dimension with no such feature is missing.
5. Overall score = `Σ w_d × s_d / Σ w_d` over dimensions that are not missing.
6. A cell is scored only if at least 4 dimensions are not missing. Otherwise it has no score and is drawn as no-data.

## `known_analogs.geojson`

Generated from `data/known_analogs.csv` (owner: B). A `FeatureCollection` of `Point`s. Properties: `name`, `country`, `body` (array of `mars` / `moon`), `dimensions` (array), `why_analog`, `reference`, `source_url`.

## `candidates.geojson`

A `FeatureCollection` of `Point`s at the region's best cell. Properties:

| Property | Type | Meaning |
|---|---|---|
| `id` | string | Stable slug built from the target and the best cell, e.g. `jezero-34.62N-080.12E`. It does not change when the ranking changes |
| `name` | string | Place name |
| `target_id` | string | Matches `targets.json` |
| `score` | number 0–1 | Overall score at default weights |
| `robustness` | number 0–1 | Share of random weight changes in which the region stays in the top 50 |
| `dim_scores` | object | Dimension → score 0–1; missing dimensions are left out |
| `area_km2` | number | Region area |
| `nearest_known_km` | number | Distance to the nearest known analog |
| `novelty` | string | `under-studied` or `unrecognized` (set by B after the literature check) |
| `dossier` | string or null | Path to the site page, e.g. `sites/xyz.md` |
| `continent` | string | Natural Earth continent of the best cell (used for the per-continent cap) |
| `rank` | integer | Rank within the target by score × robustness, 1 = best |

How candidates are chosen (`pipeline/candidates.py`): per target, remove permanent ice-sheet cells (`snow_ice` ≥ 0.9) for the Mars targets, take the top 1% of the remaining land area, group the cells into regions (8-connected, joined across the antimeridian), split each region at its local maxima (maxima at least 200 km apart; each cell joins its nearest maximum; pieces of at least 3 cells), drop pieces whose best cell is within 200 km of any known analog, compute robustness over 500 random weight changes (each dimension weight × exp(N(0, 0.5)); "stays in the top 50" = the region's best score ranks in the top 50 of the regions that remain), drop pieces with robustness below 0.25, rank by score × robustness, and keep at most 3 per continent per target, at least 400 km apart. A target without enough values to score at least 4 dimensions gets no candidates.

`web/data/` is generated, so B does not edit this file. B's input is `data/candidate_notes.csv` (owner: B), with columns `id, name, novelty, dossier`, where `id` matches a candidate `id`. `export.py` merges it in. A candidate with no row gets `name` = "lat, lon", `novelty` = `under-studied` and `dossier` = null.

## `validation.json` (optional)

Written by `pipeline/validate.py` (`python -m pipeline.score --validate`). The app shows the "Does it work?" panel from it and must keep working if the file is missing.

```json
{
  "barren_ndvi_below": 0.15, "n_permutations": 2000,
  "targets": {
    "jezero": {
      "n_sites": 26,
      "known_percentile_median": 0.87,
      "random_land_median": 0.50,
      "random_barren_median": 0.65,
      "p_vs_barren": 0.011,
      "sites": { "Holuhraun": 0.98 },
      "all_own_body": { "...": "same keys, counting every site of the body" },
      "not_visible_to_score": ["Lava Beds National Monument"],
      "directional": { "lst_night_cold": "low" },
      "features_used": ["albedo", "roughness"],
      "per_dimension": { "terrain": { "known": 0.83, "barren": 0.41, "n_sites": 21 } }
    }
  },
  "bodies": { "mars": { "targets": ["jezero", "arcadia"], "n_sites": 26, "known_percentile_median": 0.86 } },
  "skipped": { "gale": "fewer than 4 dimensions have target values" }
}
```

The numbers above are examples. Meaning:

- Every percentile is area-weighted and is a position among all scored land cells for the same score (so `random_land_median` is about 0.5 by construction and works as a check).
- `known_percentile_median`: median percentile of the known sites of the target's body that are tagged with at least one scored dimension (`mineralogy` counts as `geology`). Each site is scored against this target alone. `all_own_body` counts every site of that body; `not_visible_to_score` lists the sites tagged only `biology`, `operations` or `subsurface`.
- `random_barren_median`: median percentile of random barren land cells (`ndvi_max` < `barren_ndvi_below`). The claim to support is `known_percentile_median` clearly above `random_barren_median`.
- `p_vs_barren`: share of `n_permutations` same-size random barren sets (area-weighted draws) whose median percentile is at least the observed one.
- `per_dimension[d]`: `known` = median percentile of the dimension-`d` score for sites tagged `d`; `barren` = the same for random barren cells.
- `bodies[mars|moon]`: each site scored by the best of that body's targets, with the random baseline taking the best of the same set (review decision 1).
- `skipped`: targets without enough values to score yet.

## Changes to this contract

Additions made after version 1 are additive (new optional files and CSV rules), so `contract_version` stays 1 and existing mock files remain valid.
