# Analog Atlas: a global search for Earth's analogs of Moon and Mars landing sites

> **Draft, 2026-11-14.** Sections marked **(B)** are Person B's and are placeholders here. Sections marked **(A)** are written from the generated files in `web/data/`; every number can be reproduced with the commands in "Reproduce". Numbers will change if the data or target values change, so re-check them at the data freeze.

## Summary (B)

*To be written by B from the tour captions.*

## The problem and our idea (B)

*To be written by B. One-paragraph version of the idea for reference: instead of picking one place that "looks like Mars", score every land cell on Earth against measured profiles of six Moon and Mars landing sites, one dimension at a time, so the result says what matches and where it breaks down, and test the method against sites that scientists already use as analogs.*

---

## Data (A)

All Earth data are open NASA or USGS products; Mars and Moon data are NASA Planetary Data System (PDS) products. Raw files (about 15 GB) are not in the repository; `setup/` downloads them and checks their sizes.

| Dataset | Used for | Period and resolution | Processing |
|---|---|---|---|
| MODIS Terra MOD11C3 v061 | Day and night land-surface temperature; emissivity at 8.55 µm (band 29) | Monthly, 2021–2023 (36 files), 0.05° | Calendar-month climatology, then coldest or warmest month; emissivity: median of 36 months |
| MODIS Terra MOD13C2 v061 | Vegetation (NDVI) | Monthly, 2022–2023 (24 files), 0.05° | Per-pixel maximum over 24 months |
| MODIS MCD43C3 v061 | White-sky shortwave albedo | The 15th of each month of 2023 (12 files), 0.05° | Per-pixel median of the valid days |
| MODIS Terra MOD10CM v61 | Snow and ice cover; also the land mask | Monthly, 2021–2023 (35 files; October 2022 missing), 0.05° | Mean of calendar-month means over months with data (at least 6) |
| MODIS Terra MOD08_M3 v6.1 | Aerosol optical depth (dust) | Monthly, 2023 (12 files), 1° | Deep Blue AOD at 550 nm over land, mean of months |
| GPM IMERG monthly V07 | Precipitation | Monthly, 2021–2023 (36 files), 0.1° | Mean rate × 8766 h per year |
| USGS GMTED2010 | Elevation, for relief, roughness and slope | 30 arc-second mean elevation (about 0.93 km), 84°N to 90°S | See "Terrain on one ground scale" |
| MGS MOLA MEGDR | Mars terrain at the targets | 64 pixels per degree (926 m) | Same window and formulas as Earth |
| LRO LOLA gridded data | Moon terrain at the targets | 64 pixels per degree (474 m) and the 240 m south-polar grid | Averaged to about 926 m first, then as Earth |
| LRO Diviner polar resource product (south) | Day temperature at Shackleton | 2.88 million surface triangles | Median within the target window |
| LRO Diviner global cumulative averages (10°–20°N band) | Day and night temperature at Marius Hills | Mission-average bolometric temperature, 0.25-hour local-time bins, 0.5° tiles | Tiles inside the target window, interpolated to 10:30 and 22:30 local time |
| Mars Climate Database v6.2 (B) | Mars temperature, albedo, dust opacity and surface frost at each target | Climatology average solar scenario, 12 months at 10:30 and 22:30 local time | Values read at each target point |

Terra crosses the equator at about 10:30 local time (day) and 22:30 (night). Mars day and night values were taken at the same two local times so that Earth and planetary temperatures are comparable.

## Method (A)

### Grid and land mask

The grid is global, 0.25° (1440 × 720 cells). A 0.05° MODIS pixel counts as land if MOD10CM never flags it as water (the flag is identical in all months). A 0.25° cell is land if at least half of its 5 × 5 sub-pixels are land. This gives **344,354 land cells**, including Antarctica and Greenland and excluding lakes. Cells are not equal in area: every percentile, ranking and validation figure below uses weights proportional to cos(latitude), because otherwise the Arctic and Antarctica would be over-counted.

### Twelve features in eight dimensions

Features are averaged within a dimension before the dimensions are combined, so a dimension with three features does not count three times.

| Dimension | Feature | Definition | Earth range, p1 to p99 |
|---|---|---|---|
| Terrain | Relief | Maximum minus minimum elevation in the window | 11 to 2,696 m |
| | Roughness | Standard deviation of elevation in the window | 1.9 to 594 m |
| | Slope | Mean slope in the window | 0.04 to 13.4° |
| Temperature | Warmest-month day temperature | Warmest of 12 monthly means, day overpass | 241 to 327 K |
| | Coldest-month night temperature | Coldest of 12 monthly means, night overpass | 207 to 295 K |
| | Day–night range | Mean over months of (day − night) | 0.4 to 25 K |
| Vegetation | Maximum NDVI | Yearly maximum, clipped to 0–1 | 0 to 0.89 |
| Aridity | Precipitation | Mean annual precipitation | 0 to 3,442 mm/yr |
| Albedo | White-sky shortwave albedo | Median of valid sampled days | 0.10 to 0.84 |
| Ice | Snow and ice cover | Mean fraction of the year with snow or ice on the surface | 0 to 1 |
| Dust | Aerosol optical depth | Deep Blue AOD at 550 nm | 0.02 to 0.67 |
| Geology | Emissivity at 8.55 µm | Median of 36 monthly values | 0.77 to 0.98 |

"p1 to p99" is the area-weighted range of Earth land values. Notes on the less obvious choices:

- **Temperatures** are monthly means (the 3 years are first averaged for each calendar month), not single-day extremes, because that is what the planetary values are. A pixel needs data in at least 6 of the 12 months. Where winter months are missing (polar night, persistent cloud) the coldest-night and range values are bounds, not measurements.
- **Geology** is the 8.55 µm emissivity: low (about 0.75) for quartz-rich sand seas, high (0.95 to 0.98) for basalt, but also high for vegetation and ice. It is a silica index, not a mineral map, and it must be read together with NDVI and snow cover.
- **Snow and ice** counts only codes 0–100 of the snow product; night, cloud and fill codes are missing data, never zero. In the Arctic, polar-night months are missing, so values describe the sunlit season and read low.
- **Albedo** needs at least 4 of the 12 sampled days; **aerosol** needs at least 4 of 12 months and is not retrieved over ice.
- Skewed features (relief, roughness, slope, precipitation) are put on a log(1 + x) scale before scoring. All features are stored as 8-bit values after that, so the browser can re-score live.
- Values at 0.05° (or 0.1°, 1°) are averaged to the 0.25° cell over their valid land pixels.

### Terrain on one ground scale

Terrain depends on the size of the window, and a 0.25° cell is 28 km wide at the equator but only 9.5 km at 70°N. To compare Earth with other bodies and with itself at every latitude, terrain is always measured in a window about 28 × 28 km on the ground (±13.9 km). For Earth, a cell's 30 elevation rows (27.8 km north to south) are its latitude band and the window is 30 / cos(latitude) pixels wide, so it is about 28 km wide everywhere. Slope is a central difference in ground metres whose baseline is about 1.9 km in both directions (one pixel north-south, round(1 / cos latitude) pixels east-west). The same formulas run on Mars (MOLA, 926 m pixels) and the Moon (LOLA averaged to about 926 m first; the south pole uses projected x and y metres). Checks: a tilted plane with a known 5.711° slope is recovered exactly at 0°, 40°, 65° and on the polar grid, and the target-side code agrees with the Earth-cell arrays at six real places (for example Kansas, 15 vs 15 m roughness; Alps within 2%).

### The six targets

Each target is one point, a measured landing site or candidate, with a value for each feature and a source. Terrain is computed from MOLA and LOLA; everything else comes from the literature or models. "Directional" values (marked ↓ or ↑) lie outside Earth's p1 to p99 range, so Earth can only point in that direction.

| Target | Relief m | Rough. m | Slope ° | Day K | Night K | Range K | Albedo | Dust | Frost | Emis. |
|---|---|---|---|---|---|---|---|---|---|---|
| Jezero Crater (Mars) | 1,161 | 280 | 2.7 | 268 | 196 ↓ | 55 ↑ | 0.171 | 0.50 | 0 | 0.952 |
| Gale Crater (Mars) | 4,396 ↑ | 831 ↑ | 5.1 | 274 | 189 ↓ | 63 ↑ | 0.236 | 0.59 | 0 | 0.952 |
| Utopia Planitia (Mars) | 177 | 41 | 0.4 | 263 | 187 ↓ | 50 ↑ | 0.231 | 0.54 | 0 | 0.952 |
| Arcadia Planitia (Mars) | 854 | 158 | 2.1 | 268 | 166 ↓ | 62 ↑ | 0.238 | 0.43 | 0 | 0.952 |
| Shackleton rim (Moon) | 4,741 ↑ | 1,161 ↑ | 15.2 ↑ | 240 ↓ | 90 ↓ | n/a | 0.11 | n/a | 0 | n/a |
| Marius Hills pit (Moon) | 443 | 84 | 1.2 | 381 ↑ | 105 ↓ | 276 ↑ | 0.11 | n/a | 0 | 0.952 |

Vegetation (NDVI) and precipitation are 0 for every target (no vegetation, no rainfall). Sources:

- **Mars temperatures, albedo, dust and frost:** Mars Climate Database v6.2, climatology average solar scenario, queried at each target point for 12 months (Ls 15° to 345°) at 10:30 and 22:30 local time, the Terra overpass times. Day = surface temperature at 10:30 in the warmest month; night = at 22:30 in the coldest month; range = yearly mean of (10:30 − 22:30). Albedo is the model's TES-derived bolometric ground albedo. Dust is the yearly mean of the monthly visible dust opacity, used at 550 nm without conversion: Martian dust grains (about 1.5 µm) make the extinction nearly flat across visible wavelengths. Surface CO₂ and H₂O frost is zero in all 12 months at all four points. As a check, the same query at the Viking 2 site (47.7° N) gives 0.74 kg/m² of CO₂ frost in winter, where the lander photographed frost.
- **Moon:** Marius Hills temperatures from the Diviner global cumulative product (J.-P. Williams, UCLA; the dataset behind Williams et al. 2017, Icarus 283:300–325): the mission-average bolometric temperature of the two 0.5° tiles inside the target window, interpolated to 10:30 local time (day, 381 K) and 22:30 (night, 105 K), the Terra overpass times; the range is their difference (276 K). The table has no seasons, so these are mission averages, not warmest- or coldest-month values. The peak and trough of the same profile are 392 K and 94 K, which is what the earlier literature-based values (390 K and 95 K) represented. Shackleton night temperature from a secondary summary of Diviner results (any value under 207 K scores the same). Shackleton day temperature is the median Diviner annual-maximum surface temperature of 4,729 triangles within ±13.9 km, which is an upper bound against Earth's monthly-mean convention. The Diviner table has no day or night values, so Shackleton's day–night range is n/a. Albedo 0.11 is the global mean lunar Bond albedo (NASA NSSDC fact sheet) and is a placeholder for site values.
- **Geology:** the basaltic targets get the 8.55 µm emissivity that MODIS measures on two barren Earth basalt flows (Holuhraun 0.955, Black Point 0.950, mean 0.952), so the target and Earth come from the same sensor. Shackleton is feldspathic highland, for which there is no Earth reference, so geology is skipped for it.
- **Ice** is surface snow or frost only. Arcadia's shallow ground ice and the ice in Shackleton's shadowed craters are below or off the surface and are described in the mission text, not scored.

### Scoring

For one target and one cell, work in the transformed space (log(1 + x) for the skewed features). With f the cell value, t the target value and σ a robust spread of the Earth values (interquartile range ÷ 1.35, area-weighted):

- **Like-for-like** (t inside Earth's p1 to p99): the feature score is exp(−((f − t) / σ)²), 1 for a perfect match and falling towards 0.
- **Directional** (t outside that range): t is clamped to the nearest end of Earth's range and the feature is scored one-sided. If the target is colder than any Earth place, every cell at or below the clamp scores 1, and warmer cells fall off with the same formula. The app flags such features, because they say only "Earth can point in this direction".
- A feature that is missing in a cell is **skipped** and the weights are renormalised; a feature that has no meaning for a target is n/a.
- A dimension's score is the mean of its features. The overall score is the weighted mean of the dimensions (default weights all equal; the user can change them), and a cell is scored only if at least 4 dimensions have data.

σ has a floor of 5% of the p1-to-p99 range so a mostly-constant feature cannot get σ = 0; the floor never binds for any of the twelve features. The browser and Python versions give the same numbers: 306 cells, including cells with missing data, were compared (largest difference 7.6 × 10⁻⁷).

### Choices, and when they were made

The design below was fixed before any result was seen: the grid, the twelve features and eight dimensions, the scoring formula, the σ rule, equal default weights, area weighting, the like-for-like versus directional rule, the fixed 28 km terrain window, the validation design and the barren-land baseline. We did not tune any of it to improve a result.

Choices made after a first look at results, listed so they can be judged:

1. The basaltic emissivity target changed from a placeholder (0.96) to 0.952 from Earth basalt flows. B proposed the rule before any result existed. It moved the validation figures slightly in the favourable direction.
2. Candidates: regions need at least 3 cells; large regions are split at local maxima 200 km apart; kept candidates are at least 400 km apart (150 km at first) and need robustness of at least 0.25. These shape which places are shown and do not affect validation.
3. Shackleton's day–night range was set to n/a rather than filled with a different quantity.

## Validation (A)

### Design

The known analog sites (`data/known_analogs.csv`, 37 published sites) are the test of the method, not its product. If the score is meaningful, scientists' analogs should rank high on it, and clearly higher than a naive baseline that just picks dry, barren land. Rules:

- **Percentiles.** A site's score is converted to an area-weighted percentile among all scored land cells (1.0 = better than all of Earth's land). A random land cell has a median percentile of 0.50; every run checks this and stops if it is off.
- **Own body only.** A site is scored only against targets of the body it is an analog for (Mars sites against the four Mars targets, Moon sites against the two Moon targets). In the per-target rows of the table a site's score is its score for that one target. In the per-body rows it is the best over the body's targets, and the random baselines also take the best over the same set, so taking the best does not inflate the comparison.
- **Baseline: random barren land.** Cells with maximum NDVI below 0.15 (36,189 cells), the "just pick a desert" strategy.
- **Which sites count.** Sites tagged with at least one scored dimension (`mineralogy` counts as geology) are tested. Sites tagged only biology, operations or subsurface (Lava Beds, Mauna Loa HI-SEAS, Pavilion Lake) are not visible to the score and are reported separately.
- **Significance.** p is the share of 20,000 random barren sets of the same size (cells drawn with probability proportional to area) whose median percentile is at least the observed one. It is a Monte Carlo estimate with an error of about ±0.003.

### Results

| | Sites | Known sites (median percentile) | Random barren land | p |
|---|---|---|---|---|
| **Mars**, best of 4 targets | 26 | **0.89** | 0.76 | **0.024** |
| **Moon**, best of 2 targets | 12 | **0.70** | 0.57 | 0.210 |
| Jezero alone | 26 | 0.87 | 0.56 | 0.002 |
| Arcadia alone | 26 | 0.89 | 0.79 | 0.063 |
| Gale alone | 26 | 0.86 | 0.77 | 0.097 |
| Utopia alone | 26 | 0.87 | 0.79 | 0.080 |
| Marius Hills alone | 12 | 0.73 | 0.60 | 0.199 |
| Shackleton alone | 12 | 0.67 | 0.57 | 0.194 |

Reading: **known Mars analogs rank above random barren land** (the median known site is better than 89% of Earth's land, against 76% for the typical barren cell; p ≈ 0.02 to 0.03). For Jezero on its own the evidence is strong (p = 0.002). For Arcadia, Gale and Utopia on their own the difference is in the same direction but not significant (p between 0.06 and 0.10). For the Moon the sites are in the right direction but there are only 12 and the difference could be chance. Counting every site of the body, including those the score cannot see, gives similar figures (for example Jezero 0.86 with 29 sites).

### What the dimensions show

Median percentile of the dimension score, for sites tagged with that dimension and for random barren cells (Jezero shown; Gale and Arcadia are similar except terrain):

| Dimension | Sites tagged | Known sites | Random barren land |
|---|---|---|---|
| Terrain | 10 | 0.83 | 0.41 |
| Temperature | 4 | 0.91 | 0.81 |
| Aridity | 7 | 0.87 | 0.85 |
| Geology | 15 | 0.57 | 0.07 |
| Ice | 3 | 0.11 | 0.51 |
| Dust | 3 | 0.21 | 0.71 |

- **Terrain and temperature separate known sites from barren land.** Terrain is the strongest signal. For Utopia (the flattest target) the sign reverses (known 0.30 vs barren 0.54): known analogs are rougher than a flat plain, which is why Utopia alone is not significant.
- **Aridity does not separate them, and is nearly uninformative.** This is a limit of the rainfall data, not a finding about deserts. IMERG at 0.1° overestimates desert rainfall: it reads 45 mm/yr at Atacama Yungay (the standard hyperarid analog, in reality a few millimetres), 56 mm/yr at the core of the Lut desert and 122 mm/yr at Death Valley. Against a target of 0 mm/yr a cell scores 0.4 at 2 mm/yr, 0.09 at 5 mm/yr and 0.01 at 10 mm/yr, so only 6.8% of land area scores 0.1 or more, and almost every desert, including the best-known analog, scores close to 0. The dimension therefore mainly identifies the driest few percent of land (the Libyan Sahara, the Antarctic plateau) and says little beyond that. Its weight can be lowered in the app, and a better aridity measure would be the first thing to improve.
- **Geology: barren land is the worst match (0.07).** The basaltic targets match vegetation and ice (high emissivity) better than quartz-rich deserts, so the dimension must be read together with vegetation.
- **Ice and dust go the wrong way for the known sites, for understandable reasons.** The sites tagged ice (McMurdo Dry Valleys, Haughton Crater, Axel Heiberg) are snow-covered by definition, while every Mars target has no surface frost, so a surface-snow measure scores them poorly (decision: the dimension is "surface snow and ice", and Arcadia's ice is below the surface). Mars dust opacity (0.4 to 0.6) is higher than at Qaidam, Mojave and the Namib (0.2 to 0.3), so Earth's dustiest barren land matches best.

### How far to trust this

- **The evidence is modest and not robust to every choice.** p ≈ 0.02 to 0.03 for Mars with 26 sites; the sensitivity table below shows it ranges from 0.002 to 0.09 under reasonable changes. Several sites are not independent (11 of the 37 are in the USA, four are in the Atacama region, and there are pairs in Hawaii and Iceland), and the p-values are not corrected for testing several targets and dimensions.
- **The site list was compiled by us** from published analog sites, before any scoring, and the tags (which dimension a site is known for) are our reading of the literature.
- **The Moon test is weak.** The Moon's analog sites are mostly Apollo-training sites chosen for crater shape or logistics (Ries, Sudbury, Lonar, Cinder Lake), many on vegetated or inhabited land. An environment score cannot be expected to rank them high.
- **Early versions looked better and were wrong.** With five features and no target values for albedo or snow, the score rewarded ice sheets (percentile among barren land: McMurdo Dry Valleys 1.00, Holuhraun 0.99) and the tagged known sites scored a median of 0.75. Completing the features made the result more modest and more honest (McMurdo 0.42, Holuhraun 0.56, same measure).

### Sensitivity of the Mars result

`python -m pipeline.sensitivity` re-runs the Mars test with one choice changed at a time. It reports sensitivity; the design numbers above are not replaced by any variant. Known sites' median percentile vs random barren land's, and p:

| Change | Known vs barren | p |
|---|---|---|
| None (design) | 0.89 vs 0.76 | 0.03 |
| Barren = NDVI < 0.10 / 0.20 / 0.30 (design 0.15) | 0.89 vs 0.77 / 0.80 / 0.82 | 0.03 / 0.06 / 0.09 |
| Leave out any one site (26 runs) | 0.89 to 0.90 vs 0.76 | at most 0.04 |
| Leave out the 4 Atacama sites | 0.87 vs 0.76 | 0.08 |
| Leave out the 4 USA sites that are visible to the score | 0.89 vs 0.76 | 0.05 |
| Leave out the 4 polar sites | 0.90 vs 0.76 | 0.02 |
| Drop terrain (weight 0) | 0.86 vs 0.80 | 0.09 |
| Drop albedo | 0.85 vs 0.81 | 0.09 |
| Drop ice / geology / dust / aridity | 0.84 to 0.95 | 0.02 to 0.05 |
| Drop temperature | 0.90 vs 0.71 | 0.004 |
| Drop vegetation | 0.76 vs 0.35 | 0.002 |
| All σ × 0.7 / × 1.4 | 0.88 / 0.89 vs 0.76 / 0.74 | 0.07 / 0.01 |

The direction (known sites above barren land) holds in every variant. Whether p crosses 0.05 depends on choices: it passes 0.05 when the barren baseline is loosened to include semi-arid land, when the Atacama sites are removed, when all σ are narrowed, or when terrain or albedo is dropped, which are the two dimensions carrying most of the separation. It does not depend on any single site. Dropping vegetation makes the result much stronger because barren land matches the vegetation target (no plants) by construction, so comparing against barren land is a conservative test in that respect. For the Moon the result cannot be interpreted: with 6 of the 12 sites in the USA, removing them gives 0.42 vs 0.57 (p = 0.83), and the sign reverses when albedo or geology is dropped.

## Results: new candidates (A)

For each target the pipeline takes the top 1% of land area, groups the cells into regions, splits large regions at their local maxima, removes anything within 200 km of a known analog and, for the Mars targets, permanent ice sheets, and ranks what is left by score × robustness. Robustness is the share of 500 random changes of the dimension weights (each multiplied by exp(N(0, 0.5))) in which the place stays in the top 50. At most 3 candidates per continent are kept, at least 400 km apart. The result is 55 candidates (`web/data/candidates.geojson`).

Top three for each target (score at the default equal weights; "weakest" shows where the analogy breaks down):

| Target | # | Best cell | Continent | Score | Robust. | Area km² | To nearest known | Weakest dimensions |
|---|---|---|---|---|---|---|---|---|
| Jezero | 1 | 25.9°N 65.4°E | Asia | 0.72 | 1.00 | 47,112 | 798 km | aridity 0.00, temperature 0.05 |
| Jezero | 2 | 25.9°N 60.4°E | Asia | 0.69 | 1.00 | 25,662 | 397 km | aridity 0.00, temperature 0.09 |
| Jezero | 3 | 29.1°N 62.9°E | Asia | 0.68 | 1.00 | 2,704 | 835 km | aridity 0.00, dust 0.27 |
| Gale | 1 | 26.9°N 54.6°E | Asia | 0.71 | 1.00 | 17,873 | 570 km | aridity 0.00, temperature 0.08 |
| Gale | 2 | 18.6°S 69.9°W | South America | 0.65 | 1.00 | 21,252 | 455 km | aridity 0.00, dust 0.00 |
| Gale | 3 | 38.4°N 88.6°E | Asia | 0.64 | 1.00 | 22,004 | 251 km | aridity 0.00, dust 0.00 |
| Utopia | 1 | 25.6°N 61.1°E | Asia | 0.72 | 1.00 | 22,999 | 424 km | aridity 0.00, temperature 0.12 |
| Utopia | 2 | 39.1°N 88.4°E | Asia | 0.69 | 1.00 | 4,192 | 277 km | aridity 0.00, temperature 0.28 |
| Utopia | 3 | 22.6°N 45.1°E | Asia | 0.67 | 1.00 | 2,848 | 1,062 km | aridity 0.00, dust 0.24 |
| Arcadia | 1 | 29.1°N 65.6°E | Asia | 0.74 | 1.00 | 41,286 | 1,014 km | aridity 0.00, temperature 0.20 |
| Arcadia | 2 | 25.9°N 59.6°E | Asia | 0.74 | 1.00 | 25,036 | 361 km | aridity 0.00, temperature 0.16 |
| Arcadia | 3 | 36.1°N 60.4°E | Asia | 0.73 | 1.00 | 29,456 | 1,485 km | aridity 0.00, temperature 0.25 |
| Shackleton | 1 | 29.6°S 69.1°W | South America | 0.64 | 1.00 | 38,365 | 499 km | aridity 0.00, temperature 0.00 |
| Shackleton | 2 | 24.6°S 65.9°W | South America | 0.62 | 1.00 | 21,050 | 285 km | aridity 0.00, temperature 0.00 |
| Shackleton | 3 | 42.6°N 88.1°E | Asia | 0.61 | 1.00 | 16,400 | 530 km | aridity 0.00, temperature 0.01 |
| Marius Hills | 1 | 31.9°N 58.9°E | Asia | 0.77 | 1.00 | 30,720 | 1,000 km | aridity 0.00, temperature 0.67 |
| Marius Hills | 2 | 21.4°S 14.1°E | Africa | 0.77 | 1.00 | 13,031 | 261 km | aridity 0.00, temperature 0.57 |
| Marius Hills | 3 | 28.1°S 18.1°E | Africa | 0.76 | 1.00 | 5,439 | 594 km | aridity 0.00, temperature 0.66 |

What the pattern says:

- The same few regions recur across targets: **the Iranian plateau and Baluchistan** (Dasht-e Lut, Makran and the desert to their east, about 25–36°N, 55–66°E), with one Arabian candidate, the **Altiplano and Atacama**, **Egypt's Eastern Desert and the central Sahara**, the **Tibet–Qaidam–Tarim** area, and, for the Moon targets, southern Africa. This is expected: temperature targets are directional, so terrain, albedo, dust and geology carry the difference between targets.
- **Every top-three candidate in the table has aridity 0.00.** According to IMERG the first-ranked candidate of each target gets 69 to 266 mm/yr, so by this measure they are arid, not hyperarid. Given the bias of the rainfall data explained above, we cannot tell from our data whether they are drier than that. The candidates are therefore places that match on terrain, temperature, albedo, dust and geology, not proven hyperarid ones.
- **"Under-studied" is not yet established.** The nearest site on our list of 37 is 250 km to 1,500 km away, but our list is short, and a place far from it may still be a published analog (the Dasht-e Lut, for example, is a known desert-geomorphology site). A literature check per candidate decides whether it is called "under-studied", and the word "unrecognized" is used only if that search finds nothing.

## What the score cannot see (A), and Earth's limits (B)

**What the score cannot see (A).**

- Biology and habitability, operations, and subsurface environments (lava tubes, ground ice, caves): none of the twelve features measures them. Sites chosen for these reasons (Rio Tinto, Pilbara, Lava Beds, Pavilion Lake, HI-SEAS) are expected to score low or are not counted.
- Subsurface and shadowed ice: the ice dimension is surface snow and ice only, so it does not describe Arcadia's shallow ice or the ice in Shackleton's permanently shadowed craters.
- Mineralogy beyond one silica index; surface texture, rock abundance, dust and regolith properties at metre scale; the 28 km window hides anything smaller.
- Rainfall in deserts is too uncertain at this resolution to separate arid from hyperarid (above).
- Place data are averages of 2021–2023, so rare events (floods, dust storms) are not captured.
- Cells where a dimension has no data (ice-sheet interiors have no vegetation, aerosol or winter albedo) have that dimension skipped, not penalised, so they can score higher than they deserve. The candidate list drops ice sheets for the Mars targets; the map shows them.
- Moon albedo is a global mean; Shackleton's day temperature is an annual maximum, not the monthly mean used on Earth.

**Earth's limits as an analog (B).** *To be written by B: gravity (Moon 1.62 m/s², Mars 3.71 m/s²), vacuum and thin CO₂ atmosphere, and radiation, with sources. `limits` in `web/data/targets.json` is still empty.*

## How to use the atlas, deep dives and next steps (B)

*To be written by B.*

## Reproduce

Environment and downloads: `README.md` and `prep.md`. Then, from the repository root:

```bash
python setup/download_earthdata.py && python setup/download_other.py --check
python -m pipeline.features            # land mask and 12 features
python -m pipeline.targets             # terrain and basalt emissivity for the targets
python -m pipeline.export              # web/data/* and tests/golden_scores.json
python -m pipeline.score --validate    # web/data/validation.json
python -m pipeline.candidates          # web/data/candidates.geojson
python -m pipeline.sensitivity         # how the validation changes under other choices
python -m pipeline.spike               # early science check, prints to the terminal
```

Checks that should pass: `python -m pipeline.test_score`, `test_terrain`, `test_candidates`, `test_export`. Rebuilding every feature from the raw data gives bit-identical arrays.

## Data and software credits

NASA LP DAAC (MODIS MOD11C3, MOD13C2, MCD43C3), NASA LAADS DAAC (MOD08_M3), NSIDC DAAC (MOD10CM), NASA GES DISC (GPM IMERG), USGS (GMTED2010), NASA PDS Geosciences Node (MGS MOLA, LRO LOLA, LRO Diviner), Mars Climate Database v6.2 (LMD, Open University, IAA, ESA, CNES), Natural Earth country polygons (public domain). Williams, J.-P., Paige, D. A., Greenhagen, B. T., and Sefton-Nash, E. (2017), The global surface temperatures of the Moon as measured by the Diviner Lunar Radiometer Experiment, Icarus 283, 300–325. Known analog sites and their references: `data/known_analogs.csv`.
