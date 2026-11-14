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
GM_TOP_ROW = 24  # GMTED starts at 84N = grid row 24 (cell rows 0-23 have no GMTED data)
MIN_WINDOW_PX = 100  # land pixels needed in the window


def build_roughness():
    """Standard deviation of GMTED elevation in a fixed window of about 28 x 28 km.

    A cell's 30 GMTED rows (27.8 km north-south) are its latitude band. The east-west width
    is 30 / cos(latitude) pixels, so the window is about 28 km wide on the ground at every
    latitude (review decision 2). GMTED shows the ocean as 0 m, so ocean and inland-water
    pixels are removed with the land mask. Cells north of 84N have no GMTED data (NaN).
    """
    land005 = _load("land005")
    ds = gdal.Open("/vsizip/" + str(RAW / "gmted" / "mn30_grd.zip") + "/mn30_grd")
    band = ds.GetRasterBand(1)
    lat = cell_lat()
    out = np.full((NROWS, NCOLS), np.nan, np.float32)
    centres = np.arange(NCOLS) * GM_PX_PER_CELL + GM_PX_PER_CELL // 2

    for r in range(GM_TOP_ROW, NROWS):
        k0 = (r - GM_TOP_ROW) * GM_PX_PER_CELL
        e = band.ReadAsArray(0, k0, GM_NCOLS, GM_PX_PER_CELL).astype(np.float64)
        j0 = 120 + k0 // 6  # 0.05 deg row of this band (GMTED pixel = 1/6 of a 0.05 pixel)
        m = np.repeat(np.repeat(land005[j0:j0 + 5], 6, axis=0), 6, axis=1)
        m = m & (e > -32000)
        s1 = (e * m).sum(axis=0)
        s2 = (e * e * m).sum(axis=0)
        cnt = m.sum(axis=0).astype(np.float64)

        w = 2 * int(round(15 / np.cos(np.radians(lat[r])))) + 1  # odd, >= 31
        tot = [uniform_filter1d(x, size=w, mode="wrap") * w for x in (s1, s2, cnt)]
        S1, S2, C = (t[centres] for t in tot)
        ok = C >= MIN_WINDOW_PX
        mean = np.where(ok, S1 / np.maximum(C, 1), 0.0)
        var = np.where(ok, S2 / np.maximum(C, 1) - mean**2, np.nan)
        out[r] = np.sqrt(np.maximum(var, 0.0))
        if r % 100 == 0:
            print(f"roughness row {r}/{NROWS}")
    _save("roughness", out)


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


def build_lst_night_cold():
    """Coldest-month night land-surface temperature (K).

    MOD11C3 gives monthly mean night LST at 0.05 deg. For each calendar month the available
    years (2021-2023) are averaged, then the coldest of the 12 climatological months is taken
    (monthly means, not single-night extremes, to match the planetary values). A pixel needs
    at least MIN_CLIM_MONTHS months with data; winter months that are missing (polar night,
    persistent cloud) bias the result warm, so high-latitude values are upper bounds.
    """
    land05 = _load("land005")
    coldest = np.full((3600, 7200), np.inf, np.float32)
    n_months = np.zeros((3600, 7200), np.uint8)
    for month, files in _modis_files("MOD11C3").items():
        s = np.zeros((3600, 7200), np.float32)
        n = np.zeros((3600, 7200), np.uint8)
        for f in files:
            d = gdal.Open(_subdataset(f, "LST_Night_CMG")).ReadAsArray()
            ok = d >= 7500  # valid_range 7500-65535, fill 0
            s += np.where(ok, d * 0.02, 0.0)
            n += ok
        clim = np.where(n > 0, s / np.maximum(n, 1), np.inf)
        coldest = np.minimum(coldest, clim)
        n_months += n > 0
    valid = (n_months >= MIN_CLIM_MONTHS) & np.isfinite(coldest) & land05
    _save("lst_night_cold", to_cells(np.where(valid, coldest, 0.0), valid))


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
        chunk = np.where(stack[:, r0:r0 + 300] == 0, 255, stack[:, r0:r0 + 300])
        chunk.sort(axis=0)
        idx = np.maximum(nvalid[r0:r0 + 300] - 1, 0) // 2  # lower median of the valid months
        med[r0:r0 + 300] = np.take_along_axis(chunk, idx[None], axis=0)[0]
    valid = (nvalid > 0) & land05
    _save("emis_b29", to_cells(np.where(valid, med * 0.002 + 0.49, 0.0), valid))


BUILDERS = {
    "land": build_land, "ndvi_max": build_ndvi_max, "roughness": build_roughness,
    "precip": build_precip, "lst_night_cold": build_lst_night_cold, "emis_b29": build_emis_b29,
}

if __name__ == "__main__":
    names = sys.argv[1:] or list(BUILDERS)
    for n in names:
        BUILDERS[n]()
