"""Validation: do the known analog sites score above random barren land?

    ~/mamba/envs/analogs/bin/python -m pipeline.validate        (same as score.py --validate)

Writes web/data/validation.json (docs/contract.md). Rules:
- Every percentile is area-weighted (cos latitude) and is a position among ALL scored land cells
  for that score, so a random land cell has a median percentile of about 0.5.
- A known site is scored only against the targets of its own body (review decision 1). Per target
  the site's score is its score for that target alone; per body it is the best over that body's
  targets, and the random baselines take the best over the same set.
- "Barren" land = ndvi_max < BARREN_NDVI (cells without NDVI are not barren).
- Sites whose tags map to no scored dimension (biology, operations, subsurface only) are counted
  but reported as "not visible to the score". `mineralogy` maps to `geology`.
- Significance: p = share of same-size random barren sets (drawn with probability proportional to
  area) whose median percentile is at least the observed one.
"""
import csv
import json
import warnings

import numpy as np

from .common import BARREN_NDVI, NCOLS, NROWS, ROOT, WEB_DATA, cell_weights
from .score import cell_index, load_grid, score_target

N_PERM = 20000
SEARCH_RADIUS = 3  # cells (0.75 deg) to look for the nearest land cell around a site
TAG_TO_DIM = {"mineralogy": "geology"}


class Ranker:
    """Area-weighted percentile of a value among a reference set of scores."""

    def __init__(self, scores, weights):
        ok = ~np.isnan(scores)
        order = np.argsort(scores[ok])
        self.sorted = scores[ok][order]
        w = weights[ok][order]
        self.cum = np.concatenate([[0.0], np.cumsum(w)])
        self.total = self.cum[-1]

    def __call__(self, x):
        """Share of the reference weight strictly below x."""
        return self.cum[np.searchsorted(self.sorted, x, side="left")] / self.total


def weighted_median(x, w):
    order = np.argsort(x)
    cw = np.cumsum(w[order])
    return float(x[order][np.searchsorted(cw, cw[-1] / 2)])


def nearest_land(grid, lat, lon):
    """Position of the land cell containing (lat, lon) or, failing that, the nearest one within
    SEARCH_RADIUS cells; None if there is none."""
    i = cell_index(grid, lat, lon)
    if i is not None:
        return i
    r0, c0 = int((90 - lat) / 0.25), int((lon + 180) / 0.25)
    best = None
    for dr in range(-SEARCH_RADIUS, SEARCH_RADIUS + 1):
        for dc in range(-SEARCH_RADIUS, SEARCH_RADIUS + 1):
            if not 0 <= r0 + dr < NROWS:
                continue
            flat = (r0 + dr) * NCOLS + (c0 + dc) % NCOLS
            j = np.searchsorted(grid["cells"], flat)
            if j < len(grid["cells"]) and grid["cells"][j] == flat and (best is None or dr * dr + dc * dc < best[0]):
                best = (dr * dr + dc * dc, int(j))
    return best[1] if best else None


def load_sites(grid):
    sites = []
    for s in csv.DictReader(open(ROOT / "data" / "known_analogs.csv", newline="", encoding="utf-8")):
        tags = {TAG_TO_DIM.get(t.strip(), t.strip()) for t in s["dimensions"].split("|")}
        sites.append({
            "name": s["name"], "bodies": {b.strip().lower() for b in s["body"].split("|")},
            "dims": tags & set(grid["meta"]["dimensions"]), "cell": nearest_land(grid, float(s["lat"]), float(s["lon"])),
        })
    return sites


def permutation_p(observed, pools, n_sites, rank, w, rng):
    """P(median percentile of n_sites random barren cells >= observed)."""
    p = w[pools] / w[pools].sum()
    draws = rng.choice(pools, size=(N_PERM, n_sites), p=p)
    meds = np.median(rank_all(rank, draws), axis=1)
    return float(np.mean(meds >= observed - 1e-12))


def rank_all(rank, idx):
    return rank.cum[np.searchsorted(rank.sorted, rank.values[idx], side="left")] / rank.total


def summarise(score, sites, barren, w, rng, site_filter):
    """Percentile summary for one score vector (per target, or best-of-body) and a site subset."""
    rank = Ranker(score, w)
    rank.values = score
    ok = ~np.isnan(score)
    chosen = [s for s in sites if site_filter(s) and s["cell"] is not None and not np.isnan(score[s["cell"]])]
    if not chosen:
        return None
    pcts = np.array([rank(score[s["cell"]]) for s in chosen])
    land = np.flatnonzero(ok)
    bar = np.flatnonzero(ok & barren)
    obs = float(np.median(pcts))
    return {
        "n_sites": len(chosen),
        "known_percentile_median": round(obs, 3),
        "random_land_median": round(weighted_median(rank_all(rank, land), w[land]), 3),
        "random_barren_median": round(weighted_median(rank_all(rank, bar), w[bar]), 3),
        "p_vs_barren": round(permutation_p(obs, bar, len(chosen), rank, w, rng), 4),
        "sites": {s["name"]: round(float(p), 3) for s, p in zip(chosen, pcts)},
    }


def main():
    grid = load_grid()
    meta, cells = grid["meta"], grid["cells"]
    dims = meta["dimensions"]
    w = cell_weights()[cells // NCOLS].astype(np.float64)
    targets = json.loads((WEB_DATA / "targets.json").read_text())["targets"]
    jn = [f["id"] for f in meta["features"]].index("ndvi_max")
    barren = np.nan_to_num(grid["values"][:, jn], nan=1.0) < BARREN_NDVI
    sites = load_sites(grid)
    rng = np.random.default_rng(1)

    res, skipped = {}, {}
    for t in targets:
        r = score_target(grid, t)
        if np.isfinite(r["overall"]).sum() == 0:
            skipped[t["id"]] = "fewer than 4 dimensions have target values"
            continue
        res[t["id"]] = (t, r)

    out = {"barren_ndvi_below": BARREN_NDVI, "n_permutations": N_PERM, "targets": {}, "bodies": {}, "skipped": skipped,
           "n_sites_total": len(sites), "n_sites_without_land_cell": sum(s["cell"] is None for s in sites)}
    for tid, (t, r) in res.items():
        body = t["body"]
        own = lambda s: body in s["bodies"]
        visible = lambda s: own(s) and bool(s["dims"])
        entry = summarise(r["overall"], sites, barren, w, rng, visible) or {}
        entry["all_own_body"] = summarise(r["overall"], sites, barren, w, rng, own)
        entry["not_visible_to_score"] = sorted(s["name"] for s in sites if own(s) and not s["dims"])
        entry["directional"] = r["directional"]
        entry["features_used"] = sorted(k for k, v in t["features"].items() if not v.get("na"))
        per_dim = {}
        for k, d in enumerate(dims):
            sc = r["dim_scores"][:, k]
            sub = summarise(sc, sites, barren, w, rng, lambda s, d=d: own(s) and d in s["dims"])
            if sub:
                per_dim[d] = {"known": sub["known_percentile_median"], "barren": sub["random_barren_median"],
                              "n_sites": sub["n_sites"]}
        entry["per_dimension"] = per_dim
        out["targets"][tid] = entry
    for body in ("mars", "moon"):
        ids = [tid for tid, (t, _) in res.items() if t["body"] == body]
        if not ids:
            continue
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", RuntimeWarning)  # cells scored for no target are all-NaN
            best = np.nanmax(np.stack([res[i][1]["overall"] for i in ids]), axis=0)
        summ = summarise(best, sites, barren, w, rng, lambda s, b=body: b in s["bodies"] and bool(s["dims"]))
        if summ:
            out["bodies"][body] = {"targets": ids, **summ}

    # Built-in sanity check: a random land cell must sit near the middle of the land ranking.
    for tid, e in out["targets"].items():
        assert abs(e.get("random_land_median", 0.5) - 0.5) < 0.03, (tid, e["random_land_median"])
    (WEB_DATA / "validation.json").write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
    print_report(out)


def print_report(out):
    print(f"validation.json written; barren = ndvi_max < {out['barren_ndvi_below']}; "
          f"{out['n_sites_total']} sites ({out['n_sites_without_land_cell']} without a land cell nearby)")
    for tid, e in out["targets"].items():
        if "known_percentile_median" not in e:
            print(f"  {tid}: no scored sites")
            continue
        print(f"  {tid:13s} {e['n_sites']:2d} sites  known {e['known_percentile_median']:.2f}  "
              f"random land {e['random_land_median']:.2f}  random barren {e['random_barren_median']:.2f}  "
              f"p {e['p_vs_barren']:.3f}   directional {list(e['directional'])}")
        print("                per dimension (known / barren): " +
              ", ".join(f"{d} {v['known']:.2f}/{v['barren']:.2f}" for d, v in e["per_dimension"].items()))
    for b, e in out["bodies"].items():
        print(f"  BODY {b}: best of {e['targets']}  {e['n_sites']} sites  known {e['known_percentile_median']:.2f}  "
              f"random barren {e['random_barren_median']:.2f}  p {e['p_vs_barren']:.3f}")
    for tid, why in out["skipped"].items():
        print(f"  skipped {tid}: {why}")


if __name__ == "__main__":
    main()
