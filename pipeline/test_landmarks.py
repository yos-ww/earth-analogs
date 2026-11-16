"""Checks of web/data/ against the outside world, done independently of the pipeline's own code
where possible. Needs data/raw/ (Person A's machine):
    ~/mamba/envs/analogs/bin/python -m pipeline.test_landmarks

1. Georeferencing of the planetary grids: MOLA elevation at three landing sites, read with plain
   array maths (no GDAL transform), against published values.
2. Orientation of the Earth raw files: MOD08 aerosol and MOD11C3 temperature read straight from
   the HDF files at points whose mirror image is clearly different.
3. Earth landmarks decoded from features.bin fall in physically sensible ranges.
4. Candidates: an independent implementation of the scoring rules in docs/contract.md gives the
   scores in candidates.geojson, and the distances and filters hold.
"""

import csv
import glob
import json

import numpy as np
from osgeo import gdal

from .common import RAW, ROOT, WEB_DATA
from .score import cell_index, load_grid

gdal.UseExceptions()

# (lat, lon, published elevation in m relative to the MOLA areoid, source)
MARS_LANDINGS = {
    "Perseverance, Octavia E. Butler Landing": (18.4447, 77.4508, -2569),
    "Curiosity, Bradbury Landing": (-4.5895, 137.4417, -4501),
    "Zhurong": (25.066, 109.925, -4100),
}


def mola_point(lat, lon):
    """MOLA MEGDR 64 px/deg tiles are 90 deg x 180 deg, big-endian int16 metres."""
    lon360 = lon % 360
    top, west = ("90n", 90) if lat >= 0 else ("00n", 0), ("000", 0) if lon360 < 180 else ("180", 180)
    a = np.memmap(RAW / "mola" / f"megt{top[0]}{west[0]}gb.img", ">i2", "r", shape=(5760, 11520))
    return float(a[int((top[1] - lat) * 64), int((lon360 - west[1]) * 64)])


def check_mola():
    for name, (lat, lon, published) in MARS_LANDINGS.items():
        h = mola_point(lat, lon)
        assert abs(h - published) <= 10, (name, h, published)
    return "MOLA landing-site elevations within 10 m of published values"


def _sub(path, key):
    return next(n for n, _ in gdal.Open(path).GetSubDatasets() if n.rstrip('"').endswith(key))


def check_orientation():
    f08 = next(f for f in sorted(glob.glob(str(RAW / "MOD08_M3" / "*.hdf"))) if ".A2023152." in f)  # June
    aod = gdal.Open(_sub(f08, "Deep_Blue_Aerosol_Optical_Depth_550_Land_Mean_Mean")).ReadAsArray() * 0.001
    bodele, mirror = aod[int(90 - 17), int(18 + 180)], aod[int(90 + 17), int(18 + 180)]
    assert bodele > 0.4 and bodele > 2 * mirror, (bodele, mirror)  # Bodele (17N) is far dustier than 17S

    f11 = next(f for f in sorted(glob.glob(str(RAW / "MOD11C3" / "*.hdf"))) if ".A2023182." in f)  # July
    lst = gdal.Open(_sub(f11, "LST_Day_CMG")).ReadAsArray() * 0.02
    lut = lst[int((90 - 30.5) / 0.05), int((59 + 180) / 0.05)]
    sea = lst[int((90 + 30.5) / 0.05), int((59 + 180) / 0.05)]  # mirror point is in the Indian Ocean
    assert lut > 320 and sea == 0, (lut, sea)
    return f"raw orientation: Bodele AOD {bodele:.2f} vs 17S {mirror:.2f}; Lut July day {lut:.0f} K, mirror is ocean fill"


# (lat, lon, {feature: (low, high)}) in physical units
LANDMARKS = {
    "Amazon near Manaus": (-3.0, -60.0, {"ndvi_max": (0.6, 1), "precip": (1500, 4000), "lst_range": (0, 8)}),
    "Libyan Great Sand Sea": (
        25.0,
        25.5,
        {"ndvi_max": (0, 0.15), "precip": (0, 30), "emis_b29": (0.7, 0.88), "lst_day_warm": (315, 345)},
    ),
    "Dome C, Antarctica": (-75.1, 123.35, {"snow_ice": (0.95, 1), "albedo": (0.7, 0.9), "relief": (0, 50)}),
    "Mount Everest": (27.99, 86.93, {"relief": (3000, 8000), "roughness": (400, 2000), "slope": (10, 40)}),
    "Bodele Depression": (17.0, 18.0, {"aod": (0.4, 1.5), "ndvi_max": (0, 0.15)}),
    "Yakutsk": (62.0, 129.7, {"lst_night_cold": (215, 245), "ndvi_max": (0.5, 1)}),
}


def check_landmarks(grid):
    meta = grid["meta"]
    ids = [f["id"] for f in meta["features"]]
    for name, (lat, lon, ranges) in LANDMARKS.items():
        i = cell_index(grid, lat, lon)
        assert i is not None, name
        for fid, (lo, hi) in ranges.items():
            j = ids.index(fid)
            x = float(grid["values"][i, j])
            if meta["features"][j]["transform"] == "log1p":
                x = float(np.expm1(x))
            assert lo <= x <= hi, (name, fid, x, (lo, hi))
    return f"{len(LANDMARKS)} Earth landmarks in physically sensible ranges"


def independent_score(meta, values, target, i):
    """docs/contract.md "Scoring", written out again without pipeline/score.py."""
    dims = {}
    for j, f in enumerate(meta["features"]):
        e = target["features"].get(f["id"])
        x = values[i, j]
        if e is None or e.get("na") or np.isnan(x):
            continue
        t = np.log1p(e["value"]) if f["transform"] == "log1p" else e["value"]
        d = x - t  # like-for-like for every feature (contract v2)
        dims.setdefault(f["dimension"], []).append(np.exp(-((d / f["sigma"]) ** 2)))
    ds = {d: float(np.mean(v)) for d, v in dims.items()}
    if len(ds) < 4:
        return None, ds
    w = target["weights"]
    return sum(w[d] * s for d, s in ds.items()) / sum(w[d] for d in ds), ds


def km(lat1, lon1, lat2, lon2):
    p1, p2 = np.radians(lat1), np.radians(lat2)
    a = np.sin((p2 - p1) / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(np.radians(lon2 - lon1) / 2) ** 2
    return float(2 * 6371.0 * np.arcsin(np.sqrt(a)))


def check_candidates(grid):
    meta, values = grid["meta"], grid["values"]
    snow = [f["id"] for f in meta["features"]].index("snow_ice")
    targets = {t["id"]: t for t in json.loads((WEB_DATA / "targets.json").read_text())["targets"]}
    known = list(csv.DictReader(open(ROOT / "data" / "known_analogs.csv", newline="", encoding="utf-8")))
    cand = json.loads((WEB_DATA / "candidates.geojson").read_text())["features"]
    for c in cand:
        lon, lat = c["geometry"]["coordinates"]
        p = c["properties"]
        t = targets[p["target_id"]]
        i = cell_index(grid, lat, lon)
        assert i is not None, p["id"]
        s, ds = independent_score(meta, values, t, i)
        assert abs(s - p["score"]) < 1e-3, (p["id"], s, p["score"])
        for d, v in p["dim_scores"].items():
            assert abs(ds[d] - v) < 1e-3, (p["id"], d, ds[d], v)
        nearest = min(km(lat, lon, float(k["lat"]), float(k["lon"])) for k in known)
        assert abs(nearest - p["nearest_known_km"]) < 1.0, (p["id"], nearest, p["nearest_known_km"])
        assert nearest > 200, p["id"]
        if t["body"] == "mars":
            assert values[i, snow] < 0.9, p["id"]  # no permanent ice sheet in Mars candidates
    return f"{len(cand)} candidates rescored independently; distances and filters hold"


def main():
    grid = load_grid()
    for msg in (check_mola(), check_orientation(), check_landmarks(grid), check_candidates(grid)):
        print(" ", msg)
    print("landmark checks passed")


if __name__ == "__main__":
    main()
