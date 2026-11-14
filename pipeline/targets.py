"""Compute terrain values for the planetary targets from MOLA (Mars) and LOLA (Moon).

Writes data/targets_computed.csv (same columns as data/targets_literature.csv, status
`computed`). pipeline/export.py applies these over B's placeholder terrain rows, so B's
literature file is never edited.

    ~/mamba/envs/analogs/bin/python -m pipeline.targets

Roughness = standard deviation of elevation inside the same ground window as an Earth cell:
+-HALF_M metres around the target point (about 27.8 km across; review decision 2). In the
equirectangular grids the east-west half-width in projected metres is HALF_M / cos(lat). The
polar LOLA grid is polar stereographic, so its window is a square in projected metres
(review decision 6). Heights are DN * scale + offset read from the label through GDAL.
"""
import csv

import numpy as np
from osgeo import gdal, osr

from .common import RAW, ROOT

gdal.UseExceptions()
HALF_M = 13_900.0  # half window: 30 GMTED pixels * 926 m / 2

# (grid file stem, target body check) tried in order; the first grid containing the window wins.
MARS_TILES = [RAW / "mola" / n for n in ("megt90n000gb", "megt90n180gb", "megt00n000gb", "megt00n180gb")]
MOON_GRIDS = [RAW / "lola" / "ldem_75s_240m", RAW / "lola" / "ldem_64"]  # polar first (finer)


def window_heights(stem, lat, lon):
    """Heights (m) in the ground window around (lat, lon) from one grid, or None if the
    window is not entirely inside the grid."""
    ds = gdal.Open(str(stem) + ".lbl")
    srs = osr.SpatialReference(wkt=ds.GetProjection())
    geo = srs.CloneGeogCS()
    for s in (srs, geo):
        s.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    x, y, _ = osr.CoordinateTransformation(geo, srs).TransformPoint(lon, lat)
    x0, px, _, y0, _, py = ds.GetGeoTransform()
    polar = "POLAR" in srs.GetName().upper() or abs(lat) > 85
    hx = HALF_M if polar else HALF_M / max(np.cos(np.radians(lat)), 0.05)
    c0, c1 = int((x - hx - x0) / px), int((x + hx - x0) / px) + 1
    r0, r1 = int((y + HALF_M - y0) / py), int((y - HALF_M - y0) / py) + 1
    if c0 < 0 or r0 < 0 or c1 > ds.RasterXSize or r1 > ds.RasterYSize:
        return None
    band = ds.GetRasterBand(1)
    dn = band.ReadAsArray(c0, r0, c1 - c0, r1 - r0).astype(np.float64)
    scale, offset = band.GetScale() or 1.0, band.GetOffset() or 0.0
    nodata = band.GetNoDataValue()
    if nodata is not None:
        dn = np.where(dn == nodata, np.nan, dn)
    return dn * scale + offset, (scale, offset, px)


def target_roughness(body, lat, lon):
    for stem in (MARS_TILES if body == "mars" else MOON_GRIDS):
        out = window_heights(stem, lat, lon)
        if out is not None:
            h, (scale, offset, px) = out
            return float(np.nanstd(h)), stem.name, h.size, scale, px
    raise ValueError(f"no grid covers {body} {lat}, {lon}")


def main():
    rows = []
    for t in csv.DictReader(open(ROOT / "data" / "targets.csv", newline="", encoding="utf-8")):
        lat, lon = float(t["lat"]), float(t["lon"])
        value, grid, n, scale, px = target_roughness(t["body"], lat, lon)
        print(f"{t['target_id']:13s} {t['body']:5s} {lat:8.3f} {lon:9.3f}  {grid:15s} "
              f"{n:6d} px  scale {scale}  pixel {px:.0f} m  roughness {value:7.1f} m")
        src = "MOLA MEGDR 64 px/deg" if t["body"] == "mars" else "LOLA GDR " + grid
        rows.append({
            "target_id": t["target_id"], "feature_id": "roughness", "value": f"{value:.1f}", "unit": "m",
            "value_kind": f"std of elevation in a +-{HALF_M / 1000:.1f} km window ({n} px)",
            "source": f"Computed by pipeline/targets.py from {src}", "source_url": "", "status": "computed",
        })
    out = ROOT / "data" / "targets_computed.csv"
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    print("wrote", out.relative_to(ROOT))


if __name__ == "__main__":
    main()
