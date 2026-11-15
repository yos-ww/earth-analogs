"""Candidate analog regions per target -> web/data/candidates.geojson (docs/contract.md).

    ~/mamba/envs/analogs/bin/python -m pipeline.candidates

Per target with a complete enough profile (at least 4 scored dimensions):
 1. Score every land cell at the target's default weights. For the rocky Mars targets,
    permanent ice-sheet cells (snow_ice >= ICE_SHEET) are removed first.
 2. Take the top TOP_FRAC of the remaining land area (cos-latitude weights), keep only bare ground
    (ndvi_max < BARREN_NDVI, the validation baseline), and group the cells into
    regions (8-connected, joined across the antimeridian). Regions need at least MIN_CELLS cells.
 3. Split each region at its local maxima (SPLIT_KM apart; every cell goes to its nearest maximum) so a
    candidate is site-scale, not a whole desert. Drop pieces whose best cell is within MIN_KNOWN_KM of
    any known analog site.
 4. Robustness = share of N_PERTURB random weight changes (each dimension weight multiplied by
    exp(N(0, WEIGHT_SIGMA))) in which the region's best score ranks in the top TOP_SHARE of the regions
    (at least MIN_TOP_N). A share, not a fixed count: with bare ground only a site can have fewer than 50
    regions, and a fixed top 50 then passed every region (robustness 1.0 for all; fixed 2026-11-15).
 5. Drop pieces with robustness below MIN_ROBUSTNESS. Rank by score x robustness; keep at most PER_CONTINENT regions per continent, and skip a region
    within MIN_SPACING_KM of an already kept higher-ranked one (so three pieces of one desert do not
    fill a continent's quota).
B's data/candidate_notes.csv (id, name, novelty, dossier) is merged in when present.
"""
import csv
import json
import warnings

import geopandas as gpd
import numpy as np
from scipy.ndimage import label

from .common import BARREN_NDVI, NCOLS, NROWS, ROOT, WEB_DATA, cell_weights
from .score import load_grid, score_target

warnings.filterwarnings("ignore", message=".*geographic CRS.*")  # sjoin_nearest on degrees is fine at 1.5 deg

TOP_FRAC = 0.01
MIN_CELLS = 3
MIN_KNOWN_KM = 200.0
N_PERTURB = 500
WEIGHT_SIGMA = 0.5
TOP_SHARE = 0.38  # the design's share: top 50 of about 130 regions per target before the bare-ground filter
MIN_TOP_N = 3
PER_CONTINENT = 3
MIN_ROBUSTNESS = 0.25  # below this the ranking depends too much on the slider settings to call it a finding
SPLIT_KM = 200.0  # a region is split at local maxima that are at least this far apart
MIN_SPACING_KM = 400.0  # kept candidates of one target are at least this far apart
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


def split_region(idx, score, lat, lon):
    """Split the cells idx of one region at its local maxima.

    Cells are taken best-first; a cell becomes a peak if it is at least SPLIT_KM from every peak so far.
    Each cell then joins its nearest peak. Returns a list of index arrays, one per piece with at least
    MIN_CELLS cells. A region smaller than SPLIT_KM across has one peak and comes back whole."""
    order = idx[np.argsort(-score[idx], kind="stable")]
    peaks = []
    for i in order:
        if all(haversine_km(lat[i], lon[i], lat[p], lon[p]) >= SPLIT_KM for p in peaks):
            peaks.append(i)
    d = np.stack([haversine_km(lat[idx], lon[idx], lat[p], lon[p]) for p in peaks])  # (peaks, cells)
    owner = d.argmin(axis=0)
    return [idx[owner == k] for k in range(len(peaks)) if (owner == k).sum() >= MIN_CELLS]


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
    # finds are bare ground only (a missing NDVI is ice: no plants), taken from the top 1% of ALL land
    jn = [f["id"] for f in meta["features"]].index("ndvi_max")
    top &= np.nan_to_num(grid["values"][:, jn], nan=0.0) < BARREN_NDVI

    grid_mask = np.zeros(NROWS * NCOLS, bool)
    grid_mask[cells[top]] = True
    lab, nreg = label_regions(grid_mask.reshape(NROWS, NCOLS))
    pos_label = lab.ravel()[cells]  # region id per cell position (0 = none)
    regions = []
    for r in range(1, nreg + 1):
        idx = np.flatnonzero((pos_label == r) & top)
        if len(idx) < MIN_CELLS:
            continue
        for piece in split_region(idx, overall, lat, lon):
            best = piece[np.argmax(overall[piece])]
            d_known = float(haversine_km(lat[best], lon[best], known[:, 0], known[:, 1]).min())
            regions.append({"idx": piece, "best": int(best), "nearest_known_km": d_known})
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
    top_n = max(MIN_TOP_N, round(TOP_SHARE * len(regions)))
    robust = (rank < top_n).mean(axis=0)

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
    out = [c for c in out if c["robustness"] >= MIN_ROBUSTNESS]
    out.sort(key=lambda c: -c["score"] * c["robustness"])
    kept, count = [], {}
    for c in out:
        too_close = any(haversine_km(c["lat"], c["lon"], k_["lat"], k_["lon"]) < MIN_SPACING_KM for k_ in kept)
        if count.get(c["continent"], 0) < PER_CONTINENT and not too_close:
            count[c["continent"]] = count.get(c["continent"], 0) + 1
            kept.append(c)
    for rank_, c in enumerate(kept, 1):
        c["rank"] = rank_
    return kept, f"{nreg} regions in the top {TOP_FRAC:.0%}, {n_before} pieces after splitting, {len(regions)} beyond {MIN_KNOWN_KM:.0f} km of a known site"


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
