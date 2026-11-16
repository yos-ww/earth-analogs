"""How fragile is the validation result? Re-runs the per-body validation (docs/writeup.md, "Validation")
under changed choices. This reports sensitivity; it does not choose a variant. The headline numbers in
web/data/validation.json stay as designed.

    ~/mamba/envs/analogs/bin/python -m pipeline.sensitivity

Variants:
  barren threshold   ndvi_max < 0.10 / 0.15 (design) / 0.20 / 0.30 for the baseline cells
  drop one site      each visible site left out in turn (range of the result)
  drop a group       all USA sites; the four Atacama sites; the Antarctic and Arctic polar sites
  drop a dimension   weight of one dimension set to 0 (which dimensions carry the result)
  sigma scale        all sigma multiplied by 0.7 or 1.4
"""
import copy
import csv
import json
import warnings

import numpy as np

from .common import NCOLS, ROOT, WEB_DATA, cell_weights
from .score import load_grid, score_target
from .validate import BARREN_NDVI, load_sites, summarise

ATACAMA = {"Atacama Yungay", "El Tatio", "Licancabur", "Salar de Pajonales"}
POLAR = {"McMurdo Dry Valleys (Wright Valley)", "Haughton Crater (Devon Island)", "Axel Heiberg (Gypsum Hill springs)",
         "Svalbard Bockfjord Volcanic Complex"}


def body_result(grid, targets, sites, barren, w, body, weights=None, keep=lambda s: True):
    """Best-of-body result (as validation.json "bodies") for one setting. Returns the summarise dict or None."""
    ids = [t for t in targets if t["body"] == body]
    scores = []
    for t in ids:
        scores.append(score_target(grid, t, weights=weights)["overall"])
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", RuntimeWarning)
        best = np.nanmax(np.stack(scores), axis=0)
    rng = np.random.default_rng(1)
    return summarise(best, sites, barren, w, rng, lambda s: body in s["bodies"] and bool(s["dims"]) and keep(s))


def fmt(r):
    return "n/a" if r is None else f"{r['known_percentile_median']:.2f} vs {r['random_barren_median']:.2f}  p {r['p_vs_barren']:.3f}  (n {r['n_sites']})"


def main():
    grid = load_grid()
    meta, cells = grid["meta"], grid["cells"]
    dims = meta["dimensions"]
    w = cell_weights()[cells // NCOLS].astype(np.float64)
    targets = json.loads((WEB_DATA / "targets.json").read_text())["targets"]
    sites = load_sites(grid)
    country = {r["name"]: r["country"] for r in csv.DictReader(open(ROOT / "data" / "known_analogs.csv", newline="", encoding="utf-8"))}
    jn = [f["id"] for f in meta["features"]].index("ndvi_max")
    ndvi = np.nan_to_num(grid["values"][:, jn], nan=1.0)
    barren = ndvi < BARREN_NDVI

    print("Each line: known sites' median percentile vs random barren land's, p, number of sites.\n")
    results = {}
    for body in ("mars", "moon"):
        print(f"================ {body.upper()}")
        base = body_result(grid, targets, sites, barren, w, body)
        print(f"  design (barren ndvi < {BARREN_NDVI}, equal weights): {fmt(base)}")
        results[body] = {"design": base}

        print("  -- barren-land threshold")
        for thr in (0.10, 0.20, 0.30):
            print(f"     ndvi < {thr:.2f}: {fmt(body_result(grid, targets, sites, ndvi < thr, w, body))}")

        visible = [s for s in sites if body in s["bodies"] and s["dims"] and s["cell"] is not None]
        loo = [body_result(grid, targets, sites, barren, w, body, keep=lambda s, name=s["name"]: s["name"] != name) for s in visible]
        lo, hi = min(r["known_percentile_median"] for r in loo), max(r["known_percentile_median"] for r in loo)
        pmax = max(r["p_vs_barren"] for r in loo)
        worst = visible[int(np.argmax([r["p_vs_barren"] for r in loo]))]["name"]
        print(f"  -- leave one site out ({len(visible)} runs): known median {lo:.2f} to {hi:.2f}; largest p {pmax:.3f} (when '{worst}' is left out)")

        print("  -- leave a group out")
        for label, drop in (("USA sites", {n for n, c in country.items() if c == "USA"}), ("Atacama sites", ATACAMA),
                            ("polar sites (Antarctica, Arctic)", POLAR)):
            print(f"     without {label} ({len(drop & {s['name'] for s in visible})} sites): "
                  f"{fmt(body_result(grid, targets, sites, barren, w, body, keep=lambda s, d=drop: s['name'] not in d))}")

        print("  -- one dimension's weight set to 0 (reads: which dimension carries the result)")
        for d in dims:
            wts = {x: 1.0 for x in dims}
            wts[d] = 0.0
            print(f"     without {d:11s}: {fmt(body_result(grid, targets, sites, barren, w, body, weights=wts))}")

        print("  -- all sigma scaled")
        for k in (0.7, 1.4):
            g2 = dict(grid)
            g2["meta"] = copy.deepcopy(meta)
            for f in g2["meta"]["features"]:
                f["sigma"] *= k
            print(f"     sigma x {k}: {fmt(body_result(g2, targets, sites, barren, w, body))}")
        print()


if __name__ == "__main__":
    main()
