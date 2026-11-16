"""Figures for docs/writeup.md and the slides, drawn from the committed web/data/ files.

    ~/mamba/envs/analogs/bin/python -m pipeline.figures

Writes docs/figures/*.png:
  validation.png   known analog sites vs random barren land, per body (validation.json "bodies")
  sensitivity.png  the Mars result under changed choices (same runs as pipeline.sensitivity)
  candidates.png   the 55 candidates and the 37 known sites on a world map
  gulf.png         the candidates around the Arabian Gulf, for the pitch

The numbers are recomputed with the same functions as validate.py and sensitivity.py; the script
stops if they differ from web/data/validation.json, so a figure can never disagree with the data.
"""

import copy
import csv
import json
import warnings

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

from .common import NCOLS, NROWS, ROOT, WEB_DATA, cell_weights  # noqa: E402
from .score import load_grid, score_target  # noqa: E402
from .sensitivity import ATACAMA, POLAR, body_result  # noqa: E402
from .validate import BARREN_NDVI, Ranker, load_sites, rank_all, summarise, weighted_median  # noqa: E402

OUT = ROOT / "docs" / "figures"

# Reference palette (dataviz skill): categorical slots 1-2, neutrals and text inks, light surface.
SURFACE = "#fcfcfb"
INK = "#0b0b0b"
INK2 = "#52514e"
MUTED = "#898781"
GRID = "#e1e0d9"
AXIS = "#c3c2b7"
LAND = "#e9e8e2"
BODY_COLOR = {"mars": "#eb6834", "moon": "#2a78d6"}  # orange = Mars, blue = Moon (as on the globe legend)
KNOWN = "#2a78d6"  # known sites in the validation charts
BARREN = "#b5b3ab"  # neutral grey for the baseline
MARKERS = {"jezero": "o", "gale": "s", "utopia": "^", "arcadia": "D", "shackleton": "o", "marius_hills": "s"}
DOHA = (25.29, 51.53)

plt.rcParams.update(
    {
        "figure.facecolor": SURFACE,
        "axes.facecolor": SURFACE,
        "savefig.facecolor": SURFACE,
        "axes.edgecolor": AXIS,
        "axes.labelcolor": INK2,
        "xtick.color": MUTED,
        "ytick.color": MUTED,
        "text.color": INK,
        "font.size": 10,
        "axes.spines.top": False,
        "axes.spines.right": False,
        "axes.titleweight": "bold",
        "axes.titlesize": 11,
        "axes.titlelocation": "left",
    }
)


def setup():
    grid = load_grid()
    meta, cells = grid["meta"], grid["cells"]
    w = cell_weights()[cells // NCOLS].astype(np.float64)
    targets = json.loads((WEB_DATA / "targets.json").read_text())["targets"]
    jn = [f["id"] for f in meta["features"]].index("ndvi_max")
    ndvi = np.nan_to_num(grid["values"][:, jn], nan=1.0)
    return grid, w, targets, ndvi, load_sites(grid)


def best_of_body(grid, targets, body):
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", RuntimeWarning)
        return np.nanmax(
            np.stack([score_target(grid, t)["overall"] for t in targets if t["body"] == body]), axis=0
        )


def fig_validation(grid, w, targets, ndvi, sites, val):
    barren = ndvi < BARREN_NDVI
    fig, axes = plt.subplots(2, 1, figsize=(8, 6.2), sharex=True)
    for ax, body in zip(axes, ("mars", "moon")):
        score = best_of_body(grid, targets, body)
        summ = summarise(
            score,
            sites,
            barren,
            w,
            np.random.default_rng(1),
            lambda s: body in s["bodies"] and bool(s["dims"]),
        )
        ref = val["bodies"][body]
        for k in ("known_percentile_median", "random_barren_median", "n_sites"):
            assert abs(summ[k] - ref[k]) < 1e-9, (body, k, summ[k], ref[k])
        rank = Ranker(score, w)
        rank.values = score
        bar = np.flatnonzero(~np.isnan(score) & barren)
        bp = rank_all(rank, bar)
        assert abs(weighted_median(bp, w[bar]) - ref["random_barren_median"]) < 1e-3
        ax.hist(
            bp,
            bins=np.linspace(0, 1, 41),
            weights=w[bar] / w[bar].sum(),
            color=BARREN,
            edgecolor=SURFACE,
            linewidth=1.0,
            label="random barren land (area share)",
        )
        top = ax.get_ylim()[1]
        names = list(summ["sites"])
        pct = np.array([summ["sites"][n] for n in names])
        y = top * (1.12 + 0.18 * (np.arange(len(pct)) % 3))
        ax.scatter(
            pct,
            y,
            s=34,
            color=KNOWN,
            edgecolor=SURFACE,
            linewidth=1.2,
            zorder=3,
            label=f"known {body.capitalize()} analog sites ({len(pct)})",
        )
        km, bm = ref["known_percentile_median"], ref["random_barren_median"]
        ax.axvline(km, color=KNOWN, linewidth=2, zorder=2)
        ax.axvline(bm, color=MUTED, linewidth=2, linestyle=(0, (4, 3)), zorder=2)
        ax.set_ylim(0, top * 1.75)
        ax.set_yticks([])
        ax.spines["left"].set_visible(False)
        for j, i in enumerate(np.argsort(pct)[:3]):
            ax.annotate(
                short_site(names[i]),
                (pct[i], y[i]),
                xytext=(0, 8 if j % 2 == 0 else -14),
                textcoords="offset points",
                ha="center",
                fontsize=8,
                color=INK2,
            )
        p = ref["p_vs_barren"]
        nt = len(ref["targets"])
        ax.set_title(
            f"{body.capitalize()}: known sites median {km:.2f}, random barren land {bm:.2f}, "
            f"p = {p:.3f}  (best of {nt} targets)",
            fontsize=10,
        )
        ax.text(
            0.0,
            1.0,
            f"{len(pct)} known sites (dots, blue line = median)",
            transform=ax.transAxes,
            fontsize=8,
            color=INK2,
            va="top",
        )
    axes[1].set_xlabel(
        "Percentile among all of Earth's land (area-weighted); 1.0 = better match than all land"
    )
    axes[1].set_xlim(0, 1.02)
    fig.suptitle(
        "Do scientists' analog sites score higher than plain barren land?",
        x=0.01,
        ha="left",
        fontweight="bold",
        fontsize=12,
    )
    fig.text(
        0.01,
        0.005,
        "Grey bars: random barren land (max NDVI < 0.15), share of its area; dashed line = its median. "
        "p: share of 20,000 random barren sets that do as well.",
        fontsize=7.5,
        color=MUTED,
    )
    fig.tight_layout(rect=(0, 0.02, 1, 0.97))
    fig.savefig(OUT / "validation.png", dpi=200)
    plt.close(fig)


def fig_sensitivity(grid, w, targets, ndvi, sites, val):
    meta = grid["meta"]
    dims = meta["dimensions"]
    country = {
        r["name"]: r["country"]
        for r in csv.DictReader(open(ROOT / "data" / "known_analogs.csv", newline="", encoding="utf-8"))
    }
    usa = {n for n, c in country.items() if c == "USA"}
    barren = ndvi < BARREN_NDVI
    rows = [
        ("Design (barren = NDVI < 0.15, equal weights)", body_result(grid, targets, sites, barren, w, "mars"))
    ]
    ref = val["bodies"]["mars"]
    assert abs(rows[0][1]["known_percentile_median"] - ref["known_percentile_median"]) < 1e-9
    for thr in (0.10, 0.20, 0.30):
        rows.append((f"Barren = NDVI < {thr:.2f}", body_result(grid, targets, sites, ndvi < thr, w, "mars")))
    for label, drop in (
        ("Without the 4 Atacama sites", ATACAMA),
        ("Without the USA sites", usa),
        ("Without the 4 polar sites", POLAR),
    ):
        rows.append(
            (
                label,
                body_result(
                    grid, targets, sites, barren, w, "mars", keep=lambda s, d=drop: s["name"] not in d
                ),
            )
        )
    for d in dims:
        wts = {x: 1.0 for x in dims}
        wts[d] = 0.0
        rows.append((f"Drop {d}", body_result(grid, targets, sites, barren, w, "mars", weights=wts)))
    for k in (0.7, 1.4):
        g2 = dict(grid)
        g2["meta"] = copy.deepcopy(meta)
        for f in g2["meta"]["features"]:
            f["sigma"] *= k
        rows.append((f"All σ × {k}", body_result(g2, targets, sites, barren, w, "mars")))

    fig, ax = plt.subplots(figsize=(9, 7))
    n = len(rows)
    for i, (label, r) in enumerate(rows):
        yy = n - 1 - i
        k, b, p = r["known_percentile_median"], r["random_barren_median"], r["p_vs_barren"]
        ax.plot([b, k], [yy, yy], color=AXIS, linewidth=2, zorder=1)
        ax.scatter([b], [yy], s=48, color=BARREN, edgecolor=SURFACE, linewidth=1.2, zorder=2)
        ax.scatter([k], [yy], s=48, color=KNOWN, edgecolor=SURFACE, linewidth=1.2, zorder=3)
        ax.text(
            1.005,
            yy,
            f"p = {p:.3f}" + ("" if p < 0.05 else "  (≥ 0.05)"),
            va="center",
            fontsize=8.5,
            color=INK if p < 0.05 else MUTED,
            transform=ax.get_yaxis_transform(),
        )
    ax.set_yticks(range(n))
    ax.set_yticklabels([lab for lab, _ in rows][::-1], fontsize=8.5, color=INK2)
    ax.set_xlim(0.3, 1.0)
    ax.set_xlabel("Median percentile among Earth's land (area-weighted)")
    ax.grid(axis="x", color=GRID, linewidth=0.8)
    ax.set_axisbelow(True)
    for cut in (n - 1.5, n - 4.5, n - 7.5, n - 15.5):
        ax.axhline(cut, color=GRID, linewidth=0.8)
    ax.scatter([], [], s=48, color=KNOWN, label="known Mars analog sites")
    ax.scatter([], [], s=48, color=BARREN, label="random barren land")
    ax.legend(loc="upper left", frameon=False, fontsize=8.5, labelcolor=INK2)
    fig.suptitle(
        "Mars validation under changed choices", x=0.01, y=0.985, ha="left", fontweight="bold", fontsize=12
    )
    fig.text(
        0.01,
        0.925,
        "Known sites stay above barren land in every variant; whether p < 0.05 depends on the choice.",
        fontsize=9,
        color=INK2,
    )
    fig.text(
        0.01,
        0.005,
        "Same runs as python -m pipeline.sensitivity. p is a Monte Carlo estimate from 20,000 draws "
        "(design row 0.028 here, 0.024 in validation.json:\ndifferent random draws).",
        fontsize=7.5,
        color=MUTED,
    )
    fig.tight_layout(rect=(0, 0.04, 0.86, 0.91))
    fig.savefig(OUT / "sensitivity.png", dpi=200)
    plt.close(fig)
    return rows


def land_image(grid):
    img = np.zeros(NROWS * NCOLS, bool)
    img[grid["cells"]] = True
    return img.reshape(NROWS, NCOLS)


def draw_map(ax, grid, cands, known, extent, label_ranks=False, avoid=()):
    lon0, lon1, lat0, lat1 = extent
    land = np.ma.masked_where(~land_image(grid), np.ones((NROWS, NCOLS)))
    ax.imshow(
        land,
        extent=(-180, 180, -90, 90),
        cmap=matplotlib.colors.ListedColormap([LAND]),
        interpolation="nearest",
        zorder=0,
    )
    inside = lambda lo, la: lon0 <= lo <= lon1 and lat0 <= la <= lat1  # noqa: E731
    kx = [k for k in known if inside(k[1], k[0])]
    ax.scatter(
        [k[1] for k in kx],
        [k[0] for k in kx],
        marker="x",
        s=22,
        color=MUTED,
        linewidth=1.2,
        zorder=2,
        label="known analog site (our list of 37)",
    )
    labels = []
    tname = {t["id"]: t["name"] for t in json.loads((WEB_DATA / "targets.json").read_text())["targets"]}
    tbody = {t["id"]: t["body"] for t in json.loads((WEB_DATA / "targets.json").read_text())["targets"]}
    for tid in MARKERS:
        pts = [c for c in cands if c["properties"]["target_id"] == tid]
        xs = [c["geometry"]["coordinates"][0] for c in pts]
        ys = [c["geometry"]["coordinates"][1] for c in pts]
        ax.scatter(
            xs,
            ys,
            marker=MARKERS[tid],
            s=46,
            color=BODY_COLOR[tbody[tid]],
            edgecolor=SURFACE,
            linewidth=1.2,
            zorder=3,
            label=f"{tname[tid].split(' (')[0]} ({tbody[tid].capitalize()})",
        )
        if label_ranks:
            labels += [
                (x, y, f"{SHORT[tid]} #{c['properties']['rank']}")
                for c, x, y in zip(pts, xs, ys)
                if inside(x, y)
            ]
    ax.set_xlim(lon0, lon1)
    ax.set_ylim(lat0, lat1)
    ax.set_aspect("equal")
    if labels:
        place_labels(ax, labels, avoid=avoid)
    for s in ax.spines.values():
        s.set_visible(False)
    ax.tick_params(length=0, labelsize=7.5)


SHORT = {
    "jezero": "Jezero",
    "gale": "Gale",
    "utopia": "Utopia",
    "arcadia": "Arcadia",
    "shackleton": "Shackleton",
    "marius_hills": "Marius Hills",
}


def short_site(name):
    return " ".join(name.split(" (")[0].split()[:2])


def place_labels(ax, labels, fontsize=7, avoid=()):
    """Greedy placement in display pixels: try offsets around each point, nearest first, and keep the
    first whose box overlaps no earlier label and no point, and whose nearest point is its own (so a
    label never reads as another point's). Far offsets get a thin leader line."""
    fig = ax.figure
    fig.canvas.draw()
    px = fig.dpi / 72.0
    pts = [ax.transData.transform((x, y)) for x, y, _ in labels]
    obstacles = pts + [ax.transData.transform(a) for a in avoid]
    near = [(6, 3), (6, -12), (-6, 3), (-6, -12)]
    far = [(dx, dy) for dy in (20, -28, 32, -40, 44, -52) for dx in (12, -12, 30, -30)]
    boxes = []

    def box_at(X, Y, dx, dy, wpx, hpx):
        x0 = X + dx * px if dx > 0 else X + dx * px - wpx
        return (x0, Y + dy * px, x0 + wpx, Y + dy * px + hpx)

    order = sorted(range(len(labels)), key=lambda i: (-pts[i][1], pts[i][0]))
    for i in order:
        (x, y, text), (X, Y) = labels[i], pts[i]
        wpx, hpx = 0.6 * fontsize * px * len(text), 1.2 * fontsize * px
        chosen = None
        nb = [P[0] for j, P in enumerate(pts) if j != i and np.hypot(P[0] - X, P[1] - Y) < 40 * px]
        side = np.sign(X - np.mean(nb)) if nb else 0  # in a cluster, lead away from the neighbours
        far_i = sorted(far, key=lambda o: 0 if side == 0 or np.sign(o[0]) == side else 1)
        for dx, dy in near + far_i:
            b = box_at(X, Y, dx, dy, wpx, hpx)
            if any(not (b[2] < c[0] or b[0] > c[2] or b[3] < c[1] or b[1] > c[3]) for c in boxes):
                continue
            if any(b[0] - 4 < P[0] < b[2] + 4 and b[1] - 4 < P[1] < b[3] + 4 for P in obstacles):
                continue
            if (dx, dy) in far:  # a leader line says whose label it is
                chosen = (dx, dy)
                break
            cx = min(max(X, b[0]), b[2])
            cy = min(max(Y, b[1]), b[3])
            d_own = np.hypot(cx - X, cy - Y)
            if any(
                np.hypot(min(max(P[0], b[0]), b[2]) - P[0], min(max(P[1], b[1]), b[3]) - P[1]) < d_own
                for j, P in enumerate(pts)
                if j != i
            ):
                continue
            chosen = (dx, dy)
            break
        dx, dy = chosen or far[-1]
        boxes.append(box_at(X, Y, dx, dy, wpx, hpx))
        leader = (dx, dy) in far
        ax.annotate(
            text,
            (x, y),
            xytext=(dx, dy),
            textcoords="offset points",
            fontsize=fontsize,
            color=INK2,
            ha="left" if dx > 0 else "right",
            va="bottom",
            arrowprops=dict(arrowstyle="-", color=MUTED, linewidth=0.6, shrinkA=0, shrinkB=4)
            if leader
            else None,
        )


def read_known():
    return [
        (float(r["lat"]), float(r["lon"]))
        for r in csv.DictReader(open(ROOT / "data" / "known_analogs.csv", newline="", encoding="utf-8"))
    ]


def fig_candidates(grid):
    cands = json.loads((WEB_DATA / "candidates.geojson").read_text())["features"]
    known = read_known()
    fig, ax = plt.subplots(figsize=(10, 5.4))
    draw_map(ax, grid, cands, known, (-180, 180, -90, 84))
    ax.legend(loc="lower left", frameon=False, fontsize=7.5, labelcolor=INK2, ncol=2)
    ax.set_title(
        f"{len(cands)} candidate analog sites for six Mars and Moon targets "
        "(all at least 200 km from a known site)",
        fontsize=10,
    )
    fig.tight_layout()
    fig.savefig(OUT / "candidates.png", dpi=200)
    plt.close(fig)
    return len(cands)


def fig_gulf(grid):
    cands = json.loads((WEB_DATA / "candidates.geojson").read_text())["features"]
    fig, ax = plt.subplots(figsize=(9, 5.6))
    draw_map(
        ax,
        grid,
        cands,
        read_known(),
        (28, 72, 12, 40),
        label_ranks=True,
        avoid=[(DOHA[1], DOHA[0]), (DOHA[1] + 1.5, DOHA[0] - 0.6)],
    )
    ax.scatter([DOHA[1]], [DOHA[0]], marker="*", s=160, color=INK, zorder=4)
    ax.annotate(
        "Doha", (DOHA[1], DOHA[0]), xytext=(6, -12), textcoords="offset points", fontsize=9, fontweight="bold"
    )
    ax.legend(
        loc="lower left", frameon=True, facecolor=SURFACE, edgecolor=GRID, fontsize=7, labelcolor=INK2, ncol=2
    )
    ax.set_title("Candidates around the Arabian Gulf (label: target and its rank)", fontsize=10)
    fig.tight_layout()
    fig.savefig(OUT / "gulf.png", dpi=200)
    plt.close(fig)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    grid, w, targets, ndvi, sites = setup()
    val = json.loads((WEB_DATA / "validation.json").read_text())
    fig_validation(grid, w, targets, ndvi, sites, val)
    rows = fig_sensitivity(grid, w, targets, ndvi, sites, val)
    n = fig_candidates(grid)
    fig_gulf(grid)
    print(
        f"wrote {OUT.relative_to(ROOT)}/: validation.png, sensitivity.png ({len(rows)} variants), "
        f"candidates.png ({n} candidates), gulf.png"
    )
    for label, r in rows:
        print(
            f"  {label:45s} {r['known_percentile_median']:.2f} vs {r['random_barren_median']:.2f}  p {r['p_vs_barren']:.3f}"
        )


if __name__ == "__main__":
    main()
