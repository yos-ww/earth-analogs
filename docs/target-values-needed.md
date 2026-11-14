# Planetary target values: what's on disk and what must be cited

All values come from NASA or other agency missions, but not all of them are in `data/raw/`. The disk holds every Earth feature. For Mars and the Moon it holds terrain and a few other layers. The rest must be cited from published sources, as `plan.md` already says. This note lists exactly which values are missing, so they can be collected before or in hours 1–3 (Person B, `plan.md` line 76).

## On disk (`plan.md` "Data on disk", lines 152–165)

| Body | Dataset | Gives us |
|---|---|---|
| Earth | MODIS (MOD11C3, MOD13C2, MCD43C3, MOD10CM, MOD08_M3), IMERG, GMTED | All 11 Earth features |
| Mars | MOLA MEGDR (`megt*`) | Terrain only (relief, roughness, slope) |
| Mars | TES thermal inertia | Thermal inertia only. Shown in the panel, not scored (line 69). No albedo |
| Moon | LOLA (`ldem_64`, `ldem_75s_240m`) | Terrain only |
| Moon | Diviner PRP south (`dlre_prp_south.tab`) | `temp_avg`, `temp_max`, `ice_depth` for the south pole (Shackleton) only. No minimum temperature (line 73) |

## Not on disk: must be cited

| Target | Values to cite | Where `plan.md` says so |
|---|---|---|
| Jezero Crater (Mars) | Warmest-month day temperature, coldest-month night temperature, day–night range, albedo, dust opacity, ice | Lines 69–70 |
| Gale Crater (Mars) | Same as Jezero | Lines 69–70 |
| Arcadia Planitia (Mars) | Same as Jezero (ice is the key one: shallow subsurface ice) | Lines 69–70 |
| Utopia Planitia / Zhurong (Mars) | Same as Jezero | Lines 69–70 |
| Shackleton–de Gerlache ridge (Moon) | Minimum temperature, albedo | Lines 73–74 |
| Marius Hills (Moon) | Day temperature, night temperature, day–night range, albedo | Line 74 |

That is about 22 values. Likely sources: rover weather stations (Curiosity REMS at Gale, Perseverance MEDA at Jezero, Zhurong at Utopia), the Mars Climate Database, TES/CRISM orbital data, SHARAD/Mars Odyssey ice mapping for Arcadia, and LRO Diviner papers for the Moon.

## Values that need no lookup

| Value | Target setting | Why |
|---|---|---|
| Precipitation | 0 for all targets (directional: "as dry as possible") | No rainfall on Mars or the Moon |
| Vegetation (NDVI) | Minimum for all targets (directional) | No vegetation |
| Dust | n/a for both Moon targets (weight 0) | Plan line 45 |
| Terrain | Computed from MOLA / LOLA by Person A | Lines 68, 72 |

## Rules for each cited value (from the plan and the review notes)

- Save the source (paper, DOI or URL) for every value.
- Pick values the same way as the Earth features: monthly means, not single-day extremes (line 59).
- Record what kind of value it is: albedo definition (TES bolometric, normal, Bond), and local time for temperatures (Earth LST is about 10:30 local time for Terra).
- Each target needs one exact centre point. Arcadia is currently a 10° box (`prep.md` line 88).

## Next step

Collect the values into `data/targets_literature.csv` (one row per target and value: value, unit, value type, source), which becomes the first version of `targets.json`.
