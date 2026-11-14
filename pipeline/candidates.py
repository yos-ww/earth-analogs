"""Candidate analog regions per target -> web/data/candidates.geojson (docs/contract.md).

    ~/mamba/envs/analogs/bin/python -m pipeline.candidates

Per target with a complete enough profile (at least 4 scored dimensions):
 1. Score every land cell at the target's default weights. For the rocky Mars targets,
    permanent ice-sheet cells (snow_ice >= ICE_SHEET) are removed first.
 2. Take the top TOP_FRAC of the remaining land area (cos-latitude weights) and group the cells into
    regions (8-connected, joined across the antimeridian). Regions need at least MIN_CELLS cells.
 3. Drop regions whose best cell is within MIN_KNOWN_KM of any known analog site.
 4. Robustness = share of N_PERTURB random weight changes (each dimension weight multiplied by
    exp(N(0, WEIGHT_SIGMA))) in which the region's best score ranks in the top TOP_N of the regions.
 5. Rank by score x robustness; keep at most PER_CONTINENT regions per continent, and skip a region
    within MIN_SPACING_KM of an already kept higher-ranked one (near-duplicates of one place).
B's data/candidate_notes.csv (id, name, novelty, dossier) is merged in when present.
"""
import csv
import json
import warnings

import geopandas as gpd
import numpy as np
from scipy.ndimage import label

from .common import NCOLS, NROWS, ROOT, WEB_DATA, cell_weights
from .score import load_grid, score_target

warnings.filterwarnings("ignore", message=".*geographic CRS.*")  # sjoin_nearest on degrees is fine at 1.5 deg

TOP_FRAC = 0.01
MIN_CELLS = 3
MIN_KNOWN_KM = 200.0
N_PERTURB = 500
WEIGHT_SIGMA = 0.5
TOP_N = 50
PER_CONTINENT = 3
MIN_SPACING_KM = 150.0  # kept candidates of one target are at least this far apart
ICE_SHEET = 0.9  # snow_ice fraction at or above which a cell counts as permanent ice sheet
EARTH_R_KM = 6371.0088


def cell_area_km2(lat):
    return (EARTH_R_KM * np.radians(0.25)) ** 2 * np.cos(np.radians(lat))


def haversine_km(lat1, lon1, lat2, lon2):
    p1, p2 = np.radians(lat1), np.radians(lat2)
    a = np.sin((p2 - p1) / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(np.radians(lon2 - lon1) / 2) ** 2
    return 2 * EARTH_R_KM * np.arcsin(np.sqrt(a))


def label_regions(mask):
    """8-connected labels of a (NROWS, NCOLS) bool grid, joined across the antimeridian."""
    lab, n = label(mask, structure=np.ones((3, 3)))
    parent = np.arange(n + 1)

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    for r in range(NROWS):
        if lab[r, 0] == 0:
            continue
        for rr in (r - 1, r, r + 1):
            if 0 <= rr < NROWS and lab[rr, -1] > 0:
                parent[find(lab[r, 0])] = find(lab[rr, -1])
    roots = np.array([find(a) for a in range(n + 1)])
    uniq, inv = np.unique(roots, return_inverse=True)
    out = inv[lab]
    out[lab == 0] = 0
    return out, int(out.max())


def load_known():
    pts = []
    for s in csv.DictReader(open(ROOT / "data" / "known_analogs.csv", newline="", encoding="utf-8")):
        pts.append((float(s["lat"]), float(s["lon"])))
    return np.array(pts)


def continents_of(lats, lons):
    countries = gpd.read_file(ROOT / "data" / "ref" / "naturalearth_lowres" / "naturalearth_lowres.shp")[["continent", "geometry"]]
    pts = gpd.GeoDataFrame({"i": range(len(lats))}, geometry=gpd.points_from_xy(lons, lats), crs=countries.crs)
    j = gpd.sjoin(pts, countries, how="left", predicate="within").drop_duplicates("i").set_index("i")
    cont = j["continent"].reindex(range(len(lats)))
    miss = cont.isna().values
    if miss.any():  # coastal cells: take the nearest country within 1.5 degrees
        near = gpd.sjoin_nearest(pts[miss].reset_index(drop=True), countries, how="left", max_distance=1.5)
        near = near.drop_duplicates("i").set_index("i")["continent"]
        cont.loc[np.flatnonzero(miss)] = near.reindex(np.flatnonzero(miss)).values
    return cont.fillna("Unknown").values


def candidates_for(grid, target, known, rng):
    meta, cells = grid["meta"], grid["cells"]
    dims = meta["dimensions"]
    res = score_target(grid, target)
    overall, ds = res["overall"], res["dim_scores"]
    if not np.isfinite(overall).any():
        return None, "fewer than 4 dimensions have target values"
    rows = cells // NCOLS
    lat = 90 - (rows + 0.5) * 0.25
    lon = -180 + (cells % NCOLS + 0.5) * 0.25
    w = cell_weights()[rows].astype(np.float64)

    eligible = np.isfinite(overall)
    if target["body"] == "mars":  # rocky Mars targets: no permanent ice sheets
        j = [f["id"] for f in meta["features"]].index("snow_ice")
        eligible &= ~(np.nan_to_num(grid["values"][:, j], nan=0.0) >= ICE_SHEET)
    order = np.argsort(np.where(eligible, -overall, np.inf))
    cum = np.cumsum(w[order])
    k = np.searchsorted(cum, TOP_FRAC * w[eligible].sum())
    top = np.zeros(len(cells), bool)
    top[order[: k + 1]] = True

    grid_mask = np.zeros(NROWS * NCOLS, bool)
    grid_mask[cells[top]] = True
    lab, nreg = label_regions(grid_mask.reshape(NROWS, NCOLS))
    pos_label = lab.ravel()[cells]  # region id per cell position (0 = none)
    regions = []
    for r in range(1, nreg + 1):
        idx = np.flatnonzero((pos_label == r) & top)
        if len(idx) < MIN_CELLS:
            continue
        best = idx[np.argmax(overall[idx])]
        d_known = float(haversine_km(lat[best], lon[best], known[:, 0], known[:, 1]).min())
        regions.append({"idx": idx, "best": int(best), "nearest_known_km": d_known})
    n_before = len(regions)
    regions = [g for g in regions if g["nearest_known_km"] > MIN_KNOWN_KM]
    if not regions:
        return [], f"no regions left ({n_before} before the {MIN_KNOWN_KM:.0f} km filter)"

    # --- robustness: random weight changes, region best score ranked among all regions
    all_idx = np.concatenate([g["idx"] for g in regions])
    owner = np.concatenate([np.full(len(g["idx"]), i) for i, g in enumerate(regions)])
    block = ds[all_idx]
    present = ~np.isnan(block)
    enough = present.sum(axis=1) >= 4
    W = np.exp(rng.normal(0.0, WEIGHT_SIGMA, (N_PERTURB, len(dims))))  # multiplies default weight 1
    base_w = np.array([target["weights"].get(d, 1.0) for d in dims])
    num = np.nan_to_num(block)[None] * (W * base_w)[:, None, :]
    den = present[None] * (W * base_w)[:, None, :]
    with np.errstate(all="ignore"):
        s = np.where(enough[None], num.sum(axis=2) / den.sum(axis=2), -np.inf)  # (N_PERTURB, cells)
    best_by_region = np.full((N_PERTURB, len(regions)), -np.inf)
    for i in range(len(regions)):
        best_by_region[:, i] = s[:, owner == i].max(axis=1)
    rank = (-best_by_region).argsort(axis=1).argsort(axis=1)  # 0 = best
    robust = (rank < min(TOP_N, len(regions))).mean(axis=0)

    cont = continents_of(np.array([lat[g["best"]] for g in regions]), np.array([lon[g["best"]] for g in regions]))
    out = []
    for i, g in enumerate(regions):
        b = g["best"]
        out.append({
            "target_id": target["id"], "lat": float(lat[b]), "lon": float(lon[b]), "continent": str(cont[i]),
            "score": float(overall[b]), "robustness": float(robust[i]),
            "dim_scores": {d: round(float(ds[b, k_]), 3) for k_, d in enumerate(dims) if not np.isnan(ds[b, k_])},
            "area_km2": float(cell_area_km2(lat[g["idx"]]).sum()), "nearest_known_km": g["nearest_known_km"],
            "n_cells": int(len(g["idx"])),
        })
    out.sort(key=lambda c: -c["score"] * c["robustness"])
    kept, count = [], {}
    for c in out:
        too_close = any(haversine_km(c["lat"], c["lon"], k_["lat"], k_["lon"]) < MIN_SPACING_KM for k_ in kept)
        if count.get(c["continent"], 0) < PER_CONTINENT and not too_close:
            count[c["continent"]] = count.get(c["continent"], 0) + 1
            kept.append(c)
    for rank_, c in enumerate(kept, 1):
        c["rank"] = rank_
    return kept, f"{nreg} regions in the top {TOP_FRAC:.0%}, {n_before} with >= {MIN_CELLS} cells, {len(regions)} beyond {MIN_KNOWN_KM:.0f} km of a known site"


def cand_id(c):
    return f"{c['target_id']}-{abs(c['lat']):05.2f}{'N' if c['lat'] >= 0 else 'S'}-{abs(c['lon']):06.2f}{'E' if c['lon'] >= 0 else 'W'}"


def main():
    grid = load_grid()
    targets = json.loads((WEB_DATA / "targets.json").read_text())["targets"]
    known = load_known()
    notes = {}
    notes_path = ROOT / "data" / "candidate_notes.csv"
    if notes_path.exists():
        notes = {r["id"]: r for r in csv.DictReader(open(notes_path, newline="", encoding="utf-8"))}
    rng = np.random.default_rng(7)
    feats = []
    for t in targets:
        kept, info = candidates_for(grid, t, known, rng)
        print(f"{t['id']:13s} {info}" if kept is None or not kept else f"{t['id']:13s} {len(kept)} candidates; {info}")
        for c in kept or []:
            cid = cand_id(c)
            n = notes.get(cid, {})
            props = {
                "id": cid, "name": n.get("name") or f"{c['lat']:.2f}, {c['lon']:.2f}", "target_id": c["target_id"],
                "score": round(c["score"], 4), "robustness": round(c["robustness"], 3), "dim_scores": c["dim_scores"],
                "area_km2": round(c["area_km2"]), "nearest_known_km": round(c["nearest_known_km"]),
                "novelty": n.get("novelty") or "under-studied", "dossier": n.get("dossier") or None,
                "continent": c["continent"], "rank": c["rank"],
            }
            feats.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [c["lon"], c["lat"]]}, "properties": props})
            print(f"   {c['rank']:2d}. {c['continent']:14s} {c['lat']:7.2f} {c['lon']:8.2f}  score {c['score']:.3f}  "
                  f"robust {c['robustness']:.2f}  {c['area_km2']:8.0f} km2  {c['nearest_known_km']:6.0f} km from known")
    (WEB_DATA / "candidates.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": feats}, indent=1) + "\n")
    print(f"wrote candidates.geojson: {len(feats)} candidates")


if __name__ == "__main__":
    main()
