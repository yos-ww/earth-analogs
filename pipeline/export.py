"""Write web/data/cells.bin, features.bin and meta.json (docs/contract.md) from data/interim/.

Usage (from the repo root):
    ~/mamba/envs/analogs/bin/python -m pipeline.export

Only features whose data/interim/<id>.npy exists are exported, in contract order, so a
feature that is not ready (or was dropped) is simply left out of features.bin and meta.json.
"""
import json

import numpy as np

from .common import DIMENSIONS, FEATURES, INTERIM, NCOLS, NROWS, RES_DEG, WEB_DATA, cell_weights

SIGMA_FLOOR_FRAC = 0.05  # sigma is at least 5% of (p99 - p1), so mostly-zero features keep sigma > 0


def weighted_percentile(x, w, q):
    """Area-weighted percentile(s) q (0-100) of x."""
    order = np.argsort(x)
    xs, ws = x[order], w[order]
    cw = (np.cumsum(ws) - 0.5 * ws) / ws.sum()
    return np.interp(np.asarray(q) / 100.0, cw, xs)


def transform(values, kind):
    return np.log1p(values) if kind == "log1p" else values


def main():
    land = np.load(INTERIM / "land.npy")
    cells = np.flatnonzero(land.ravel()).astype("<u4")  # sorted ascending
    w_all = np.broadcast_to(cell_weights()[:, None], (NROWS, NCOLS)).ravel()[cells]

    feats, cols = [], []
    for fid, label, dim, unit, kind in FEATURES:
        path = INTERIM / f"{fid}.npy"
        if not path.exists():
            continue
        raw = np.load(path).ravel()[cells].astype(np.float64)
        x = transform(raw, kind)
        ok = np.isfinite(x)
        lo, hi = float(x[ok].min()), float(x[ok].max())
        p1, q1, q3, p99 = weighted_percentile(x[ok], w_all[ok], [1, 25, 75, 99])
        sigma = max((q3 - q1) / 1.35, SIGMA_FLOOR_FRAC * (p99 - p1))
        code = np.full(x.shape, 255, np.uint8)
        code[ok] = np.clip(np.rint((x[ok] - lo) / (hi - lo) * 254), 0, 254).astype(np.uint8)
        cols.append(code)
        feats.append({
            "id": fid, "label": label, "dimension": dim, "unit": unit, "transform": kind,
            "min": round(lo, 6), "max": round(hi, 6), "sigma": round(float(sigma), 6),
            "p1": round(float(p1), 6), "p99": round(float(p99), 6),
        })
        print(f"{fid:14s} valid {ok.sum():6d}/{len(x)}  min {lo:.3f} max {hi:.3f}  "
              f"p1 {p1:.3f} p99 {p99:.3f}  sigma {sigma:.3f}")

    WEB_DATA.mkdir(parents=True, exist_ok=True)
    cells.tofile(WEB_DATA / "cells.bin")
    np.stack(cols, axis=1).tofile(WEB_DATA / "features.bin")  # n_cells x n_features, row-major
    dims = [d for d in DIMENSIONS if any(f["dimension"] == d for f in feats)]
    meta = {
        "contract_version": 1,
        "grid": {"res_deg": RES_DEG, "ncols": NCOLS, "nrows": NROWS},
        "n_cells": int(len(cells)),
        "dimensions": dims,
        "features": feats,
    }
    (WEB_DATA / "meta.json").write_text(json.dumps(meta, indent=2) + "\n")
    print(f"wrote {len(cells)} cells x {len(feats)} features, dimensions {dims}")


if __name__ == "__main__":
    main()
