# Hour-4 science spike: results

> Snapshot with 5 Earth features (written before `albedo`, `snow_ice`, `aod`, `lst_day_warm`, `lst_range`, `relief` and `slope` existed). Re-run `python -m pipeline.spike` and update this note once B's target values for the ice-related features are in. A re-run with `relief` and `slope` added (7 features) gave the same picture: median percentile 0.73, p = 0.008 (0.73 and p = 0.013 without Antarctica), top-1% overlap 0.41-0.69, top cells still on Antarctica.

Run with `~/mamba/envs/analogs/bin/python -m pipeline.spike`. Five Earth features (`roughness`, `lst_night_cold`, `ndvi_max`, `precip`, `emis_b29`; dimensions terrain, temperature, vegetation, aridity, geology) against three targets: Jezero, Arcadia, Marius Hills. Target values: B's literature rows in `data/targets_literature.csv`, with roughness (MOLA/LOLA) and the basalt emissivity computed by `pipeline/targets.py` into `data/targets_computed.csv`. The emissivity rule (target = mean `Emis_29` of two barren Earth basalt flows, Holuhraun and Black Point = 0.952) was proposed by B before any result existed; the first run used B's placeholder 0.96.

## Terrain computed for the targets (replaces B's placeholders)

Std of elevation in the same ±13.9 km window an Earth cell uses.

| Target | Computed roughness | B's placeholder |
|---|---|---|
| Jezero | 280 m | 60 m |
| Gale | 831 m | – |
| Utopia | 41 m | – |
| Arcadia | 158 m | 15 m |
| Shackleton | 1164 m | – |
| Marius Hills | 87 m | 80 m |

## Check 1: do the three targets give different maps?

Only partly. With all land cells, the top 1% (by area) of the three maps overlaps heavily (Jaccard 0.31–0.58) and sits on the Antarctic plateau for all three targets.

Why: all three temperature targets (196, 166, 95 K) are far below Earth's p1 (207 K), so they are directional and every cold cell scores 1 for temperature. `precip` = 0 matches the Antarctic plateau (IMERG reads 0 there). `ndvi_max` has no data over Antarctica, so it is skipped rather than penalised. `emis_b29` of ice (0.98) is close to the placeholder 0.96. Albedo and snow/ice, the two features that would mark an ice sheet as unlike a bare Mars plain, are not in yet.

Diagnostic with Antarctica and Greenland removed (not a decision, only a test): the maps separate (Jaccard 0.11–0.38) and the top regions are eastern Iran (Lut/Kavir, Makran), the Tibetan Plateau, the Atacama–Altiplano and Egypt/Sudan, with different mixes per target. Max scores fall from about 0.95 to 0.65.

## Check 2: do known analogs stand out from random barren land?

Each site is scored against its own body's targets, best of the set; the baseline cells take the best of the same set (review decision 1). Percentiles are area-weighted. Random sets are drawn with probability proportional to area.

| Pool | Tagged sites | Median percentile | Random sets (median / 95th pct) | p |
|---|---|---|---|---|
| All barren land | 24 | 0.75 | 0.50 / 0.66 | 0.004 |
| Excluding Antarctica | 23 | 0.72 | 0.50 / 0.67 | 0.013 |

"Tagged" = tagged terrain, temperature, aridity, ice or dust in `data/known_analogs.csv`. The signal is real but modest with five features. Sites picked for mineralogy or biology score low, as the plan expects: Rio Tinto 0.20, Lake Tyrrell 0.01. Mauna Kea scores 0.00 as a Moon analog because its roughness is far above Marius Hills (87 m).

## What this means (A's reading, for discussion)

1. The method is not broken, but 5 of 12 features cannot decide it. The ice-sheet problem should disappear once `albedo` and `snow_ice` are in (hours 4–7). Re-run the spike then.
2. The plan's rule stays: permanent ice-sheet cells are left out of candidates for the rocky Mars targets.
3. The temperature dimension cannot separate the targets, because for every target Earth can only point in one direction. Terrain, albedo and geology carry the difference between targets (as `plan.md` expected).
4. Geology: all three targets get the same `emis_b29` (0.952), so the dimension does not separate the targets. It separates quartz-rich deserts (Libyan erg 0.75) from everything else; barren land has a median of 0.936. Shackleton (feldspathic highland) must not get the basalt value.

## Caveats

- IMERG reads 0 mm/yr over the Antarctic plateau and is unreliable on ice sheets.
- `lst_night_cold` at high latitudes is an upper bound where winter months are missing.
- Numbers will change when the remaining features arrive; re-run the spike then.
