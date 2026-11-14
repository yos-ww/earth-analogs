# Review notes on plan.md

Review of `plan.md`, `prep.md` and `setup/download_earthdata.py` at commit `e96648f`. The plan is strong; these are the fixes worth making before or in hour 0. Items 1 and 2 matter most, because they bear directly on the hour-11 science check.

## Fix before the science check

1. **Validation baseline bias.** Each known site is scored against its *best-matching* target (max over 6). Taking the best of 6 raises any cell's score, so the random-land and random-barren baselines must also take their best of 6. Otherwise known sites beat the baselines partly because of the max. Alternative: score each site only against the body it is a known analog for.

2. **The terrain window shrinks with latitude.** A 0.25° cell is about 28 km wide at the equator but about 9.5 km at 70°N. Relief and roughness over a smaller window come out lower, so high-latitude terrain looks flatter, which tilts matches toward the flat Mars landing sites. Use a fixed window of about 28 × 28 km for every Earth cell, as is already done for Mars and the Moon.

## Settle in hour 0 (write into CLAUDE.md)

3. **Ice compares different things.** MOD10CM is surface snow cover. Arcadia Planitia's ice is shallow subsurface ice, and the lunar south-pole ice sits in permanently shadowed craters. Either add a permafrost layer (for example ESA CCI Permafrost) or call the dimension "surface frost/snow" and state the limit in the write-up.

4. **Day temperature time of day.** MOD11C3 (Terra) is measured at about 10:30 local time, while Mars rover day temperatures are usually early afternoon. MYD11C3 (Aqua, about 13:30) is closer. Or pick the Mars values at the same local time.

5. **Albedo definitions differ.** Earth: MODIS white-sky shortwave. Mars: usually TES bolometric. Moon: often normal albedo. Record which kind each value in `targets.json` is.

6. **Polar LOLA grid.** `ldem_75s_240m` is polar stereographic, so the "east-west spacing × cos(lat)" slope rule does not apply; compute slope from projected x/y metres. Read scale and offset from each `.lbl` instead of hardcoding 0.5 m: GDAL reports them but does not apply them.

7. **Targets need one exact centre point.** Arcadia is given as "~40–50°N, ~190–200°E", about 600 km across, but terrain is scored in a 28 km window.

## Smaller items

- `setup/download_earthdata.py:31`: `granule.data_links()[0]` raises IndexError if a granule has no links. Add a guard.
- `earthaccess` skips a file that already exists without checking its size. Compare `du -sh` with the expected sizes (`prep.md` §5).
- GMTED and the PDS files are downloaded by hand. Script them too, for a reproducible submission.
- IMERG precipitation is unreliable over Antarctica and Greenland. Note it in the write-up.
- Add a README by Checkpoint 2; judges will open the repo link.
- globe.gl: to re-colour live, update a `THREE.CanvasTexture` on `globeMaterial()` and set `needsUpdate = true`, rather than reloading the image by URL.
