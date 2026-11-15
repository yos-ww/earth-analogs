"""Consistency checks for web/data/* against docs/contract.md and data/interim/:
    ~/mamba/envs/analogs/bin/python -m pipeline.test_export
"""
import json

import numpy as np

from .common import BARREN_NDVI, DIMENSIONS, FEATURES, INTERIM, NCOLS, NROWS, WEB_DATA
from .golden import data_hash


def main():
    meta = json.loads((WEB_DATA / "meta.json").read_text())
    cells = np.fromfile(WEB_DATA / "cells.bin", "<u4")
    n, nf = meta["n_cells"], len(meta["features"])
    codes = np.fromfile(WEB_DATA / "features.bin", np.uint8)

    assert meta["contract_version"] == 2 and meta["grid"] == {"res_deg": 0.25, "ncols": NCOLS, "nrows": NROWS}
    assert len(cells) == n and codes.size == n * nf, "cells.bin / features.bin disagree with meta.json"
    assert (np.diff(cells.astype(np.int64)) > 0).all() and cells.max() < NCOLS * NROWS, "cells not sorted/unique/in range"
    codes = codes.reshape(n, nf)
    ids = [f["id"] for f in meta["features"]]
    assert ids == [f[0] for f in FEATURES if f[0] in ids], "feature order differs from the contract"
    assert meta["dimensions"] == [d for d in DIMENSIONS if any(f["dimension"] == d for f in meta["features"])]

    land = np.load(INTERIM / "land.npy").ravel()
    assert np.array_equal(cells, np.flatnonzero(land)), "cells.bin is not exactly the land mask"

    for j, f in enumerate(meta["features"]):
        assert f["min"] <= f["p1"] <= f["p99"] <= f["max"] and f["sigma"] > 0, f["id"]
        src = np.load(INTERIM / f"{f['id']}.npy").ravel()[cells].astype(np.float64)
        if f["id"] == "aod":  # aerosol is scored only over bare ground (export.py)
            ndvi = np.load(INTERIM / "ndvi_max.npy").ravel()[cells]
            src[np.nan_to_num(ndvi, nan=0.0) >= BARREN_NDVI] = np.nan
        x = np.log1p(src) if f["transform"] == "log1p" else src
        ok = codes[:, j] != 255
        assert (ok == np.isfinite(x)).all(), f"{f['id']}: no-data flags differ from the source"
        # the stored range is the observed range of the decoded data
        assert abs(f["min"] - x[ok].min()) < 1e-5 and abs(f["max"] - x[ok].max()) < 1e-5, f["id"]
        dec = f["min"] + codes[ok, j] / 254.0 * (f["max"] - f["min"])
        assert np.abs(dec - x[ok]).max() <= (f["max"] - f["min"]) / 254 / 2 + 1e-6, f"{f['id']}: decode error too large"
        assert codes[ok, j].max() <= 254

    g = json.loads((WEB_DATA.parents[1] / "tests" / "golden_scores.json").read_text())
    assert g["data_sha256"] == data_hash(), "tests/golden_scores.json is stale: run python -m pipeline.export"
    print(f"export checks passed: {n} cells x {nf} features, ranges and decoding verified, golden file current")


if __name__ == "__main__":
    main()
