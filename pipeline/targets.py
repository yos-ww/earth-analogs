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

from .common import INTERIM, RAW, ROOT

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
    return dn * scale + offset, (scale, offset, px, polar)


TARGET_PX_M = 926.0  # the Earth grid (GMTED 30") and MOLA 64 px/deg are both about 926 m


def block_mean(h, f):
    """Average f x f blocks (about 1 km, as for an Earth cell); NaN-aware."""
    ny, nx = (h.shape[0] // f) * f, (h.shape[1] // f) * f
    return np.nanmean(h[:ny, :nx].reshape(ny // f, f, nx // f, f), axis=(1, 3))


def terrain_stats(h, px, lat, polar):
    """roughness (std), relief (max - min) and mean slope (degrees) of the heights h (m), after
    averaging to about 926 m so Mars and the Moon match the Earth grid. Slope is a central
    difference over one averaged pixel either side north-south, and round(1/cos(lat)) pixels
    east-west in the equirectangular grids, so the baseline is about 1.9 km both ways, as in
    pipeline/features.py. In the polar stereographic grid both spacings are px (review decision 6)."""
    f = max(1, int(round(TARGET_PX_M / px)))
    g = block_mean(h, f) if f > 1 else h
    step = px * f
    cosl = 1.0 if polar else max(np.cos(np.radians(lat)), 0.05)
    kx = 1 if polar else max(1, int(round(1 / cosl)))
    gy = (g[2:, 1:-1] - g[:-2, 1:-1]) / (2 * step)
    gx = (g[1:-1, 2 * kx:] - g[1:-1, :-2 * kx]) / (2 * kx * step * cosl)
    n = min(gx.shape[1], gy.shape[1])
    off = (gy.shape[1] - n) // 2  # centre the two gradient grids on the same pixels
    gx_c = gx[:, (gx.shape[1] - n) // 2:(gx.shape[1] - n) // 2 + n]
    slope = np.degrees(np.arctan(np.hypot(gx_c, gy[:, off:off + n])))
    return float(np.nanstd(g)), float(np.nanmax(g) - np.nanmin(g)), float(np.nanmean(slope)), f, g.size


def target_terrain(body, lat, lon):
    for stem in (MARS_TILES if body == "mars" else MOON_GRIDS):
        out = window_heights(stem, lat, lon)
        if out is not None:
            h, (scale, offset, px, polar) = out
            return terrain_stats(h, px, lat, polar), stem.name, px
    raise ValueError(f"no grid covers {body} {lat}, {lon}")


# Barren Earth basalt flows read through the same sensor (MOD11C3 Emis_29): Holuhraun and Black
# Point (both in data/known_analogs.csv). Used for targets whose surface is basaltic and whose
# emis_b29 row in B's literature file is still marked as a basalt-proxy placeholder.
BASALT_REFERENCES = {"Holuhraun": (64.87, -16.83), "Black Point lava flow": (35.68, -111.48)}


def basalt_emissivity_rows():
    emis = np.load(INTERIM / "emis_b29.npy")
    vals = {n: float(emis[int((90 - la) / 0.25), int((lo + 180) / 0.25)]) for n, (la, lo) in BASALT_REFERENCES.items()}
    value = round(float(np.mean(list(vals.values()))), 3)
    detail = "; ".join(f"{n} {v:.3f}" for n, v in vals.items())
    rows = []
    for r in csv.DictReader(open(ROOT / "data" / "targets_literature.csv", newline="", encoding="utf-8")):
        if r["feature_id"] == "emis_b29" and "basalt proxy" in r["value_kind"]:
            rows.append({
                "target_id": r["target_id"], "feature_id": "emis_b29", "value": f"{value}", "unit": "-",
                "value_kind": "basaltic surface as MODIS band 29 (8.55 um) sees Earth basalt: mean of two barren reference flows",
                "source": f"Computed by pipeline/targets.py from MOD11C3 Emis_29 median 2021-2023 at {detail}; "
                          f"target surface is basaltic per B's source note",
                "source_url": "", "status": "computed",
            })
    return rows


def main():
    rows = basalt_emissivity_rows()
    units = {"roughness": "m", "relief": "m", "slope": "degrees"}
    for t in csv.DictReader(open(ROOT / "data" / "targets.csv", newline="", encoding="utf-8")):
        lat, lon = float(t["lat"]), float(t["lon"])
        (rough, relief, slope, f, n), grid, px = target_terrain(t["body"], lat, lon)
        print(f"{t['target_id']:13s} {t['body']:5s} {lat:8.3f} {lon:9.3f}  {grid:15s} pixel {px:4.0f} m x{f} avg  "
              f"{n:5d} px  roughness {rough:7.1f} m  relief {relief:7.0f} m  slope {slope:5.2f} deg")
        src = "MOLA MEGDR 64 px/deg" if t["body"] == "mars" else "LOLA GDR " + grid
        for fid, value in (("roughness", rough), ("relief", relief), ("slope", slope)):
            rows.append({
                "target_id": t["target_id"], "feature_id": fid, "value": f"{value:.2f}" if fid == "slope" else f"{value:.1f}",
                "unit": units[fid],
                "value_kind": f"{fid} in a +-{HALF_M / 1000:.1f} km window after averaging to ~926 m ({n} px)",
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
