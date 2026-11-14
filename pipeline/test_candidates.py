"""Checks for pipeline/candidates.py helpers (no raw data needed):
    ~/mamba/envs/analogs/bin/python -m pipeline.test_candidates
"""
import numpy as np

from .candidates import cand_id, cell_area_km2, haversine_km, label_regions
from .common import NCOLS, NROWS


def main():
    # Regions touching the antimeridian (col 1439 and col 0) are one region, also diagonally.
    m = np.zeros((NROWS, NCOLS), bool)
    m[100, 1439] = m[100, 0] = True       # same row
    m[300, 1439] = m[301, 0] = True       # diagonal across the seam
    m[500, 700] = True                    # separate
    lab, n = label_regions(m)
    assert n == 3, n
    assert lab[100, 1439] == lab[100, 0] and lab[300, 1439] == lab[301, 0]
    assert len({lab[100, 0], lab[300, 1439], lab[500, 700]}) == 3
    # Distances: one degree of latitude is 111.195 km; antipodes are half the circumference.
    assert abs(haversine_km(0, 0, 1, 0) - 111.195) < 0.01
    assert abs(haversine_km(10, 20, -10, -160) - np.pi * 6371.0088) < 0.01
    assert abs(haversine_km(0, 179.9, 0, -179.9) - haversine_km(0, 0, 0, 0.2)) < 0.01  # across the seam
    # Cell area: (27.8 km)^2 at the equator, cos(lat) smaller away from it.
    assert abs(cell_area_km2(0.0) - 773.5) < 1.0 and abs(cell_area_km2(60.0) / cell_area_km2(0.0) - 0.5) < 1e-6
    # Candidate ids encode the best cell's position, so they do not change with the ranking.
    c = {"target_id": "jezero", "lat": -17.125, "lon": 80.125}
    assert cand_id(c) == "jezero-17.12S-080.12E", cand_id(c)
    assert cand_id({"target_id": "x", "lat": 34.625, "lon": -120.375}) == "x-34.62N-120.38W"
    print("candidate helper checks passed")


if __name__ == "__main__":
    main()
