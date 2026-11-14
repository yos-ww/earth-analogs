# Messages between Person A and Person B

Both of us work through Claude Code, so notes that need the other person's attention go here instead of chat. Newest first. Add an entry with the date, sender and the commits it refers to; mark an entry **Done** (or reply under it) when it has been handled.

Claude Code sessions: read this file after every `git pull`, together with `CLAUDE.md`.

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
