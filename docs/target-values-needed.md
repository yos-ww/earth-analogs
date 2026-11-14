# Planetary target values: what's on disk and what must be cited

All values come from NASA or other agency missions, but not all of them are in `data/raw/`. The disk holds every Earth feature. For Mars and the Moon it holds terrain and a few other layers. The rest must be cited from published sources, as `plan.md` already says. This note lists exactly which values are missing, so they can be collected before or in hours 1–3 (Person B, `plan.md` line 77).

## On disk (`plan.md` "Data on disk", lines 155–168)

| Body | Dataset | Gives us |
|---|---|---|
| Earth | MODIS (MOD11C3, MOD13C2, MCD43C3, MOD10CM, MOD08_M3), IMERG, GMTED | All 12 Earth features |
| Mars | MOLA MEGDR (`megt*`) | Terrain only (relief, roughness, slope) |
| Mars | TES thermal inertia | Thermal inertia only. Shown in the panel, not scored (line 70). No albedo |
| Moon | LOLA (`ldem_64`, `ldem_75s_240m`) | Terrain only |
| Moon | Diviner PRP south (`dlre_prp_south.tab`) | `temp_avg`, `temp_max`, `ice_depth` for the south pole (Shackleton) only. No minimum temperature (line 74) |

## Not on disk: must be cited

| Target | Values to cite | Where `plan.md` says so |
|---|---|---|
| Jezero Crater (Mars) | Warmest-month day temperature, coldest-month night temperature, day–night range, albedo, dust opacity, ice | Lines 70–71 |
| Gale Crater (Mars) | Same as Jezero | Lines 70–71 |
| Arcadia Planitia (Mars) | Same as Jezero (ice is the key one: shallow subsurface ice) | Lines 70–71 |
| Utopia Planitia / Zhurong (Mars) | Same as Jezero | Lines 70–71 |
| Shackleton–de Gerlache ridge (Moon) | Minimum temperature, albedo | Lines 74–75 |
| Marius Hills (Moon) | Day temperature, night temperature, day–night range, albedo | Line 75 |

That is about 22 values. Likely sources: rover weather stations (Curiosity REMS at Gale, Perseverance MEDA at Jezero, Zhurong at Utopia), the Mars Climate Database, TES/CRISM orbital data, SHARAD/Mars Odyssey ice mapping for Arcadia, and LRO Diviner papers for the Moon.

## Values that need no lookup

| Value | Target setting | Why |
|---|---|---|
| Precipitation | 0 for all targets (directional: "as dry as possible") | No rainfall on Mars or the Moon |
| Vegetation (NDVI) | Minimum for all targets (directional) | No vegetation |
| Dust | n/a for both Moon targets (weight 0) | Plan line 45 |
| Terrain | Computed from MOLA / LOLA by Person A | Lines 69, 73 |

## Rules for each cited value (from the plan and the review notes)

- Save the source (paper, DOI or URL) for every value.
- Pick values the same way as the Earth features: monthly means, not single-day extremes (line 59).
- Record what kind of value it is: albedo definition (TES bolometric, normal, Bond), and local time for temperatures (Earth LST is about 10:30 local time for Terra).
- Each target needs one exact centre point. Arcadia is currently a 10° box (`prep.md` line 88).

## Next step

Collect the values into `data/targets_literature.csv` (one row per target and value: value, unit, value type, source), which becomes the first version of `targets.json`.

## Review (2026-11-14)

Checked against `plan.md`, `prep.md` and the contents of `data/raw/`. The line references, the on-disk table and the target and feature lists are correct. Two points need fixing and five are missing.

### Corrections

- **The count is 30, not "about 22".** Four Mars targets × 6 values = 24, plus Shackleton 2, plus Marius Hills 4. If the day–night range is derived from the day and night temperatures instead of cited, it is 25.
- **Terrain still needs first-draft values.** `plan.md` line 77 says the hours 1–3 `targets.json` uses literature values only, and Person A replaces terrain later with computed numbers. So the first version needs placeholder or literature values for relief, roughness and slope at all 6 targets, or scoring cannot run in the first hours. Move terrain from "Values that need no lookup" to "must be cited (temporary)".

### Missing

1. **Earth limits card** (`plan.md` line 53): gravity, surface pressure and radiation dose for each body or site. Not scored, but they still need sources (for example Curiosity RAD at Gale, Chang'e-4 LND on the Moon).
2. **Ice at Marius Hills** is not listed anywhere. Add it to "Values that need no lookup" as directional zero, like precipitation.
3. **Ice values don't match.** The Earth feature is surface snow/ice *cover fraction*. Arcadia's ice is *subsurface* (SHARAD, neutron data), so it is not surface cover. Decide how to translate it: seasonal CO₂ frost cover, or a stated proxy.
4. **Dust values don't match.** Earth uses AOD at 550 nm. Mars dust opacity is usually reported at about 9 µm (TES) or 880 nm (rover cameras). Add a rule under "Rules for each cited value": record the wavelength and convert to 550 nm, or note the conversion factor used.
5. **Shackleton–de Gerlache has no exact point.** `prep.md` gives only "~89.5°S" with no longitude. Add it next to the Arcadia note.

### Added 2026-11-14: geology feature

`plan.md` now has a twelfth feature, emissivity at 8.55 µm (dimension "geology"). Each of the 6 targets needs one cited value, with the wavelength and the instrument or spectral library recorded (basalt is high, about 0.95–0.97). That makes 36 values to cite, not 30.
