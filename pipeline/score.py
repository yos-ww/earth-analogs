"""Score every land cell against a target, exactly as docs/contract.md ("Scoring") says.

The browser implements the same rules; both must give the same number.

    from pipeline.score import load_grid, score_target
    grid = load_grid()
    res = score_target(grid, target)        # target = one entry of web/data/targets.json

Command line (needs web/data/targets.json):
    ~/mamba/envs/analogs/bin/python -m pipeline.score jezero     # top cells for one target
    ~/mamba/envs/analogs/bin/python -m pipeline.score --validate  # writes web/data/validation.json
"""
import json
import sys
import warnings

import numpy as np

from .common import NCOLS, WEB_DATA

MIN_DIMENSIONS = 4  # a cell needs at least this many scored dimensions


def load_grid(data_dir=WEB_DATA):
    """Read meta.json, cells.bin and features.bin; return decoded transformed-space values."""
    meta = json.loads((data_dir / "meta.json").read_text())
    cells = np.fromfile(data_dir / "cells.bin", "<u4")
    n, nf = meta["n_cells"], len(meta["features"])
    codes = np.fromfile(data_dir / "features.bin", np.uint8).reshape(n, nf)
    assert len(cells) == n
    values = np.empty((n, nf), np.float32)
    for j, f in enumerate(meta["features"]):
        values[:, j] = f["min"] + codes[:, j] / 254.0 * (f["max"] - f["min"])
    values[codes == 255] = np.nan
    return {"meta": meta, "cells": cells, "values": values}


def transform(value, kind):
    return np.log1p(value) if kind == "log1p" else value


def directional(feature, t):
    """'low' / 'high' if the target lies outside Earth's p1-p99 range, else None."""
    return "low" if t < feature["p1"] else "high" if t > feature["p99"] else None


def feature_scores(f_values, feature, t):
    """Score (0-1) of one feature for all cells; NaN where the cell has no data."""
    sigma = feature["sigma"]
    d = directional(feature, t)
    if d == "low":  # Earth can only be at or above p1: anything at or below scores 1
        diff = np.maximum(f_values - feature["p1"], 0.0)
    elif d == "high":
        diff = np.maximum(feature["p99"] - f_values, 0.0)
    else:
        diff = f_values - t
    return np.exp(-((diff / sigma) ** 2))


def score_target(grid, target, weights=None):
    """Per-feature, per-dimension and overall scores for one target.

    Returns a dict with
      feature_scores  (n_cells, n_features)    NaN = skipped
      dim_scores      (n_cells, n_dimensions)  NaN = dimension missing
      overall         (n_cells,)               NaN = fewer than MIN_DIMENSIONS dimensions
      directional     {feature_id: 'low' | 'high'} for features scored one-sided
    `weights` overrides target["weights"] (dimension -> weight).
    """
    meta, values = grid["meta"], grid["values"]
    dims = meta["dimensions"]
    weights = weights or target["weights"]
    fs = np.full(values.shape, np.nan, np.float32)
    dirs = {}
    for j, feat in enumerate(meta["features"]):
        entry = target["features"].get(feat["id"])
        if entry is None or entry.get("na"):
            continue  # no target value, or not meaningful for this target: skipped
        t = transform(entry["value"], feat["transform"])
        fs[:, j] = feature_scores(values[:, j], feat, t)
        if directional(feat, t):
            dirs[feat["id"]] = directional(feat, t)

    dim_scores = np.full((len(values), len(dims)), np.nan, np.float32)
    for k, d in enumerate(dims):
        cols = [j for j, f in enumerate(meta["features"]) if f["dimension"] == d]
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", RuntimeWarning)  # all-NaN rows are expected
            dim_scores[:, k] = np.nanmean(fs[:, cols], axis=1) if cols else np.nan

    w = np.array([weights.get(d, 0.0) for d in dims], np.float64)
    present = ~np.isnan(dim_scores)
    num = np.where(present, np.nan_to_num(dim_scores) * w, 0.0).sum(axis=1)
    den = (present * w).sum(axis=1)
    with np.errstate(all="ignore"):
        overall = np.where((present.sum(axis=1) >= MIN_DIMENSIONS) & (den > 0), num / den, np.nan)
    return {"feature_scores": fs, "dim_scores": dim_scores, "overall": overall.astype(np.float32),
            "directional": dirs}


def cell_index(grid, lat, lon):
    """Position in the cell arrays of the land cell containing (lat, lon), or None."""
    r, c = int((90.0 - lat) / 0.25), int((lon + 180.0) / 0.25)
    i = np.searchsorted(grid["cells"], r * NCOLS + c)
    return int(i) if i < len(grid["cells"]) and grid["cells"][i] == r * NCOLS + c else None


if __name__ == "__main__":
    if "--validate" in sys.argv:  # known analogs vs random land and barren land -> validation.json
        from .validate import main as validate_main
        validate_main()
        sys.exit(0)
    grid = load_grid()
    targets = {t["id"]: t for t in json.loads((WEB_DATA / "targets.json").read_text())["targets"]}
    t = targets[sys.argv[1]]
    res = score_target(grid, t)
    top = np.argsort(np.nan_to_num(res["overall"], nan=-1))[::-1][:10]
    print(f"{t['name']}: directional {res['directional']}")
    for i in top:
        cell = int(grid["cells"][i])
        lat, lon = 90 - (cell // NCOLS + 0.5) * 0.25, -180 + (cell % NCOLS + 0.5) * 0.25
        print(f"  {res['overall'][i]:.3f}  lat {lat:7.2f} lon {lon:8.2f}")
