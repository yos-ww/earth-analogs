# Pre-hackathon prep: accounts, install, data

Goal: walk in with the Python environment working and every core dataset already on disk (about 15 GB), so hour 0 starts on code, not downloads. Sizes and file names were checked against NASA CMR and the PDS Geosciences listings on 2026-11-13.

> **Check the rules first.** Most hackathons allow installing tools and downloading public data beforehand, but not writing project code. If unsure, ask the organizers. Everything below is setup and data only.

## 1. Accounts (both people, ~15 min)

- [ ] **NASA Earthdata Login**: https://urs.earthdata.nasa.gov/users/new. All MODIS and GPM data needs it.
- [ ] In your Earthdata profile → *Applications → Authorized Apps* → approve **"NASA GESDISC DATA ARCHIVE"**. The GPM precipitation download fails without this, and it is the usual gotcha.
- [ ] **GitHub**: one of you creates the repo; add the other as a collaborator; turn on GitHub Pages later.
- [ ] Stretch only: **Copernicus Data Space** (https://dataspace.copernicus.eu/) for Sentinel-1/2, and **JAXA G-Portal** (https://gportal.jaxa.jp/gpr/index/index) registration.
- [ ] Update Claude Code on both machines (`claude update`), and confirm both of you can log in.

## 2. Python environment (one machine does the data; both should have it)

macOS's Python 3.9 is too old, and Homebrew's GDAL cannot read the HDF4 files that MODIS uses. Use micromamba with conda-forge:

```bash
brew install micromamba
micromamba shell init -s zsh && exec zsh
micromamba create -n analogs -c conda-forge -y \
  python=3.12 gdal libgdal-hdf4 libgdal-hdf5 libgdal-netcdf pyhdf \
  rasterio rioxarray xarray netcdf4 h5netcdf h5py \
  numpy scipy pandas geopandas shapely pyproj scikit-learn \
  earthaccess matplotlib jupyterlab tqdm
micromamba activate analogs
```

Check it:

```bash
gdalinfo --formats | grep -iE "HDF4|HDF5|netCDF|PDS"   # all four must appear
python -c "import pyhdf, rasterio, xarray, earthaccess; print('ok')"
python -c "import earthaccess; earthaccess.login(strategy='interactive', persist=True)"  # writes ~/.netrc
```

## 3. Data to download tonight (~15 GB, runs unattended)

Put everything under `data/raw/<dataset>/`. Add `data/raw/` to `.gitignore`.

### Earth: NASA Earthdata (use `earthaccess`; all are cloud-hosted)

| Dataset (short name, version) | What | Take | Size |
|---|---|---|---|
| `MOD11C3` v061 | Land surface temperature, monthly, 0.05° | 2021–2023, 36 files | ~2.4 GB |
| `MOD13C2` v061 | NDVI (vegetation), monthly, 0.05° | 2022–2023, 24 files | ~2.4 GB |
| `MCD43C3` v061 | Albedo, **daily**, 0.05° | 2023, **one day per month (15th)**, 12 files | ~2 GB (the full year is 74 GB, so don't) |
| `MOD10CM` v61 | Snow cover, monthly, 0.05° | 2021–2023, 36 files | ~45 MB |
| `MOD08_M3` v6.1 | Aerosol / dust (AOD), monthly, 1° | 2023, 12 files | ~4.2 GB |
| `GPM_3IMERGM` v07 | Precipitation, monthly, 0.1° | 2021–2023, 36 files | ~0.6 GB |

Pattern (one call per dataset):

```python
import earthaccess
earthaccess.login()
g = earthaccess.search_data(short_name="MOD11C3", version="061",
                            temporal=("2021-01-01", "2023-12-31"))
earthaccess.download(g, "data/raw/MOD11C3", threads=8)
```

For `MCD43C3`, search one day at a time, e.g. `temporal=("2023-01-15", "2023-01-15")` for each month, **then keep only the file whose name has that day's `.A2023DDD.` stamp**. Each daily albedo file covers a 16-day window, so a one-day search returns 16 files (about 33 GB in total instead of 2 GB). The same overlap pulls December 2022 into a 2023 `MOD08_M3` search. `setup/download_earthdata.py` already filters both.

### Earth: elevation (USGS GMTED2010, direct links)

- Mean elevation, 30″: https://edcintl.cr.usgs.gov/downloads/sciweb1/shared/topo/downloads/GMTED/Grid_ZipFiles/mn30_grd.zip (277 MB)
- Std. deviation (roughness), 30″: https://edcintl.cr.usgs.gov/downloads/sciweb1/shared/topo/downloads/GMTED/Grid_ZipFiles/sd30_grd.zip (126 MB)

### Mars: PDS Geosciences

- **MOLA topography, 64 px/deg (~0.9 km)**: the four `megt*` files (topography; `megr` is radius and `megc` is counts, so skip those), ~133 MB each, plus their `.lbl` labels:
  https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg064/
  (`megt00n000gb`, `megt00n180gb`, `megt90n000gb`, `megt90n180gb`)
- **TES thermal inertia maps**: https://pds-geosciences.wustl.edu/mgs/mgs-m-tes-5-timap-v1/mgst_9001.zip (66 MB). Note: this volume has **no albedo map**. For Mars albedo, use the USGS Astrogeology TES albedo mosaic or cited literature values per site (not yet verified).

### Moon: PDS Geosciences (LRO)

- **LOLA global elevation, 64 px/deg**: https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img/ldem_64.img + `.lbl` (530 MB)
- **LOLA south-pole elevation**: same base path, `polar/img/ldem_75s_240m.img` (29 MB, for the ~1 km baseline) and `ldem_80s_80m.img` (115 MB, for the deep-dive terrain) + `.lbl`
- **Diviner Polar Resource Products, south**: https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_prp/dlre_prp_south.tab + `.xml` + `.lbl` (605 MB)

GDAL reads the PDS3 `.img` files directly when the `.lbl` sits next to them, so always download both.

## 4. Non-code prep (allowed and worth doing)

- [ ] **Target coordinates** (double-check each):
  - **Mars:** Jezero (18.4°N, 77.6°E), Gale (5.4°S, 137.8°E), Zhurong / Utopia Planitia (25.1°N, 109.9°E), Arcadia Planitia ice region (~40–50°N, ~190–200°E).
  - **Moon:** Shackleton–de Gerlache ridge (~89.5°S), Marius Hills pit (14.1°N, 303.2°E).
- [ ] **Known-analog list** with coordinates (~15 sites; the list is in `plan.md`). This is needed for validation and the novelty filter.
- [ ] **Literature values per target:** temperature range, albedo, ice evidence. Save the source URL for each value.
- [ ] **Globe textures** for the 3D view: NASA Blue Marble (Earth), a USGS Mars color mosaic, and an LROC WAC mosaic (Moon), as equirectangular images of about 4–8k px.
- [ ] Decide who is Person A (data) and Person B (app + story).

## 5. Morning-of sanity check (5 min)

- [ ] `micromamba activate analogs` works on both machines.
- [ ] Open one file per dataset: `gdalinfo` on one MOD11C3 `.hdf`, one IMERG file, `mn30_grd`, one `megt*.img`, and `ldem_64.img`. Each should print a size and a coordinate system.
- [ ] `du -sh data/raw/*` matches the sizes above.
