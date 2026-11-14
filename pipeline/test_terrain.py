"""Checks for the target-side terrain code (pipeline/targets.py). No raw data needed:
    ~/mamba/envs/analogs/bin/python -m pipeline.test_terrain
"""
import numpy as np

from .targets import terrain_stats

PX = 926.0


def main():
    expected = float(np.degrees(np.arctan(0.1)))  # rise 0.1 m per metre = 5.711 degrees
    # East-west plane at several latitudes: columns are PX * cos(lat) metres apart on the ground,
    # and the window is 1/cos(lat) times wider. Polar grids have square pixels.
    for lat, polar in ((0, False), (40, False), (65, False), (-89.7, True)):
        cosl = 1.0 if polar else np.cos(np.radians(lat))
        ny, nx = 31, int(round(31 / cosl)) + 8
        x_m = np.arange(nx) * PX * cosl
        h = np.tile(0.1 * x_m, (ny, 1))
        rough, relief, slope, _f, _n = terrain_stats(h, PX, lat, polar)
        assert abs(slope - expected) < 0.01, (lat, slope)
        assert abs(relief - 0.1 * np.ptp(x_m)) < 1.0, (lat, relief)
    # North-south plane (rows are PX metres apart at any latitude)
    h = np.tile((0.1 * np.arange(31) * PX)[:, None], (1, 40))
    assert abs(terrain_stats(h, PX, 40, False)[2] - expected) < 0.01
    # Flat ground: zero everywhere
    assert terrain_stats(np.full((31, 31), 500.0), PX, 10, False)[:3] == (0.0, 0.0, 0.0)
    # Block averaging: a 474 m grid (LOLA 64 px/deg) is averaged by 2 before measuring, and a
    # 240 m grid by 4, so a plane gives the same slope on every grid.
    for px in (474.0, 240.0):
        n = 130
        h = np.tile(0.1 * np.arange(n) * px, (n, 1))
        assert abs(terrain_stats(h, px, 0, True)[2] - expected) < 0.01, px
    print("terrain checks passed: slope 5.711 deg recovered on all grids and latitudes")


if __name__ == "__main__":
    main()
