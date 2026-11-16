"""Golden scores for cross-checking the browser scorer (web/score.js) against pipeline/score.py.

    ~/mamba/envs/analogs/bin/python -m pipeline.golden        (also run by pipeline.export)

Writes tests/golden_scores.json: a synthetic target that exercises every scoring rule (one-sided low and
high, a log-transformed feature, an `na` feature inside a dimension that has others, a feature with no target row, non-uniform weights),
plus the Python result for a set of cells, including cells with missing data and cells that get no score.
A test in Node loads web/data/* with score.js and compares (tolerance 1e-4, float32 arithmetic).
`data_sha256` is the hash of cells.bin + features.bin + meta.json (CRLF turned into LF in the json) the numbers belong to.
"""
import hashlib
import json

import numpy as np

from .common import ROOT, WEB_DATA
from .score import load_grid, score_target

N_RANDOM = 250


def data_hash():
    h = hashlib.sha256()
    for name in ("cells.bin", "features.bin", "meta.json"):
        data = (WEB_DATA / name).read_bytes()
        if name.endswith(".json"):  # Git on Windows may check text files out with CRLF
            data = data.replace(b"\r\n", b"\n")
        h.update(data)
    return h.hexdigest()


def golden_target(meta):
    """A synthetic target built from the feature table (values chosen relative to each feature's range)."""
    feats = {}
    for f in meta["features"]:
        lo, hi = f["p1"], f["p99"]
        phys = (lambda x: float(np.expm1(x))) if f["transform"] == "log1p" else (lambda x: float(x))
        feats[f["id"]] = {"value": phys(lo + 0.35 * (hi - lo)), "status": "fixed"}  # inside Earth's range
    ids = [f["id"] for f in meta["features"]]
    by_id = {f["id"]: f for f in meta["features"]}
    if "lst_night_cold" in by_id:  # far below Earth's p1: one-sided low
        feats["lst_night_cold"] = {"value": 100.0, "status": "fixed"}
    if "lst_day_warm" in by_id:  # far above Earth's p99: one-sided high
        feats["lst_day_warm"] = {"value": 450.0, "status": "fixed"}
    if "lst_range" in ids:  # na for one of three temperature features; the dimension still has data
        feats["lst_range"] = {"na": True}
    if "slope" in ids:  # no target row at all
        del feats["slope"]
    dims = meta["dimensions"]
    weights = {d: round(0.5 + 0.37 * i, 3) for i, d in enumerate(dims)}
    return {"id": "golden", "name": "Golden test target", "body": "mars", "features": feats, "weights": weights}


def clean(a, nd=6):
    return [None if np.isnan(x) else round(float(x), nd) for x in a]


def main():
    grid = load_grid()
    meta = grid["meta"]
    target = golden_target(meta)
    res = score_target(grid, target)
    n = len(grid["cells"])
    rng = np.random.default_rng(42)
    present = (~np.isnan(res["dim_scores"])).sum(axis=1)
    picks = {0, n - 1}
    picks |= set(rng.choice(n, N_RANDOM, replace=False).tolist())
    picks |= set(np.flatnonzero(np.isnan(res["overall"]))[:10].tolist())                # no score
    picks |= set(np.flatnonzero(np.isnan(grid["values"]).any(axis=1) & ~np.isnan(res["overall"]))[:20].tolist())  # scored with gaps
    picks |= set(np.flatnonzero(present == 4)[:10].tolist())                              # exactly at the minimum
    picks |= set(np.flatnonzero(present == len(meta["dimensions"]))[:15].tolist())                 # every dimension present
    picks = sorted(picks)
    cases = [{"position": int(i), "cell": int(grid["cells"][i]), "dim_scores": clean(res["dim_scores"][i]),
              "overall": None if np.isnan(res["overall"][i]) else round(float(res["overall"][i]), 6)} for i in picks]
    out = {
        "note": "Expected output of pipeline/score.py for web/data/* with this target. Compare with web/score.js: "
                "dimensionScores() then overallScores() with weights in meta.dimensions order; tolerance 1e-4; null = NaN.",
        "data_sha256": data_hash(), "dimensions": meta["dimensions"], "target": target,
        "weights_in_dimension_order": [target["weights"][d] for d in meta["dimensions"]],
        "directional": res["directional"], "cases": cases,
    }
    path = ROOT / "tests" / "golden_scores.json"
    path.parent.mkdir(exist_ok=True)
    path.write_text(json.dumps(out) + "\n")
    scored = sum(c["overall"] is not None for c in cases)
    print(f"wrote tests/golden_scores.json: {len(cases)} cells ({scored} scored, {len(cases) - scored} unscored), "
          f"directional {res['directional']}")


if __name__ == "__main__":
    main()
