// Analog Atlas: 3D globe coloured by how well each Earth land cell matches a Moon or Mars target.
// Data formats: docs/contract.md. Scoring: score.js (mirrors pipeline/score.py).
import { decodeGrid, dimensionScores, overallScores, cellIndex, targetCoverage, MIN_DIMENSIONS } from "./score.js";

const DATA_DIR = "data"; // "mock" to test against web/mock/*

// Colour ramp for scores 0..1 (viridis stops), plus ocean and no-data colours.
const RAMP_STOPS = ["#440154", "#3b528b", "#21918c", "#5ec962", "#fde725"];
const OCEAN = [10, 22, 44];
const NO_DATA = [58, 63, 75];

const $ = (id) => document.getElementById(id);
const status = (msg) => { $("status").textContent = msg; };

const state = { grid: null, targets: [], target: null, dims: null, weights: [], overall: null, clicked: null };

// ---------- colours ----------
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const LUT = (() => {
  const stops = RAMP_STOPS.map(hexToRgb), lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const x = (i / 255) * (stops.length - 1), k = Math.min(Math.floor(x), stops.length - 2), f = x - k;
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = stops[k][c] + (stops[k + 1][c] - stops[k][c]) * f;
  }
  return lut;
})();
document.querySelector(".ramp").style.background = `linear-gradient(90deg, ${RAMP_STOPS.join(",")})`;

// ---------- globe and its texture ----------
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
let image = null;

const globe = new Globe($("globe"))
  .backgroundColor("#05070d")
  .showAtmosphere(true)
  .atmosphereColor("#7fb2ff")
  .atmosphereAltitude(0.18)
  .pointOfView({ lat: 20, lng: 20, altitude: 2.2 })
  .onGlobeClick(({ lat, lng }) => showPlace(lat, lng));

function paint() {
  const { grid, overall } = state;
  const px = image.data;
  for (let p = 0; p < px.length; p += 4) { px[p] = OCEAN[0]; px[p + 1] = OCEAN[1]; px[p + 2] = OCEAN[2]; px[p + 3] = 255; }
  for (let i = 0; i < grid.n; i++) {
    const p = grid.cells[i] * 4, s = overall[i];
    if (Number.isNaN(s)) { px[p] = NO_DATA[0]; px[p + 1] = NO_DATA[1]; px[p + 2] = NO_DATA[2]; continue; }
    const k = Math.round(Math.min(Math.max(s, 0), 1) * 255) * 3;
    px[p] = LUT[k]; px[p + 1] = LUT[k + 1]; px[p + 2] = LUT[k + 2];
  }
  ctx.putImageData(image, 0, 0);
  // First paint: hand the image to globe.gl. Later paints: swap the pixels of the same texture.
  const map = globe.globeMaterial().map;
  if (map) { map.image = canvas; map.needsUpdate = true; }
  else globe.globeImageUrl(canvas.toDataURL());
}

let frame = 0;
function rescore() { // throttled to one repaint per animation frame
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    state.overall = overallScores(state.dims.dimScores, state.dims.nd, state.weights, state.overall);
    paint();
    if (state.clicked) showPlace(...state.clicked);
  });
}

// ---------- controls ----------
const label = (d) => d.charAt(0).toUpperCase() + d.slice(1);

function buildSliders() {
  const box = $("sliders");
  box.innerHTML = "";
  state.grid.meta.dimensions.forEach((d, k) => {
    const row = document.createElement("div");
    row.className = "slider";
    row.innerHTML = `<label for="w-${d}">${label(d)}</label>
      <input id="w-${d}" type="range" min="0" max="2" step="0.1" value="${state.weights[k]}">
      <span>${state.weights[k].toFixed(1)}</span>`;
    const input = row.querySelector("input"), out = row.querySelector("span");
    input.addEventListener("input", () => {
      state.weights[k] = Number(input.value);
      out.textContent = state.weights[k].toFixed(1);
      rescore();
    });
    box.appendChild(row);
  });
}

function selectTarget(id) {
  const t = state.targets.find((x) => x.id === id);
  const { meta } = state.grid;
  state.target = t;
  state.weights = meta.dimensions.map((d) => t.weights?.[d] ?? 1);
  state.dims = dimensionScores(state.grid, t);
  const cov = targetCoverage(meta, t);
  const dirs = Object.keys(state.dims.directional);
  $("target-note").textContent =
    `${t.body === "moon" ? "Moon" : "Mars"} · ${t.lat.toFixed(2)}°, ${t.lon.toFixed(2)}° · values for ${cov.have} of ${cov.total} features` +
    (cov.have < MIN_DIMENSIONS ? " — not enough yet to score Earth (target values still being collected)" : "") +
    (dirs.length ? ` · directional: ${dirs.join(", ")}` : "");
  buildSliders();
  rescore();
}

$("reset").addEventListener("click", () => {
  state.weights = state.grid.meta.dimensions.map(() => 1);
  buildSliders();
  rescore();
});

// ---------- clicked place ----------
function showPlace(lat, lng) {
  state.clicked = [lat, lng];
  const { grid, dims, overall } = state;
  const i = cellIndex(grid, lat, lng);
  $("place").hidden = false;
  const where = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"}, ${Math.abs(lng).toFixed(2)}°${lng >= 0 ? "E" : "W"}`;
  if (i < 0) { $("place-head").textContent = `${where} · ocean or not on the land grid`; $("place-dims").innerHTML = ""; return; }
  const s = overall[i];
  $("place-head").innerHTML = Number.isNaN(s)
    ? `${where} · not scored (fewer than ${MIN_DIMENSIONS} dimensions with data)`
    : `${where} · match <strong>${s.toFixed(2)}</strong>`;
  const dirDims = new Set(grid.meta.features.filter((f) => dims.directional[f.id]).map((f) => f.dimension));
  $("place-dims").innerHTML = grid.meta.dimensions.map((d, k) => {
    const v = dims.dimScores[i * dims.nd + k];
    const badge = dirDims.has(d) ? `<span class="badge" title="The target lies beyond anything on Earth; Earth can only point in this direction">directional</span>` : "";
    if (Number.isNaN(v)) return `<div class="dim missing"><span>${label(d)}${badge}</span><div class="track"></div><span class="val">–</span></div>`;
    return `<div class="dim"><span>${label(d)}${badge}</span><div class="track"><div class="fill" style="width:${(v * 100).toFixed(0)}%"></div></div><span class="val">${v.toFixed(2)}</span></div>`;
  }).join("");
}

// ---------- load ----------
async function fetchOk(path, kind) {
  const r = await fetch(`${DATA_DIR}/${path}`);
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return kind === "json" ? r.json() : r.arrayBuffer();
}

async function main() {
  const [meta, cellsBuf, featBuf, targets] = await Promise.all([
    fetchOk("meta.json", "json"), fetchOk("cells.bin"), fetchOk("features.bin"), fetchOk("targets.json", "json"),
  ]);
  state.grid = decodeGrid(meta, cellsBuf, featBuf);
  state.targets = targets.targets;
  canvas.width = meta.grid.ncols; canvas.height = meta.grid.nrows;
  image = ctx.createImageData(canvas.width, canvas.height);

  const sel = $("target");
  for (const body of ["mars", "moon"]) {
    const group = document.createElement("optgroup");
    group.label = body === "mars" ? "Mars" : "Moon";
    for (const t of state.targets.filter((x) => x.body === body)) {
      const cov = targetCoverage(meta, t);
      group.appendChild(new Option(cov.have < MIN_DIMENSIONS ? `${t.name} (values pending)` : t.name, t.id));
    }
    sel.appendChild(group);
  }
  sel.addEventListener("change", () => selectTarget(sel.value));
  const first = state.targets.find((t) => targetCoverage(meta, t).have >= MIN_DIMENSIONS) || state.targets[0];
  sel.value = first.id;
  selectTarget(first.id);
  status(`${meta.n_cells.toLocaleString()} land cells · ${meta.features.length} features in ${meta.dimensions.length} dimensions · click the globe to inspect a place`);
}

main().catch((e) => { console.error(e); status(`Could not load data: ${e.message}`); });
