"""Write web/data/cells.bin, features.bin and meta.json (docs/contract.md) from data/interim/.

Usage (from the repo root):
    ~/mamba/envs/analogs/bin/python -m pipeline.export

Only features whose data/interim/<id>.npy exists are exported, in contract order, so a
feature that is not ready (or was dropped) is simply left out of features.bin and meta.json.
"""

import csv
import json

import numpy as np

from .common import DIMENSIONS, FEATURES, INTERIM, NCOLS, NROWS, RES_DEG, ROOT, WEB_DATA, cell_weights

SIGMA_FLOOR_FRAC = 0.05  # sigma is at least 5% of (p99 - p1), so mostly-zero features keep sigma > 0


def weighted_percentile(x, w, q):
    """Area-weighted percentile(s) q (0-100) of x."""
    order = np.argsort(x)
    xs, ws = x[order], w[order]
    cw = (np.cumsum(ws) - 0.5 * ws) / ws.sum()
    return np.interp(np.asarray(q) / 100.0, cw, xs)


def transform(values, kind):
    return np.log1p(values) if kind == "log1p" else values


def export_targets(targets_csv=None, literature_csv=None, out=None):
    """Write web/data/targets.json from B's two CSVs (literature values only; docs/contract.md).

    data/targets.csv:             target_id, name, body, lat, lon, source, source_url
    data/targets_literature.csv:  target_id, feature_id, value, unit, value_kind, source, source_url
                                  [, status]   (optional; literature (default), computed or fixed)
    A feature_id is a feature id, `limit:<name>` (goes to limits) or `info:<name>` (not_scored).
    value = `na` marks a feature with no meaning for that target.
    data/targets_computed.csv (A, same columns) is applied after the literature file, so a
    computed value replaces a literature placeholder for the same target and feature.
    """
    targets_csv = targets_csv or ROOT / "data" / "targets.csv"
    literature_csv = literature_csv or ROOT / "data" / "targets_literature.csv"
    out = out or WEB_DATA / "targets.json"
    if not (targets_csv.exists() and literature_csv.exists()):
        print(f"targets.json skipped: {targets_csv.name} / {literature_csv.name} not both present")
        return
    feature_ids = {f[0] for f in FEATURES}
    targets = {}
    for t in csv.DictReader(open(targets_csv, newline="", encoding="utf-8")):
        targets[t["target_id"]] = {
            "id": t["target_id"],
            "name": t["name"],
            "body": t["body"],
            "lat": float(t["lat"]),
            "lon": float(t["lon"]),
            "features": {},
            "weights": {d: 1 for d in DIMENSIONS},
            "not_scored": {},
            "limits": {},
        }
    problems = []
    rows = list(csv.DictReader(open(literature_csv, newline="", encoding="utf-8")))
    computed_csv = ROOT / "data" / "targets_computed.csv"  # A's values (pipeline/targets.py)
    if computed_csv.exists() and literature_csv == ROOT / "data" / "targets_literature.csv":
        rows += list(csv.DictReader(open(computed_csv, newline="", encoding="utf-8")))  # later rows win
    for row in rows:
        t = targets.get(row["target_id"])
        fid, raw = row["feature_id"].strip(), row["value"].strip()
        if t is None:
            problems.append(f"unknown target_id {row['target_id']!r}")
            continue
        src = {"source": row["source"].strip()}
        if row.get("source_url", "").strip():
            src["source_url"] = row["source_url"].strip()
        if fid.startswith("limit:"):
            t["limits"][fid[6:]] = {"value": float(raw), **src}
        elif fid.startswith("info:"):
            t["not_scored"][fid[5:]] = {"value": float(raw), "unit": row["unit"].strip(), **src}
        elif fid in feature_ids:
            if raw.lower() == "na":
                t["features"][fid] = {"na": True}
            else:
                entry = {"value": float(raw)}
                if row.get("value_kind", "").strip():
                    entry["value_kind"] = row["value_kind"].strip()
                entry["status"] = (row.get("status") or "").strip() or "literature"
                t["features"][fid] = {**entry, **src}
        else:
            problems.append(f"{row['target_id']}: unknown feature_id {fid!r}")
    for t in targets.values():
        missing = [f for f in feature_ids if f not in t["features"]]
        if missing:
            problems.append(f"{t['id']}: no row yet for {', '.join(sorted(missing))}")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"targets": list(targets.values())}, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {out.name}: {len(targets)} targets")
    for p in problems:
        print("  note:", p)


def export_known_analogs(src=None, out=None):
    """Write web/data/known_analogs.geojson from B's data/known_analogs.csv (docs/contract.md).
    Properties: name, country, body (list of mars/moon), dimensions (list), why_analog,
    reference, source_url. GeoJSON coordinates are [lon, lat]."""
    src = src or ROOT / "data" / "known_analogs.csv"
    out = out or WEB_DATA / "known_analogs.geojson"
    feats = []
    for r in csv.DictReader(open(src, newline="", encoding="utf-8")):
        lat, lon = float(r["lat"]), float(r["lon"])
        assert -90 <= lat <= 90 and -180 <= lon <= 180, r["name"]
        feats.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [lon, lat]},
                "properties": {
                    "name": r["name"],
                    "country": r["country"],
                    "body": [b.strip().lower() for b in r["body"].split("|")],
                    "dimensions": [d.strip() for d in r["dimensions"].split("|")],
                    "why_analog": r["why_analog"],
                    "reference": r["reference"],
                    "source_url": r["source_url"],
                },
            }
        )
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps({"type": "FeatureCollection", "features": feats}, indent=1, ensure_ascii=False) + "\n"
    )
    print(f"wrote {out.name}: {len(feats)} sites")


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
        feats.append(
            {
                "id": fid,
                "label": label,
                "dimension": dim,
                "unit": unit,
                "transform": kind,
                "min": round(lo, 6),
                "max": round(hi, 6),
                "sigma": round(float(sigma), 6),
                "p1": round(float(p1), 6),
                "p99": round(float(p99), 6),
            }
        )
        print(
            f"{fid:14s} valid {ok.sum():6d}/{len(x)}  min {lo:.3f} max {hi:.3f}  "
            f"p1 {p1:.3f} p99 {p99:.3f}  sigma {sigma:.3f}"
        )

    WEB_DATA.mkdir(parents=True, exist_ok=True)
    cells.tofile(WEB_DATA / "cells.bin")
    np.stack(cols, axis=1).tofile(WEB_DATA / "features.bin")  # n_cells x n_features, row-major
    dims = [d for d in DIMENSIONS if any(f["dimension"] == d for f in feats)]
    meta = {
        "contract_version": 2,
        "grid": {"res_deg": RES_DEG, "ncols": NCOLS, "nrows": NROWS},
        "n_cells": int(len(cells)),
        "dimensions": dims,
        "features": feats,
    }
    (WEB_DATA / "meta.json").write_text(json.dumps(meta, indent=2) + "\n")
    print(f"wrote {len(cells)} cells x {len(feats)} features, dimensions {dims}")
    export_targets()
    export_known_analogs()
    from .golden import main as golden_main

    golden_main()  # expected scores for the browser cross-check; hashes the files just written


if __name__ == "__main__":
    main()
