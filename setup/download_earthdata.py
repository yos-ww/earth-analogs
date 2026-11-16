"""Download the NASA Earthdata datasets listed below into data/raw/.

Run once after `earthaccess` has saved your Earthdata login (~/.netrc):
    micromamba run -n analogs python setup/download_earthdata.py
Re-running skips files that are already complete.
"""
import re
from datetime import date, timedelta
from pathlib import Path

import earthaccess

ROOT = Path(__file__).resolve().parents[1] / "data" / "raw"

# (short_name, version, temporal range, folder)
DATASETS = [
    ("MOD10CM", "61", ("2021-01-01", "2023-12-31"), "MOD10CM"),        # snow, ~45 MB
    ("GPM_3IMERGM", "07", ("2021-01-01", "2023-12-31"), "IMERG"),      # rainfall, ~0.6 GB
    ("MOD11C3", "061", ("2021-01-01", "2023-12-31"), "MOD11C3"),       # land temperature, ~2.4 GB
    ("MOD13C2", "061", ("2022-01-01", "2023-12-31"), "MOD13C2"),       # vegetation, ~2.4 GB
    ("MOD08_M3", "6.1", ("2023-01-01", "2023-12-31"), "MOD08_M3"),     # dust/aerosol, ~4.2 GB
]
# Albedo is daily (74 GB/year), so take only the 15th of each month (~2 GB).
ALBEDO_DAYS = [f"2023-{m:02d}-15" for m in range(1, 13)]


def in_range(granule, temporal):
    """NASA's search returns every file whose time window overlaps the range:
    each daily albedo file spans 16 days, and the Dec-2022 monthly file touches
    2023-01-01. Keep only MODIS files whose own date (".AYYYYDDD.") is inside."""
    links = granule.data_links()
    if not links:
        return False  # nothing to download
    m = re.search(r"\.A(\d{4})(\d{3})\.", links[0])
    if not m:
        return True  # IMERG and others: no MODIS date stamp, keep
    d = date(int(m[1]), 1, 1) + timedelta(days=int(m[2]) - 1)
    return date.fromisoformat(temporal[0]) <= d <= date.fromisoformat(temporal[1])


def fetch(short_name, version, temporal, folder):
    out = ROOT / folder
    out.mkdir(parents=True, exist_ok=True)
    granules = earthaccess.search_data(short_name=short_name, version=version, temporal=temporal)
    granules = [g for g in granules if in_range(g, temporal)]
    print(f"{short_name} {temporal}: {len(granules)} files -> {out}")
    earthaccess.download(granules, str(out), threads=8)


def main():
    earthaccess.login(strategy="netrc")
    for args in DATASETS:
        fetch(*args)
    for day in ALBEDO_DAYS:
        fetch("MCD43C3", "061", (day, day), "MCD43C3")
    print("done")


if __name__ == "__main__":
    main()
