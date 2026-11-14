# Science check: results with all 12 features and complete targets

Run with `~/mamba/envs/analogs/bin/python -m pipeline.spike` (early check), `python -m pipeline.score --validate` (`web/data/validation.json`) and `python -m pipeline.candidates`. State: 2026-11-14, all 12 Earth features, all six targets complete (B's literature rows, MOLA/LOLA terrain and basalt emissivity computed by `pipeline/targets.py`, Shackleton's day temperature from the Diviner table). **Earlier snapshots (5 and 7 features) are superseded:** they ranked Antarctica high because albedo and snow/ice had no target values.

## Target values that came from the data, not the literature

| Target | Roughness | Relief | Slope | Notes |
|---|---|---|---|---|
| Jezero | 280 m | 1161 m | 2.7° | |
| Gale | 831 m | 4396 m | 5.1° | rover landing site, foot of Mount Sharp |
| Utopia | 41 m | 177 m | 0.4° | |
| Arcadia | 158 m | 854 m | 2.1° | |
| Shackleton | 1161 m | 4741 m | 15.2° | rim point; ±13.9 km includes the 4 km deep crater |
| Marius Hills | 84 m | 443 m | 1.2° | |

`emis_b29` of the basaltic targets = 0.952 (mean MODIS `Emis_29` of two barren Earth basalt flows; B proposed the rule before any result existed). Shackleton: `lst_day_warm` = 240.2 K, the median Diviner annual-maximum surface temperature of 4729 triangles within ±13.9 km (a different quantity from Earth's warmest-month mean at 10:30, so an upper bound); `lst_range` = n/a because the Diviner table has no day or night values; `emis_b29` = n/a (feldspathic highland).

## Check 1: do the targets give different maps?

Yes. The top 1% (by land area) of Jezero, Arcadia and Marius Hills overlaps little (Jaccard 0.26–0.31, down from 0.44–0.68 before albedo and snow/ice). Antarctica is no longer in the top regions. Maximum scores 0.72 (Jezero), 0.74 (Arcadia), 0.77 (Marius Hills).

Strongest regions: south-eastern Iran and Baluchistan (Makran, Lut) for all of them; the Atacama–Altiplano for Jezero and Arcadia; the Namib, Argentina and Western Australia for Marius Hills; Egypt's Eastern Desert and the Tibet–Qaidam area further down.

**A ranking-rule warning.** Taking the top 1% by cell count instead of area puts 36% Antarctic cells in Utopia's and Shackleton's top 1% (Antarctica holds 28% of all cells but little area). By area, as the project rule says, it is 2% and 1%.

## Check 2: do known analogs stand out from random barren land?

Percentiles are area-weighted positions among all scored land; a random land cell sits at 0.50 (checked on every run). Each site is scored only against the targets of its own body. Sites tagged only `biology`, `operations` or `subsurface` are not visible to the score and are excluded from the main figure.

| | Known sites | Random barren land | p |
|---|---|---|---|
| **Mars**, best of 4 targets (26 sites) | 0.89 | 0.76 | 0.021 |
| **Moon**, best of 2 targets (12 sites) | 0.70 | 0.57 | 0.205 |
| Jezero alone | 0.87 | 0.56 | 0.002 |
| Arcadia alone | 0.89 | 0.79 | 0.050 |
| Gale alone | 0.86 | 0.77 | 0.097 |
| Utopia alone | 0.87 | 0.79 | 0.082 |
| Marius Hills alone | 0.73 | 0.60 | 0.200 |
| Shackleton alone | 0.67 | 0.57 | 0.191 |

Reading: the evidence for Mars is real but modest (clear for Jezero, borderline for Arcadia, not significant for Gale and Utopia alone). For the Moon the sites are in the right direction but there are only 12, so it is not significant. The p-values assume the sites are independent (several are not: three are in Chile) and are not corrected for testing several targets.

The early check with best-of-body scoring over the three spike targets gives 0.67 (p = 0.041) and, without Antarctica, 0.69 (p = 0.022). It was 0.73–0.75 with five features, when ice sheets were rewarded (McMurdo Dry Valleys 1.00 → 0.42, Holuhraun 0.99 → 0.56). The drop is the score getting honest, not a regression.

### By dimension (Jezero; the other Mars targets are similar)

| Dimension | Known sites tagged with it | Random barren land |
|---|---|---|
| terrain | 0.83 | 0.41 |
| temperature | 0.91 | 0.81 |
| aridity | 0.87 | 0.85 |
| geology | 0.57 | 0.07 |
| ice | 0.11 | 0.51 |
| dust | 0.21 | 0.71 |

Terrain and temperature separate known sites from barren land. Aridity does not (barren land is dry too). **Ice and dust go the wrong way, and the write-up must say why:** the sites tagged `ice` (McMurdo, Haughton, Axel Heiberg) are snow-covered by definition while every Mars target has surface snow of 0 (decision 3: Arcadia's ice is below the surface; the score sees surface snow only). Mars dust optical depth is 0.4–0.6, so Earth's dustiest barren land matches best, while Qaidam, Mojave and Namib sit near 0.2–0.3. Geology: barren land is at 0.07 because quartz-rich deserts mismatch a basalt target.

## What the score cannot see (for the write-up)

`biology`, `operations` and `subsurface` tags (for example Lava Beds, Mauna Loa HI-SEAS, Pavilion Lake); subsurface ice; mineralogy beyond a silica index; Apollo-training sites chosen for crater shape or logistics (Ries, Sudbury, Lonar); gravity, vacuum and radiation.

## Candidates (`web/data/candidates.geojson`, 70 points)

Up to 3 per continent per target. The same few regions recur across targets, which is expected because all temperature targets are directional and terrain and albedo carry the difference. Two cautions:

1. **Regions are big.** The top Jezero, Arcadia and Shackleton regions are 400,000–650,000 km² blobs (the Iranian–Pakistani deserts, the Atacama–Altiplano), and a candidate is only the best cell inside it. A dossier needs a site-scale point, so the large regions should be split into sub-regions or the dossier should pick a spot inside them.
2. **Novelty is not yet established.** The nearest known analog from our 37-site list is 800–1500 km away for the Iranian regions, but our list is short; Dasht-e Lut and Makran may well be published analogs. B's literature check decides `under-studied` or `unrecognized`.

## Caveats

- IMERG reads 0 mm/yr over the Antarctic plateau and is unreliable on ice sheets; high-latitude coldest-night and range values are bounds; Arctic snow and albedo describe the sunlit season only.
- Moon `albedo` is the global mean Bond albedo (0.11) for both sites, pending site-specific values; Mars albedo and dust are Mars Climate Database values (B).
- Cells missing a dimension are skipped, not penalised, so cells with gaps (ice-sheet interiors, which lack NDVI, aerosol and winter albedo) can score higher than they deserve. Candidates for the Mars targets drop permanent ice sheets (snow/ice ≥ 0.9); the map shows them.
