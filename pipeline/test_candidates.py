"""Checks for pipeline/candidates.py helpers (no raw data needed):
~/mamba/envs/analogs/bin/python -m pipeline.test_candidates
"""

import numpy as np

from .candidates import cand_id, cell_area_km2, haversine_km, label_regions, split_region
from .common import NCOLS, NROWS


def main():
    # Regions touching the antimeridian (col 1439 and col 0) are one region, also diagonally.
    m = np.zeros((NROWS, NCOLS), bool)
    m[100, 1439] = m[100, 0] = True  # same row
    m[300, 1439] = m[301, 0] = True  # diagonal across the seam
    m[500, 700] = True  # separate
    lab, n = label_regions(m)
    assert n == 3, n
    assert lab[100, 1439] == lab[100, 0] and lab[300, 1439] == lab[301, 0]
    assert len({lab[100, 0], lab[300, 1439], lab[500, 700]}) == 3
    # Distances: one degree of latitude is 111.195 km; antipodes are half the circumference.
    assert abs(haversine_km(0, 0, 1, 0) - 111.195) < 0.01
    assert abs(haversine_km(10, 20, -10, -160) - np.pi * 6371.0088) < 0.01
    assert abs(haversine_km(0, 179.9, 0, -179.9) - haversine_km(0, 0, 0, 0.2)) < 0.01  # across the seam
    # Cell area: (27.8 km)^2 at the equator, cos(lat) smaller away from it.
    assert (
        abs(cell_area_km2(0.0) - 773.5) < 1.0 and abs(cell_area_km2(60.0) / cell_area_km2(0.0) - 0.5) < 1e-6
    )
    # Candidate ids encode the best cell's position, so they do not change with the ranking.
    c = {"target_id": "jezero", "lat": -17.125, "lon": 80.125}
    assert cand_id(c) == "jezero-17.12S-080.12E", cand_id(c)
    assert cand_id({"target_id": "x", "lat": 34.625, "lon": -120.375}) == "x-34.62N-120.38W"
    # Splitting: two clusters 600 km apart become two pieces; one tight cluster stays whole.
    lat = np.array([30.0, 30.1, 30.2, 30.0, 35.4, 35.5, 35.5, 35.4])  # 5.4 deg of latitude is about 600 km
    lon = np.zeros(8)
    score = np.array([0.9, 0.8, 0.7, 0.6, 0.85, 0.75, 0.65, 0.55])
    idx = np.arange(8)
    pieces = split_region(idx, score, lat, lon)
    assert len(pieces) == 2 and sorted(map(len, pieces)) == [4, 4], [list(p) for p in pieces]
    assert {0, 1, 2, 3} in [set(p) for p in pieces] and {4, 5, 6, 7} in [set(p) for p in pieces]
    assert [len(p) for p in split_region(np.arange(4), score, lat, lon)] == [4]  # tight cluster: whole
    # a piece with fewer than MIN_CELLS cells is dropped
    lat2 = np.array([30.0, 30.1, 30.2, 35.4])
    assert [
        len(p) for p in split_region(np.arange(4), np.array([0.9, 0.8, 0.7, 0.85]), lat2, np.zeros(4))
    ] == [3]
    print("candidate helper checks passed")


if __name__ == "__main__":
    main()
