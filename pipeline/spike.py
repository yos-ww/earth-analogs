"""Hour-4 science spike (plan.md): do the scores separate the targets, and do known analogs
stand out from random barren land?

    ~/mamba/envs/analogs/bin/python -m pipeline.spike

Uses whatever targets in web/data/targets.json have all their literature values (the spike
targets: jezero, arcadia, marius_hills). Report only; nothing is written.
"""
import csv
import json

import numpy as np
from scipy.ndimage import label

from .common import NCOLS, NROWS, ROOT, WEB_DATA, cell_weights
from .score import cell_index, load_grid, score_target

TOP_FRAC = 0.01  # top 1% of scored land area
BARREN_NDVI = 0.15
SPIKE_DIMS = {"terrain", "temperature", "aridity", "ice", "dust"}
SEARCH_RADIUS = 3  # cells (0.75 deg) to look for the nearest land cell around a site


def weighted_rank(values, weights, x):
    """Area-weighted share of `values` that is below x (a percentile in 0-1)."""
    return float(weights[values < x].sum() / weights.sum())


def top_mask(score, w):
    ok = ~np.isnan(score)
    order = np.argsort(np.where(ok, -score, np.inf))
    cum = np.cumsum(w[order])
    k = np.searchsorted(cum, TOP_FRAC * w[ok].sum())
    mask = np.zeros(len(score), bool)
    mask[order[: k + 1]] = True
    return mask & ok


def regions(grid, mask, score, w, n=6):
    img = np.zeros(NROWS * NCOLS, bool)
    img[grid["cells"][mask]] = True
    lab, k = label(img.reshape(NROWS, NCOLS))
    lat = 90 - (np.arange(NROWS) + 0.5) * 0.25
    lon = -180 + (np.arange(NCOLS) + 0.5) * 0.25
    pos = {int(c): i for i, c in enumerate(grid["cells"])}
    out = []
    for r in range(1, k + 1):
        rr, cc = np.nonzero(lab == r)
        idx = [pos[int(a) * NCOLS + int(b)] for a, b in zip(rr, cc)]
        wt = w[idx]
        out.append((wt.sum(), float(np.average(lat[rr], weights=wt)), float(np.average(lon[cc], weights=wt)),
                    float(np.mean(score[idx])), len(idx)))
    return sorted(out, reverse=True)[:n], k


def nearest_land(grid, lat, lon):
    i = cell_index(grid, lat, lon)
    if i is not None:
        return i, 0
    r0, c0 = int((90 - lat) / 0.25), int((lon + 180) / 0.25)
    best = None
    for dr in range(-SEARCH_RADIUS, SEARCH_RADIUS + 1):
        for dc in range(-SEARCH_RADIUS, SEARCH_RADIUS + 1):
            flat = (r0 + dr) * NCOLS + (c0 + dc) % NCOLS
            j = np.searchsorted(grid["cells"], flat)
            if 0 <= r0 + dr < NROWS and j < len(grid["cells"]) and grid["cells"][j] == flat:
                d = dr * dr + dc * dc
                if best is None or d < best[0]:
                    best = (d, int(j))
    return (best[1], best[0] ** 0.5) if best else (None, None)


def main():
    grid = load_grid()
    meta = grid["meta"]
    cells = grid["cells"]
    w = cell_weights()[cells // NCOLS]
    targets = {t["id"]: t for t in json.loads((WEB_DATA / "targets.json").read_text())["targets"]}
    fids = {f["id"] for f in meta["features"]}
    ready = {k: t for k, t in targets.items() if fids <= set(t["features"])}
    print(f"targets with all {len(fids)} features: {sorted(ready)}\n")

    res = {k: score_target(grid, t) for k, t in ready.items()}
    for k, r in res.items():
        print(f"{k}: directional {r['directional']}")
    print()

    # ---- (1) overlap of the top-1% maps
    tops = {k: top_mask(r["overall"], w) for k, r in res.items()}
    print(f"(1) top {TOP_FRAC:.0%} of scored land area, overlap by area")
    ks = sorted(tops)
    for i, a in enumerate(ks):
        for b in ks[i + 1:]:
            inter = w[tops[a] & tops[b]].sum()
            union = w[tops[a] | tops[b]].sum()
            print(f"   {a:13s} vs {b:13s}  Jaccard {inter / union:.2f}   "
                  f"share of {a}'s top in {b}'s: {inter / w[tops[a]].sum():.2f}")
    for k in ks:
        reg, n = regions(grid, tops[k], res[k]["overall"], w)
        print(f"   {k}: {n} regions, max score {np.nanmax(res[k]['overall']):.3f}; largest:")
        for area, la, lo, sc, nc in reg:
            print(f"      {area / w[tops[k]].sum():5.1%} of top area, centre {la:6.1f}, {lo:7.1f}, mean score {sc:.3f}, {nc} cells")
    print()

    # ---- (2) known analogs against random barren land
    ndvi = grid["values"][:, [f["id"] for f in meta["features"]].index("ndvi_max")]
    barren = np.nan_to_num(ndvi, nan=1.0) < BARREN_NDVI  # cells without NDVI (Antarctica) are not "barren" here
    sets = {"Mars": [k for k in ready if ready[k]["body"] == "mars"],
            "Moon": [k for k in ready if ready[k]["body"] == "moon"]}
    sets["Mars|Moon"] = sets["Mars"] + sets["Moon"]
    best = {name: np.nanmax(np.stack([res[k]["overall"] for k in ks_]), axis=0) for name, ks_ in sets.items() if ks_}
    print(f"(2) known analogs vs random barren land (ndvi_max < {BARREN_NDVI}, {barren.sum()} cells); "
          "site scored against its own body's targets, best of set; baseline uses the same set")
    rows = []
    for s in csv.DictReader(open(ROOT / "data" / "known_analogs.csv", newline="", encoding="utf-8")):
        key = "|".join(sorted(s["body"].split("|"), key={"Mars": 0, "Moon": 1}.get))
        i, dist = nearest_land(grid, float(s["lat"]), float(s["lon"]))
        if key not in best or i is None or np.isnan(best[key][i]):
            rows.append((s["name"], key, s["dimensions"], None, None, None, dist, i))
            continue
        sc = best[key][i]
        bar = best[key][barren & ~np.isnan(best[key])]
        allv = best[key][~np.isnan(best[key])]
        rows.append((s["name"], key, s["dimensions"], float(sc),
                     weighted_rank(bar, w[barren & ~np.isnan(best[key])], sc),
                     weighted_rank(allv, w[~np.isnan(best[key])], sc), dist, i))
    print(f"   {'site':38s}{'body':10s}{'tags':26s}{'score':>7s}{'pct barren':>11s}{'pct land':>9s}")
    for n, b, d, sc, pb, pa, dist, _i in sorted(rows, key=lambda r: -(r[4] or -1)):
        flag = " (nearest land cell %.1f cells away)" % dist if dist else ""
        if sc is None:
            print(f"   {n:38s}{b:10s}{d:26s}  not scored{flag}")
        else:
            print(f"   {n:38s}{b:10s}{d:26s}{sc:7.3f}{pb:11.2f}{pa:9.2f}{flag}")

    lat_of = 90 - (cells // NCOLS + 0.5) * 0.25
    rng = np.random.default_rng(1)

    def summarise(label, keep):
        """Median percentile of the tagged sites inside the pool `barren & keep`, against
        same-size random sets drawn from that pool with probability proportional to area."""
        sel = [r for r in rows if r[3] is not None and SPIKE_DIMS & set(r[2].split("|"))
               and keep[r[7]]]
        pcts, pools = [], {}
        for r in sel:
            pool = pools.setdefault(r[1], np.flatnonzero(barren & keep & ~np.isnan(best[r[1]])))
            pcts.append(weighted_rank(best[r[1]][pool], w[pool], r[3]))
        obs = float(np.median(pcts))
        sim = []
        for _ in range(2000):
            draw = []
            for r in sel:
                pool = pools[r[1]]
                idx = rng.choice(pool, p=w[pool] / w[pool].sum())
                draw.append(weighted_rank(best[r[1]][pool], w[pool], best[r[1]][idx]))
            sim.append(np.median(draw))
        print(f"   {label}: {len(sel)} tagged sites, median percentile {obs:.2f}; random barren sets "
              f"median {np.median(sim):.2f}, 95th pct {np.percentile(sim, 95):.2f}; "
              f"p(random >= observed) = {np.mean(np.array(sim) >= obs):.3f}")

    print()
    summarise("all barren land      ", np.ones(len(cells), bool))
    summarise("excluding Antarctica ", lat_of > -60)

if __name__ == "__main__":
    main()
