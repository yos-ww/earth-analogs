"""Download (or check) the non-Earthdata files in data/raw/: GMTED elevation and the PDS
Mars/Moon products listed in prep.md. Only the Python standard library is needed.

    python setup/download_other.py --check      # compare local sizes with the servers, download nothing
    python setup/download_other.py              # download what is missing or the wrong size

A file is skipped when its local size equals the server's Content-Length (so a truncated download
is replaced, which earthaccess does not do for the Earthdata products). Downloads go to
<name>.part and are renamed when complete. About 2.2 GB in total.
"""
import argparse
import sys
import urllib.request
from pathlib import Path

RAW = Path(__file__).resolve().parents[1] / "data" / "raw"
USGS = "https://edcintl.cr.usgs.gov/downloads/sciweb1/shared/topo/downloads/GMTED/Grid_ZipFiles/"
MOLA = "https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg064/"
TES = "https://pds-geosciences.wustl.edu/mgs/mgs-m-tes-5-timap-v1/"
LOLA = "https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/"
DIV = "https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_prp/"

# (folder, url). GDAL reads the PDS3 .img files only when the .lbl sits next to them.
FILES = (
    [("gmted", USGS + n) for n in ("mn30_grd.zip", "sd30_grd.zip")]
    + [("mola", MOLA + t + ext) for t in ("megt00n000gb", "megt00n180gb", "megt90n000gb", "megt90n180gb") for ext in (".img", ".lbl")]
    + [("tes", TES + "mgst_9001.zip")]
    + [("lola", LOLA + "cylindrical/img/ldem_64" + e) for e in (".img", ".lbl")]
    + [("lola", LOLA + "polar/img/" + n + e) for n in ("ldem_75s_240m", "ldem_80s_80m") for e in (".img", ".lbl")]
    + [("diviner", DIV + "dlre_prp_south" + e) for e in (".tab", ".xml", ".lbl")]
)


def remote_size(url):
    req = urllib.request.Request(url, method="HEAD")
    with urllib.request.urlopen(req, timeout=60) as r:
        return int(r.headers["Content-Length"])


def download(url, dest):
    part = dest.with_suffix(dest.suffix + ".part")
    with urllib.request.urlopen(url, timeout=120) as r, open(part, "wb") as f:
        while chunk := r.read(1 << 20):
            f.write(chunk)
    part.rename(dest)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="only compare sizes, download nothing")
    args = ap.parse_args()
    bad = fetched = 0
    for folder, url in FILES:
        dest = RAW / folder / url.rsplit("/", 1)[1]
        try:
            want = remote_size(url)
        except Exception as e:  # network or 404
            print(f"ERROR   {folder}/{dest.name}: cannot read the server size ({e})")
            bad += 1
            continue
        have = dest.stat().st_size if dest.exists() else None
        if have == want:
            print(f"ok      {folder}/{dest.name}  {want / 1e6:8.1f} MB")
            continue
        state = "missing" if have is None else f"size {have} != {want}"
        if args.check:
            bad += 1
            print(f"BAD     {folder}/{dest.name}: {state}")
        else:
            dest.parent.mkdir(parents=True, exist_ok=True)
            print(f"get     {folder}/{dest.name}: {state}; downloading {want / 1e6:.1f} MB ...", flush=True)
            download(url, dest)
            fetched += 1
    if fetched:
        print(f"downloaded {fetched} file(s)")
    print("all files present and complete" if not bad else f"{bad} file(s) missing, wrong size or unreachable")
    return 1 if (bad and args.check) else 0


if __name__ == "__main__":
    sys.exit(main())
