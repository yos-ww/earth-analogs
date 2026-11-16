"""Compute the 0.25 degree land mask and Earth features from data/raw/.

Usage (from the repo root):
    ~/mamba/envs/analogs/bin/python -m pipeline.features            # everything available
    ~/mamba/envs/analogs/bin/python -m pipeline.features land ndvi_max roughness

Each result is saved as data/interim/<name>.npy with shape (720, 1440), NaN = no data
(land is a bool array). pipeline/export.py turns these into web/data/*.
"""

import glob
import re
import sys

import numpy as np
from osgeo import gdal
from scipy.ndimage import uniform_filter1d

from .common import INTERIM, NCOLS, NROWS, RAW, cell_lat

gdal.UseExceptions()

# 0.05 deg MODIS grid (7200 x 3600) -> 0.25 deg grid: 5 x 5 sub-pixels per cell.
SUB = 5


def _save(name, arr):
    INTERIM.mkdir(parents=True, exist_ok=True)
    np.save(INTERIM / f"{name}.npy", arr)
    print(f"saved {name}.npy {arr.shape} {arr.dtype}")


def _load(name):
    return np.load(INTERIM / f"{name}.npy")


def _subdataset(path, key):
    for name, _desc in gdal.Open(path).GetSubDatasets():
        if name.rstrip('"').endswith(key):  # GDAL names end with a closing quote
            return name
    raise KeyError(f"{key} not found in {path}")


def to_cells(a05, valid05):
    """Average a 0.05 deg array over the 5x5 sub-pixels of each 0.25 deg cell,
    using only valid sub-pixels. Cells with no valid sub-pixel become NaN."""
    a = np.where(valid05, a05, 0.0).reshape(NROWS, SUB, NCOLS, SUB)
    n = valid05.reshape(NROWS, SUB, NCOLS, SUB).sum(axis=(1, 3))
    s = a.sum(axis=(1, 3))
    return np.where(n > 0, s / np.maximum(n, 1), np.nan).astype(np.float32)


# ---------------------------------------------------------------- land mask


def land_mask_005():
    """0.05 deg land mask (3600 x 7200, True = land).

    MOD10CM flags water with 254 (ocean and inland water). The flag is identical in all
    months, so a pixel is land if it is never flagged. Antarctica and Greenland count as
    land; lakes and the Caspian do not.
    """
    files = sorted(glob.glob(str(RAW / "MOD10CM" / "*.hdf")))
    water = np.zeros((3600, 7200), np.uint8)
    for f in files:
        a = gdal.Open(_subdataset(f, "Snow_Cover_Monthly_CMG")).ReadAsArray()
        water += a == 254
    return water < len(files) / 2


def build_land():
    land05 = land_mask_005()
    _save("land005", land05)
    frac = land05.reshape(NROWS, SUB, NCOLS, SUB).mean(axis=(1, 3))
    land = frac >= 0.5  # a cell is land if at least half of its 25 sub-pixels are
    _save("land", land)
    print(f"land cells: {land.sum()}")


# --------------------------------------------------------------------- NDVI


def build_ndvi_max():
    """Yearly max NDVI: per 0.05 deg pixel the maximum over the 24 months (2022-2023),
    then the mean over the valid land sub-pixels of each cell. Negative values on land are
    snow/cloud/water contamination, so NDVI is clipped to [0, 1]."""
    land05 = _load("land005")
    best = np.full((3600, 7200), -np.inf, np.float32)
    files = sorted(glob.glob(str(RAW / "MOD13C2" / "*.hdf")))
    for f in files:
        d = gdal.Open(_subdataset(f, "CMG 0.05 Deg Monthly NDVI")).ReadAsArray()
        ok = (d >= -2000) & (d <= 10000)  # valid_range; fill is -3000
        v = np.where(ok, d / 10000.0, -np.inf).astype(np.float32)
        best = np.maximum(best, v)
    valid = np.isfinite(best) & land05
    ndvi = np.clip(np.where(valid, best, 0.0), 0.0, 1.0)
    _save("ndvi_max", to_cells(ndvi, valid))


# ---------------------------------------------------------------- roughness

GM_PX_PER_CELL = 30  # GMTED 30 arc-second pixels per 0.25 deg
GM_NCOLS = 43200
GM_NROWS = 20880
GM_TOP_ROW = 24  # GMTED starts at 84N = grid row 24 (cell rows 0-23 have no GMTED data)
MIN_WINDOW_PX = 100  # land pixels needed in the window
GM_DY_M = 6371008.8 * np.pi / 180 / 120  # ground length of one 30" pixel in latitude, 926.6 m


def build_terrain():
    """Terrain features from GMTED2010 mean elevation (30 arc-seconds, 84N-90S), in a fixed
    window of about 28 x 28 km around each cell centre (review decision 2):
      roughness = standard deviation of elevation in the window
      relief    = maximum - minimum elevation in the window
      slope     = mean slope in degrees

    A cell's 30 GMTED rows (27.8 km north-south) are its latitude band. The east-west width is
    30 / cos(latitude) pixels, so the window is about 28 km wide on the ground at every latitude.
    GMTED shows the ocean as 0 m, so ocean and inland-water pixels are removed with the land
    mask. Slope is a central difference in ground metres: one pixel either side north-south
    (about 1.9 km baseline) and round(1 / cos(lat)) pixels either side east-west, so the
    east-west baseline is also about 1.9 km at any latitude. Only pixels whose four neighbours
    are land get a slope. Cells north of 84N have no GMTED data (NaN).
    """
    from scipy.ndimage import maximum_filter1d, minimum_filter1d

    land005 = _load("land005")
    ds = gdal.Open("/vsizip/" + str(RAW / "gmted" / "mn30_grd.zip") + "/mn30_grd")
    band = ds.GetRasterBand(1)
    lat = cell_lat()
    shape = (NROWS, NCOLS)
    rough, relief, slope = (np.full(shape, np.nan, np.float32) for _ in range(3))
    centres = np.arange(NCOLS) * GM_PX_PER_CELL + GM_PX_PER_CELL // 2

    for r in range(GM_TOP_ROW, NROWS):
        k0 = (r - GM_TOP_ROW) * GM_PX_PER_CELL
        want = np.clip(np.arange(k0 - 1, k0 + GM_PX_PER_CELL + 1), 0, GM_NROWS - 1)  # 1 row of margin
        first, last = int(want.min()), int(want.max())
        raw = band.ReadAsArray(0, first, GM_NCOLS, last - first + 1)
        E = raw[want - first].astype(np.float64)  # (32, 43200); margin rows repeat at the edges
        M = np.repeat(land005[120 + want // 6], 6, axis=1) & (E > -32000)
        e, m = E[1:-1], M[1:-1]  # the 30 rows of this cell row

        # --- window statistics (roughness, relief)
        s1 = (e * m).sum(axis=0)
        s2 = (e * e * m).sum(axis=0)
        cnt = m.sum(axis=0).astype(np.float64)
        w = 2 * int(round(15 / np.cos(np.radians(lat[r])))) + 1  # odd, >= 31
        S1, S2, C = (uniform_filter1d(x, size=w, mode="wrap")[centres] * w for x in (s1, s2, cnt))
        ok = C >= MIN_WINDOW_PX
        mean = np.where(ok, S1 / np.maximum(C, 1), 0.0)
        rough[r] = np.where(ok, np.sqrt(np.maximum(S2 / np.maximum(C, 1) - mean**2, 0.0)), np.nan)
        hi = maximum_filter1d(np.where(m, e, -np.inf).max(axis=0), size=w, mode="wrap")[centres]
        lo = minimum_filter1d(np.where(m, e, np.inf).min(axis=0), size=w, mode="wrap")[centres]
        relief[r] = np.where(ok, hi - lo, np.nan)

        # --- slope in ground metres
        kx = max(1, int(round(1 / np.cos(np.radians(lat[r])))))
        dx = GM_DY_M * np.cos(np.radians(lat[r]))
        gy = (E[2:] - E[:-2]) / (2 * GM_DY_M)
        gx = (np.roll(e, -kx, axis=1) - np.roll(e, kx, axis=1)) / (2 * kx * dx)
        sm = m & M[2:] & M[:-2] & np.roll(m, -kx, axis=1) & np.roll(m, kx, axis=1)
        sl = np.degrees(np.arctan(np.hypot(gx, gy)))
        T = [
            uniform_filter1d(x, size=w, mode="wrap")[centres] * w
            for x in ((sl * sm).sum(axis=0), sm.sum(axis=0).astype(np.float64))
        ]
        slope[r] = np.where(
            T[1] >= MIN_WINDOW_PX, np.maximum(T[0], 0.0) / np.maximum(T[1], 1), np.nan
        )  # clip float residue
        if r % 100 == 0:
            print(f"terrain row {r}/{NROWS}")
    _save("roughness", rough)
    _save("relief", relief)
    _save("slope", slope)


# ----------------------------------------------------------- precipitation

HOURS_PER_YEAR = 8766  # 365.25 * 24


def build_precip():
    """Mean precipitation in mm/yr: IMERG monthly rate (mm/h) averaged over the 36 months
    of 2021-2023, times hours per year.

    The array is stored (lon, lat) with latitude running south to north and no georeference,
    so it is transposed and flipped to north-up (checked: correlation with NDVI is 0.66 this
    way and 0.18 unflipped). The 0.1 deg grid is repeated to 0.05 deg, then averaged over the
    land sub-pixels of each cell. IMERG is unreliable over Antarctica and Greenland.
    """
    land05 = _load("land005")
    acc = np.zeros((3600, 1800))
    cnt = np.zeros((3600, 1800))
    for f in sorted(glob.glob(str(RAW / "IMERG" / "*"))):
        name = [n for n, _ in gdal.Open(f).GetSubDatasets() if n.endswith("/Grid/precipitation")][0]
        a = gdal.Open(name).ReadAsArray()
        ok = a > -9000  # fill is -9999.9
        acc += np.where(ok, a, 0.0)
        cnt += ok
    mean = np.where(cnt > 0, acc / np.maximum(cnt, 1), np.nan).T[::-1]  # (1800 lat N->S, 3600 lon)
    p05 = np.repeat(np.repeat(mean, 2, axis=0), 2, axis=1) * HOURS_PER_YEAR  # 3600 x 7200
    valid = np.isfinite(p05) & land05
    _save("precip", to_cells(np.where(valid, p05, 0.0), valid))


# ------------------------------------------------------ MOD11C3 (LST, emissivity)

MIN_CLIM_MONTHS = 6  # coldest-month night LST needs at least this many calendar months with data


def _modis_files(product):
    """Map calendar month (1-12) -> list of file paths, from the .AYYYYDDD. stamp."""
    from datetime import date, timedelta

    by_month = {m: [] for m in range(1, 13)}
    for f in sorted(glob.glob(str(RAW / product / "*.hdf"))):
        y, doy = re.search(r"\.A(\d{4})(\d{3})\.", f).groups()
        by_month[(date(int(y), 1, 1) + timedelta(days=int(doy) - 1)).month].append(f)
    return by_month


def build_lst():
    """Temperature features from MOD11C3 monthly LST at 0.05 deg (2021-2023).

    For each calendar month the available years are averaged (climatology), giving 12 monthly
    means for day and for night. Then:
      lst_night_cold = coldest of the 12 night means      (monthly means, not single nights)
      lst_day_warm   = warmest of the 12 day means
      lst_range      = mean over months of (day mean - night mean), months where both exist
    Each needs at least MIN_CLIM_MONTHS months with data. Terra passes at about 10:30 local
    time (review decision 4: planetary day values are picked at the same local time). Winter
    months that are missing (polar night, persistent cloud) bias coldest-night warm and the
    range, so high-latitude values are bounds, not measurements.
    """
    land05 = _load("land005")
    shape = (3600, 7200)
    coldest = np.full(shape, np.inf, np.float32)
    warmest = np.full(shape, -np.inf, np.float32)
    n_night = np.zeros(shape, np.uint8)
    n_day = np.zeros(shape, np.uint8)
    diff_sum = np.zeros(shape, np.float32)
    n_diff = np.zeros(shape, np.uint8)
    for month, files in _modis_files("MOD11C3").items():
        clim = {}
        for key, name in (("day", "LST_Day_CMG"), ("night", "LST_Night_CMG")):
            s_ = np.zeros(shape, np.float32)
            n_ = np.zeros(shape, np.uint8)
            for f in files:
                d = gdal.Open(_subdataset(f, name)).ReadAsArray()
                ok = d >= 7500  # valid_range 7500-65535, fill 0; scale 0.02 K
                s_ += np.where(ok, d * 0.02, 0.0)
                n_ += ok
            clim[key] = (np.where(n_ > 0, s_ / np.maximum(n_, 1), np.nan), n_ > 0)
        (day, day_ok), (night, night_ok) = clim["day"], clim["night"]
        coldest = np.where(night_ok, np.minimum(coldest, night), coldest)
        warmest = np.where(day_ok, np.maximum(warmest, day), warmest)
        n_night += night_ok
        n_day += day_ok
        both = day_ok & night_ok
        diff_sum += np.where(both, day - night, 0.0)
        n_diff += both
    v_night = (n_night >= MIN_CLIM_MONTHS) & land05
    v_day = (n_day >= MIN_CLIM_MONTHS) & land05
    v_rng = (n_diff >= MIN_CLIM_MONTHS) & land05
    _save("lst_night_cold", to_cells(np.where(v_night, coldest, 0.0), v_night))
    _save("lst_day_warm", to_cells(np.where(v_day, warmest, 0.0), v_day))
    _save("lst_range", to_cells(np.where(v_rng, diff_sum / np.maximum(n_diff, 1), 0.0), v_rng))


def build_emis_b29():
    """Emissivity at 8.55 um (MODIS band 29): per-pixel median over the 36 monthly MOD11C3
    files, ignoring months with no data. value = code * 0.002 + 0.49, 0 = no data.
    Low = quartz-rich (sand seas about 0.75), high = basalt and other low-silica rock
    (about 0.97); vegetation is also high, so read it together with NDVI."""
    land05 = _load("land005")
    files = [f for fs in _modis_files("MOD11C3").values() for f in fs]
    stack = np.zeros((len(files), 3600, 7200), np.uint8)
    for i, f in enumerate(files):
        stack[i] = gdal.Open(_subdataset(f, "Emis_29")).ReadAsArray()
    med = np.zeros((3600, 7200), np.uint8)
    nvalid = (stack != 0).sum(axis=0)
    for r0 in range(0, 3600, 300):  # sort in row chunks to keep memory low
        chunk = np.where(stack[:, r0 : r0 + 300] == 0, 255, stack[:, r0 : r0 + 300])
        chunk.sort(axis=0)
        idx = np.maximum(nvalid[r0 : r0 + 300] - 1, 0) // 2  # lower median of the valid months
        med[r0 : r0 + 300] = np.take_along_axis(chunk, idx[None], axis=0)[0]
    valid = (nvalid > 0) & land05
    _save("emis_b29", to_cells(np.where(valid, med * 0.002 + 0.49, 0.0), valid))


# ------------------------------------------------------------------- albedo

MIN_ALBEDO_DAYS = 4  # of the 12 sampled days


def build_albedo():
    """White-sky shortwave albedo (MCD43C3, the 15th of each month of 2023): per-pixel median
    of the valid days, then the mean over the valid land sub-pixels of each cell. scale 0.001,
    fill 32767 (polar night), valid 0-32766. The median limits the effect of seasonal snow;
    days with no data (polar night) are left out, so polar values describe the sunlit season."""
    land05 = _load("land005")
    files = sorted(glob.glob(str(RAW / "MCD43C3" / "*.hdf")))
    stack = np.full((len(files), 3600, 7200), 32767, np.int16)
    for i, f in enumerate(files):
        stack[i] = gdal.Open(_subdataset(f, "Albedo_WSA_shortwave")).ReadAsArray()
    nvalid = (stack != 32767).sum(axis=0)
    med = np.zeros((3600, 7200), np.float32)
    for r0 in range(0, 3600, 300):  # sort in row chunks to keep memory low
        chunk = np.sort(stack[:, r0 : r0 + 300], axis=0)  # fill (32767) sorts last
        n = nvalid[r0 : r0 + 300]
        lo = np.take_along_axis(chunk, (np.maximum(n - 1, 0) // 2)[None], axis=0)[0]
        hi = np.take_along_axis(chunk, (n // 2)[None], axis=0)[0]
        med[r0 : r0 + 300] = (lo.astype(np.float32) + hi) / 2 * 0.001
    valid = (nvalid >= MIN_ALBEDO_DAYS) & land05
    _save("albedo", to_cells(np.where(valid, med, 0.0), valid))


# ----------------------------------------------------------------- snow / ice


def build_snow_ice():
    """Snow/ice cover fraction (0-1) from MOD10CM monthly snow cover (2021-2023, 35 files).

    Only codes 0-100 are snow data; 211 (night), 250 (cloud), 253, 254 and 255 are missing,
    never zero. For each calendar month the available years are averaged, then the mean over
    the months with data is taken; a pixel needs at least MIN_CLIM_MONTHS months. Polar-night
    months are missing, so Arctic values describe the sunlit season and read low. This is
    surface snow and ice only: subsurface ice is not seen (review decision 3)."""
    land05 = _load("land005")
    shape = (3600, 7200)
    total = np.zeros(shape, np.float32)
    n_months = np.zeros(shape, np.uint8)
    for month, files in _modis_files("MOD10CM").items():
        s_ = np.zeros(shape, np.float32)
        n_ = np.zeros(shape, np.uint8)
        for f in files:
            d = gdal.Open(_subdataset(f, "Snow_Cover_Monthly_CMG")).ReadAsArray()
            ok = d <= 100
            s_ += np.where(ok, d, 0.0)
            n_ += ok
        total += np.where(n_ > 0, s_ / np.maximum(n_, 1), 0.0)
        n_months += n_ > 0
    valid = (n_months >= MIN_CLIM_MONTHS) & land05
    frac = total / np.maximum(n_months, 1) / 100.0
    _save("snow_ice", to_cells(np.where(valid, frac, 0.0), valid))


# ----------------------------------------------------------------------- dust

MIN_AOD_MONTHS = 4  # of the 12 months of 2023


def build_aod():
    """Deep Blue aerosol optical depth at 550 nm over land (MOD08_M3, 12 months of 2023, 1 deg):
    mean of the monthly means, needing at least MIN_AOD_MONTHS months. raw * 0.001, fill -9999,
    valid 0-5000. No retrieval over snow and ice. Each 1 deg pixel covers 4 x 4 cells."""
    acc = np.zeros((180, 360))
    cnt = np.zeros((180, 360))
    for f in sorted(glob.glob(str(RAW / "MOD08_M3" / "*.hdf"))):
        d = gdal.Open(_subdataset(f, "Deep_Blue_Aerosol_Optical_Depth_550_Land_Mean_Mean")).ReadAsArray()
        ok = (d >= 0) & (d <= 5000)
        acc += np.where(ok, d * 0.001, 0.0)
        cnt += ok
    mean = np.where(cnt >= MIN_AOD_MONTHS, acc / np.maximum(cnt, 1), np.nan)
    _save("aod", np.repeat(np.repeat(mean, 4, axis=0), 4, axis=1).astype(np.float32))


BUILDERS = {
    "land": build_land,
    "ndvi_max": build_ndvi_max,
    "roughness": build_terrain,
    "relief": build_terrain,
    "slope": build_terrain,  # one pass
    "precip": build_precip,
    "emis_b29": build_emis_b29,
    "albedo": build_albedo,
    "snow_ice": build_snow_ice,
    "aod": build_aod,
    "lst_night_cold": build_lst,
    "lst_day_warm": build_lst,
    "lst_range": build_lst,  # one pass
}

if __name__ == "__main__":
    names = sys.argv[1:] or list(BUILDERS)
    done = set()
    for n in names:
        if BUILDERS[n] not in done:  # build_lst serves three features
            done.add(BUILDERS[n])
            BUILDERS[n]()
