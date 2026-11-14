"""Checks for pipeline/score.py. Run from the repo root:
    ~/mamba/envs/analogs/bin/python -m pipeline.test_score
"""
import math

import numpy as np

from .score import MIN_DIMENSIONS, cell_index, load_grid, score_target, transform


def scalar_score(grid, i, target, weights=None):
    """Independent, plain-Python version of the contract rules for one cell."""
    meta = grid["meta"]
    dims = {}
    for j, f in enumerate(meta["features"]):
        e = target["features"].get(f["id"])
        x = grid["values"][i, j]
        if e is None or e.get("na") or math.isnan(x):
            continue
        t = transform(e["value"], f["transform"])
        if t < f["p1"]:
            diff = 0.0 if x <= f["p1"] else x - f["p1"]
        elif t > f["p99"]:
            diff = 0.0 if x >= f["p99"] else f["p99"] - x
        else:
            diff = x - t
        dims.setdefault(f["dimension"], []).append(math.exp(-((diff / f["sigma"]) ** 2)))
    w = weights or target["weights"]
    ds = {d: sum(v) / len(v) for d, v in dims.items()}
    if len(ds) < MIN_DIMENSIONS:
        return None
    return sum(w[d] * s for d, s in ds.items()) / sum(w[d] for d in ds)


def target_from_cell(grid, i, na=(), weights=None):
    """A target whose values are those of Earth cell i (physical units)."""
    feats = {}
    for j, f in enumerate(grid["meta"]["features"]):
        x = grid["values"][i, j]
        if math.isnan(x) or f["id"] in na:
            feats[f["id"]] = {"na": True}
        else:
            feats[f["id"]] = {"value": float(np.expm1(x) if f["transform"] == "log1p" else x)}
    dims = grid["meta"]["dimensions"]
    return {"features": feats, "weights": weights or {d: 1 for d in dims}}


def main():
    grid = load_grid()
    n = len(grid["cells"])
    i0 = cell_index(grid, 25.0, 20.0)  # Libyan Sahara
    assert i0 is not None

    # 1. A target made from a cell's own values scores exactly 1 at that cell, less elsewhere.
    t = target_from_cell(grid, i0)
    res = score_target(grid, t)
    assert abs(res["overall"][i0] - 1.0) < 1e-5, res["overall"][i0]
    assert np.nanmax(res["overall"]) <= 1.0 + 1e-6 and np.nanmin(res["overall"]) >= 0.0
    print("identity: own cell scores", float(res["overall"][i0]), "| median elsewhere",
          round(float(np.nanmedian(res["overall"])), 3))

    # 2. Vectorised scores agree with the plain-Python rules on random cells.
    rng = np.random.default_rng(0)
    for i in rng.choice(n, 300, replace=False):
        ref = scalar_score(grid, i, t)
        got = res["overall"][i]
        assert (ref is None) == bool(np.isnan(got)), (i, ref, got)
        if ref is not None:
            assert abs(ref - got) < 1e-5, (i, ref, got)
    print("vectorised == scalar on 300 random cells")

    # 3. Directional rules: a target far outside Earth's range clamps to p1 / p99.
    feats = grid["meta"]["features"]
    jp = [f["id"] for f in feats].index("precip")
    t2 = target_from_cell(grid, i0)
    t2["features"]["precip"] = {"value": 0.0}  # zero rainfall: below Earth's p1 only if p1 > 0
    r2 = score_target(grid, t2)
    if feats[jp]["p1"] > 0:
        assert r2["directional"].get("precip") == "low"
    t3 = target_from_cell(grid, i0)
    t3["features"]["lst_night_cold"] = {"value": 100.0}  # far colder than any Earth land cell
    r3 = score_target(grid, t3)
    assert r3["directional"]["lst_night_cold"] == "low"
    jn = [f["id"] for f in feats].index("lst_night_cold")
    coldest = int(np.nanargmin(grid["values"][:, jn]))
    assert abs(r3["feature_scores"][coldest, jn] - 1.0) < 1e-6  # coldest Earth cell: perfect
    assert r3["feature_scores"][i0, jn] < 0.01  # warm Sahara night: poor
    print("directional clamp: coldest Earth cell scores 1, Sahara", float(r3["feature_scores"][i0, jn]))

    # 4. n/a features are skipped; fewer than MIN_DIMENSIONS dimensions gives no score.
    by_dim = {}
    for f in feats:
        by_dim.setdefault(f["dimension"], []).append(f["id"])
    dims = list(by_dim)
    keep3, keep4 = dims[:MIN_DIMENSIONS - 1], dims[:MIN_DIMENSIONS]
    na3 = [f for d in dims if d not in keep3 for f in by_dim[d]]
    na4 = [f for d in dims if d not in keep4 for f in by_dim[d]]
    r3_ = score_target(grid, target_from_cell(grid, i0, na=na3))
    assert np.isnan(r3_["overall"]).all()  # 3 dimensions < 4: nothing is scored
    r4_ = score_target(grid, target_from_cell(grid, i0, na=na4))
    assert np.isfinite(r4_["overall"]).sum() > 0 and abs(r4_["overall"][i0] - 1.0) < 1e-5
    print(f"n/a skipping and the {MIN_DIMENSIONS}-dimension minimum behave "
          f"({len(keep3)} dims: no score, {len(keep4)} dims: {int(np.isfinite(r4_['overall']).sum())} cells scored)")

    # 5. Weights: a zero-weight dimension does not change the result.
    w = {d: 1 for d in grid["meta"]["dimensions"]}
    w["terrain"] = 0
    a = score_target(grid, t, weights=w)["overall"]
    assert abs(a[i0] - 1.0) < 1e-5
    print("all checks passed")


if __name__ == "__main__":
    main()
