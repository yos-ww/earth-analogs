// Scoring rules from docs/contract.md ("Scoring"). Mirrors pipeline/score.py line by line,
// so the browser and Python give the same number. Pure functions: no DOM, testable in Node.

export const MIN_DIMENSIONS = 4; // a cell needs at least this many scored dimensions

// Read meta.json + cells.bin + features.bin into decoded transformed-space values.
// codes: Uint8Array (n_cells * n_features), 255 = no data.
export function decodeGrid(meta, cellsBuffer, featuresBuffer) {
  const cells = new Uint32Array(cellsBuffer); // little-endian on every browser we target
  const codes = new Uint8Array(featuresBuffer);
  const n = meta.n_cells, nf = meta.features.length;
  if (cells.length !== n || codes.length !== n * nf) {
    throw new Error(`data size mismatch: ${cells.length} cells, ${codes.length} codes, meta says ${n} x ${nf}`);
  }
  const values = new Float32Array(n * nf);
  for (let j = 0; j < nf; j++) {
    const { min, max } = meta.features[j];
    const step = (max - min) / 254;
    for (let i = 0; i < n; i++) {
      const c = codes[i * nf + j];
      values[i * nf + j] = c === 255 ? NaN : min + c * step;
    }
  }
  return { meta, cells, values, n, nf };
}

export function transform(value, kind) {
  return kind === "log1p" ? Math.log1p(value) : value;
}

// 'low' / 'high' if the target lies outside Earth's p1-p99 range, else null.
export function directional(feature, t) {
  return t < feature.p1 ? "low" : t > feature.p99 ? "high" : null;
}

// Per-feature scoring plan for one target: (target value t, sigma, mode) or null if skipped.
function featurePlan(meta, target) {
  const dims = meta.dimensions, dirs = {};
  const plan = meta.features.map((feat) => {
    const entry = target.features[feat.id];
    if (!entry || entry.na) return null; // no target value, or not meaningful: skipped
    const t = transform(entry.value, feat.transform);
    const d = directional(feat, t);
    if (d) dirs[feat.id] = d;
    return { t, d, sigma: feat.sigma, p1: feat.p1, p99: feat.p99, dim: dims.indexOf(feat.dimension) };
  });
  return { plan, dirs };
}

// Score (0-1) of one feature value f against its plan entry p.
function featureScore(p, f) {
  let diff;
  if (p.d === "low") diff = Math.max(f - p.p1, 0);       // Earth can only reach p1
  else if (p.d === "high") diff = Math.max(p.p99 - f, 0); // Earth can only reach p99
  else diff = f - p.t;
  const q = diff / p.sigma;
  return Math.exp(-q * q);
}

// Dimension scores of cell i into out[offset .. offset+nd); NaN = dimension missing.
function cellDimensions(values, nf, nd, plan, i, out, offset, sum, cnt) {
  sum.fill(0); cnt.fill(0);
  for (let j = 0; j < nf; j++) {
    const p = plan[j];
    if (!p) continue;
    const f = values[i * nf + j];
    if (Number.isNaN(f)) continue; // no data in this cell: skipped
    sum[p.dim] += featureScore(p, f);
    cnt[p.dim] += 1;
  }
  for (let k = 0; k < nd; k++) out[offset + k] = cnt[k] ? sum[k] / cnt[k] : NaN; // mean within dimension
}

// Per-dimension scores for one target. Returns Float32Array (n_cells * n_dims), NaN = missing,
// plus which features were scored one-sided. This is the slow part; it runs once per target.
export function dimensionScores(grid, target) {
  const { meta, values, n, nf } = grid;
  const nd = meta.dimensions.length;
  const { plan, dirs } = featurePlan(meta, target);
  const out = new Float32Array(n * nd);
  const sum = new Float64Array(nd), cnt = new Uint8Array(nd);
  for (let i = 0; i < n; i++) cellDimensions(values, nf, nd, plan, i, out, i * nd, sum, cnt);
  return { dimScores: out, directional: dirs, nd };
}

// The same scores for a single cell (used by the side panel to compare one place with every target).
// Returns { dims: Float32Array(nd), overall, directional }.
export function cellScores(grid, target, i, weights) {
  const { meta, values, nf } = grid;
  const nd = meta.dimensions.length;
  const { plan, dirs } = featurePlan(meta, target);
  const dims = new Float32Array(nd);
  cellDimensions(values, nf, nd, plan, i, dims, 0, new Float64Array(nd), new Uint8Array(nd));
  const overall = overallScores(dims, nd, weights || meta.dimensions.map((d) => target.weights?.[d] ?? 1))[0];
  return { dims, overall, directional: dirs };
}

// Overall score from cached dimension scores and slider weights. Fast: runs on every slider move.
// weights: array aligned with meta.dimensions. Returns Float32Array (n_cells), NaN = not scored.
export function overallScores(dimScores, nd, weights, out) {
  const n = dimScores.length / nd;
  out = out || new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let num = 0, den = 0, present = 0;
    for (let k = 0; k < nd; k++) {
      const s = dimScores[i * nd + k];
      if (Number.isNaN(s)) continue;
      present += 1;
      num += s * weights[k];
      den += weights[k];
    }
    out[i] = present >= MIN_DIMENSIONS && den > 0 ? num / den : NaN;
  }
  return out;
}

// Position in the cell arrays of the land cell containing (lat, lon), or -1. Binary search.
export function cellIndex(grid, lat, lon) {
  const ncols = grid.meta.grid.ncols, res = grid.meta.grid.res_deg;
  const r = Math.floor((90 - lat) / res), c = Math.floor((lon + 180) / res);
  const key = r * ncols + c;
  let lo = 0, hi = grid.cells.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1, v = grid.cells[mid];
    if (v === key) return mid;
    if (v < key) lo = mid + 1; else hi = mid - 1;
  }
  return -1;
}

// How many of the meta features a target has values for (for "incomplete target" notes).
export function targetCoverage(meta, target) {
  const have = meta.features.filter((f) => target.features[f.id]).length;
  return { have, total: meta.features.length };
}
