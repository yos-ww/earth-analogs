"""Shared constants for the pipeline. The feature table mirrors docs/contract.md."""

from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
INTERIM = ROOT / "data" / "interim"  # per-feature 720x1440 arrays; gitignored
WEB_DATA = ROOT / "web" / "data"  # generated, committed (contract)

RES_DEG = 0.25
NCOLS, NROWS = 1440, 720

# Fixed order = column order of features.bin (docs/contract.md).
# (id, label, dimension, unit, transform)
FEATURES = [
    ("relief", "Relief", "terrain", "m", "log1p"),
    ("roughness", "Roughness", "terrain", "m", "log1p"),
    ("slope", "Mean slope", "terrain", "degrees", "log1p"),
    ("lst_day_warm", "Warmest-month day temperature", "temperature", "K", "none"),
    ("lst_night_cold", "Coldest-month night temperature", "temperature", "K", "none"),
    ("lst_range", "Day-night range", "temperature", "K", "none"),
    ("ndvi_max", "Yearly max NDVI", "vegetation", "-", "none"),
    ("precip", "Precipitation", "aridity", "mm/yr", "log1p"),
    ("albedo", "Albedo", "albedo", "-", "none"),
    ("snow_ice", "Snow/ice cover", "ice", "fraction", "none"),
    ("aod", "Aerosol optical depth", "dust", "-", "none"),
    ("emis_b29", "Emissivity 8.55 um", "geology", "-", "none"),
]
DIMENSIONS = ["terrain", "temperature", "vegetation", "aridity", "albedo", "ice", "dust", "geology"]


def cell_lat():
    """Latitude of each grid row centre, shape (NROWS,)."""
    return 90.0 - (np.arange(NROWS) + 0.5) * RES_DEG


def cell_weights():
    """cos(latitude) area weight per row, shape (NROWS,)."""
    return np.cos(np.radians(cell_lat()))
