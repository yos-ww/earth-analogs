// Analog Atlas: 3D globe coloured by how well each Earth land cell matches a Moon or Mars target.
// Data formats: docs/contract.md. Scoring: score.js (mirrors pipeline/score.py).
import { decodeGrid, dimensionScores, overallScores, cellIndex, targetCoverage, MIN_DIMENSIONS } from "./score.js";

const DATA_DIR = "data"; // "mock" to test against web/mock/*
const IMG = { earth: "img/earth-blue-marble.jpg", bump: "img/earth-topology.png" };

// Heat ramp for good matches. Poor matches stay transparent so the real Earth shows through;
// opacity rises with the score from SHOW_FROM (invisible) to 1 (MAX_ALPHA).
const RAMP_STOPS = ["#ffe66d", "#ffb02e", "#ff6a1a", "#e8202a", "#a3004f"]; // low -> high match
const SHOW_FROM = 0.35;         // scores below this are fully transparent
const MAX_ALPHA = 235;          // 0-255 opacity of a perfect match
const TEX_SCALE = 2;            // texture = 2x the score grid (2880 x 1440), smoothed
const FADE_MS = 550;            // cross-fade when the target changes
const BODY_COLOUR = { mars: "#ff7a45", moon: "#f2f5fa" };
const RESUME_ROTATE_MS = 2500;  // auto-rotation resumes this long after the user lets go
const ICE_SHEET_FROM = 0.9;     // snow_ice fraction from which a cell counts as permanent ice sheet

const $ = (id) => document.getElementById(id);
const status = (msg) => { $("status").textContent = msg; };
const label = (d) => d.charAt(0).toUpperCase() + d.slice(1);
const fmtLatLon = (lat, lng) =>
  `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"}, ${Math.abs(lng).toFixed(2)}°${lng >= 0 ? "E" : "W"}`;

const state = {
  grid: null, targets: [], target: null, dims: null, weights: [],
  overall: null, shown: null, fade: null, clicked: null, analogs: [], showAnalogs: true,
  iceSheet: null, hideIce: false, // iceSheet[i] = 1 where snow_ice >= ICE_SHEET_FROM
};

// Cells that are permanent ice sheet (Antarctica, inner Greenland, ice caps). Hidden from the
// colouring for rocky Mars targets: missing dimensions there are skipped, not penalised, so the
// flat ice would otherwise look like a fair match (see docs/messages.md, A's 2026-11-14 reply).
function findIceSheets(grid) {
  const j = grid.meta.features.findIndex((f) => f.id === "snow_ice");
  const mask = new Uint8Array(grid.n);
  if (j < 0) return mask; // feature dropped: nothing to hide
  for (let i = 0; i < grid.n; i++) {
    const v = grid.values[i * grid.nf + j]; // transform "none": the fraction itself
    if (v >= ICE_SHEET_FROM) mask[i] = 1;
  }
  return mask;
}

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
document.querySelector(".ramp").style.background =
  `linear-gradient(90deg, rgba(255,230,109,0) 0%, ${RAMP_STOPS.map((c, i) => `${c} ${20 + (i * 80) / (RAMP_STOPS.length - 1)}%`).join(", ")})`;

// ---------- canvases: score layer (grid size) composited over the photo (2x) ----------
const scoreCanvas = document.createElement("canvas");
const scoreCtx = scoreCanvas.getContext("2d");
const texCanvas = document.createElement("canvas");
const texCtx = texCanvas.getContext("2d");
let scoreImage = null, earthPhoto = null;

function loadImage(src) {
  return new Promise((ok, fail) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => fail(new Error(`${src} did not load`));
    im.src = src;
  });
}

// ---------- globe ----------
const globe = new Globe($("globe"))
  .backgroundColor("#05070d")
  .globeImageUrl(IMG.earth)          // the photo first; replaced by the composite once loaded
  .bumpImageUrl(IMG.bump)
  .showAtmosphere(true)
  .atmosphereColor("#7fb2ff")
  .atmosphereAltitude(0.16)
  .pointOfView({ lat: 22, lng: 40, altitude: 2.3 })
  .onGlobeClick(({ lat, lng }) => { showPlace(lat, lng); flyTo(lat, lng); })
  // known analog sites
  .pointLat((d) => d.lat).pointLng((d) => d.lng)
  .pointColor((d) => d.colour).pointAltitude(0.012).pointRadius(0.32).pointResolution(12)
  .pointsMerge(false).pointsTransitionDuration(400)
  .pointLabel((d) => `<div class="tip"><b>${d.name}</b><br>${d.country} · ${d.bodies} analog<br><span>${d.why}</span></div>`)
  .onPointClick((d) => { showAnalog(d); flyTo(d.lat, d.lng); })
  // pulse where the user clicked
  .ringLat((d) => d.lat).ringLng((d) => d.lng)
  .ringColor(() => (t) => `rgba(255,179,71,${1 - t})`)
  .ringMaxRadius(3).ringPropagationSpeed(2.2).ringRepeatPeriod(1100);

// Smooth camera: slow rotation that pauses only while the user holds the globe (or during a
// fly-to), then picks up again RESUME_ROTATE_MS after they let go.
const controls = globe.controls();
controls.autoRotate = true;
controls.autoRotateSpeed = 0.4;
controls.enableDamping = true;
controls.dampingFactor = 0.08;
let resumeTimer = 0;
function holdRotation() { clearTimeout(resumeTimer); controls.autoRotate = false; }
function resumeRotationSoon(extraMs = 0) {
  clearTimeout(resumeTimer);
  resumeTimer = setTimeout(() => { controls.autoRotate = true; }, RESUME_ROTATE_MS + extraMs);
}
controls.addEventListener("start", holdRotation);        // mouse/finger down on the globe
controls.addEventListener("end", () => resumeRotationSoon()); // released

function flyTo(lat, lng) {
  holdRotation();
  const alt = Math.min(globe.pointOfView().altitude, 1.8);
  globe.pointOfView({ lat, lng, altitude: alt }, 1000);
  resumeRotationSoon(1000); // after the 1 s flight, plus the usual pause
}

window.addEventListener("resize", () => globe.width(window.innerWidth).height(window.innerHeight));

// ---------- painting ----------
function paintScores(values) {
  const { grid } = state;
  const px = scoreImage.data;
  px.fill(0); // transparent: ocean and land without a score show the photo
  for (let i = 0; i < grid.n; i++) {
    const s = values[i];
    if (Number.isNaN(s)) continue;
    if (s <= SHOW_FROM) continue; // poor match: leave the real Earth visible
    if (state.hideIce && state.iceSheet[i]) continue; // permanent ice sheet hidden for this target
    const v = (Math.min(s, 1) - SHOW_FROM) / (1 - SHOW_FROM); // 0..1 within the visible range
    const p = grid.cells[i] * 4, k = Math.round(v * 255) * 3;
    px[p] = LUT[k]; px[p + 1] = LUT[k + 1]; px[p + 2] = LUT[k + 2];
    px[p + 3] = Math.round(MAX_ALPHA * Math.pow(v, 0.8)); // fades in smoothly from transparent
  }
  scoreCtx.putImageData(scoreImage, 0, 0);

  texCtx.drawImage(earthPhoto, 0, 0, texCanvas.width, texCanvas.height);
  texCtx.imageSmoothingEnabled = true;
  texCtx.imageSmoothingQuality = "high";
  texCtx.drawImage(scoreCanvas, 0, 0, texCanvas.width, texCanvas.height);

  const map = globe.globeMaterial().map;
  if (map) { map.image = texCanvas; map.needsUpdate = true; }
  else requestAnimationFrame(() => paintScores(values)); // photo texture not created yet: try next frame
}

// Blend old -> new overall scores over FADE_MS (NaN on either side shows the new value).
function startFade(from, to) {
  if (!from) { state.shown = to; paintScores(to); return; }
  const mix = new Float32Array(to.length), t0 = performance.now();
  state.fade = { from, to, mix, t0 };
  const step = (now) => {
    if (state.fade?.t0 !== t0) return; // superseded by a newer change
    const t = Math.min((now - t0) / FADE_MS, 1), e = t * t * (3 - 2 * t); // smoothstep
    for (let i = 0; i < to.length; i++) {
      const a = from[i], b = to[i];
      mix[i] = Number.isNaN(b) ? NaN : Number.isNaN(a) ? b : a + (b - a) * e;
    }
    paintScores(mix);
    if (t < 1) requestAnimationFrame(step);
    else { state.fade = null; state.shown = to; }
  };
  requestAnimationFrame(step);
}

let frame = 0;
function rescore({ fade = false } = {}) {
  if (frame && !fade) return; // sliders: at most one repaint per animation frame
  cancelAnimationFrame(frame);
  const previous = fade && state.shown ? Float32Array.from(state.shown) : null;
  frame = requestAnimationFrame(() => {
    frame = 0;
    state.overall = overallScores(state.dims.dimScores, state.dims.nd, state.weights);
    if (fade) startFade(previous, state.overall);
    else { state.fade = null; state.shown = state.overall; paintScores(state.overall); }
    if (state.clicked) showPlace(...state.clicked, { quiet: true });
  });
}

// ---------- controls ----------
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
  state.hideIce = t.body === "mars"; // default per body; the user can flip it
  $("hide-ice").checked = state.hideIce;
  const cov = targetCoverage(meta, t);
  const dirs = Object.keys(state.dims.directional);
  $("target-note").textContent =
    `${t.body === "moon" ? "Moon" : "Mars"} · ${fmtLatLon(t.lat, t.lon)} · values for ${cov.have} of ${cov.total} features` +
    (cov.have < MIN_DIMENSIONS ? " — not enough yet to score Earth" : "") +
    (dirs.length ? ` · beyond Earth's range: ${dirs.join(", ")}` : "");
  buildSliders();
  rescore({ fade: true });
}

$("reset").addEventListener("click", () => {
  state.weights = state.grid.meta.dimensions.map(() => 1);
  buildSliders();
  rescore({ fade: true });
});

$("hide-ice").addEventListener("change", (e) => {
  state.hideIce = e.target.checked;
  if (state.shown) paintScores(state.shown);
  if (state.clicked) showPlace(...state.clicked, { quiet: true });
});

$("show-analogs").addEventListener("change", (e) => {
  state.showAnalogs = e.target.checked;
  globe.pointsData(state.showAnalogs ? state.analogs : []);
});

// ---------- side panel: clicked place / analog site ----------
function markClick(lat, lng) {
  globe.ringsData([{ lat, lng }]);
}

function dimensionBars(i) {
  const { grid, dims } = state;
  const dirDims = new Set(grid.meta.features.filter((f) => dims.directional[f.id]).map((f) => f.dimension));
  return grid.meta.dimensions.map((d, k) => {
    const v = dims.dimScores[i * dims.nd + k];
    const badge = dirDims.has(d) ? `<span class="badge" title="The target lies beyond anything on Earth; Earth can only point in this direction">beyond Earth</span>` : "";
    if (Number.isNaN(v)) return `<div class="dim missing"><span>${label(d)}${badge}</span><div class="track"></div><span class="val">–</span></div>`;
    return `<div class="dim"><span>${label(d)}${badge}</span><div class="track"><div class="fill" style="width:${(v * 100).toFixed(0)}%"></div></div><span class="val">${v.toFixed(2)}</span></div>`;
  }).join("");
}

function showPlace(lat, lng, { quiet = false } = {}) {
  state.clicked = [lat, lng];
  if (!quiet) markClick(lat, lng);
  const i = cellIndex(state.grid, lat, lng);
  $("place").hidden = false;
  $("place-title").textContent = "Clicked place";
  $("place-extra").innerHTML = "";
  if (i < 0) { $("place-head").textContent = `${fmtLatLon(lat, lng)} · ocean or not on the land grid`; $("place-dims").innerHTML = ""; return; }
  const s = state.overall[i];
  $("place-head").innerHTML = Number.isNaN(s)
    ? `${fmtLatLon(lat, lng)} · not scored (fewer than ${MIN_DIMENSIONS} dimensions with data)`
    : `${fmtLatLon(lat, lng)} · match <strong>${s.toFixed(2)}</strong>`;
  $("place-dims").innerHTML = dimensionBars(i);
  if (state.hideIce && state.iceSheet[i]) {
    $("place-extra").innerHTML = `<p class="note">Permanent ice sheet: not coloured for this target. ` +
      `Vegetation and dust have no data on ice, so they are skipped rather than counted against it, ` +
      `which would make flat ice look like a rocky Mars plain. Untick "Hide permanent ice sheets" to see its score.</p>`;
  }
}

function showAnalog(a) {
  showPlace(a.lat, a.lng);
  $("place-title").textContent = "Known analog site";
  const i = cellIndex(state.grid, a.lat, a.lng);
  const s = i >= 0 ? state.overall[i] : NaN;
  $("place-head").innerHTML = `<b>${a.name}</b> · ${a.country}<br>${a.bodies} analog · ` +
    (Number.isNaN(s) ? "not scored here" : `match with ${state.target.name.split(" (")[0]} <strong>${s.toFixed(2)}</strong>`);
  const ref = a.url ? `<a href="${a.url}" target="_blank" rel="noopener">${a.reference}</a>` : a.reference;
  $("place-extra").innerHTML = `<p>${a.why}</p><p class="note">Known for: ${a.dimensions.join(", ")} · ${ref}</p>`;
}

// ---------- load ----------
async function fetchOk(path, kind) {
  const r = await fetch(`${DATA_DIR}/${path}`);
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return kind === "json" ? r.json() : r.arrayBuffer();
}

async function main() {
  const [meta, cellsBuf, featBuf, targets, analogs, photo] = await Promise.all([
    fetchOk("meta.json", "json"), fetchOk("cells.bin"), fetchOk("features.bin"), fetchOk("targets.json", "json"),
    fetchOk("known_analogs.geojson", "json").catch(() => ({ features: [] })), // optional layer
    loadImage(IMG.earth),
  ]);
  state.grid = decodeGrid(meta, cellsBuf, featBuf);
  state.iceSheet = findIceSheets(state.grid);
  state.targets = targets.targets;
  earthPhoto = photo;
  scoreCanvas.width = meta.grid.ncols; scoreCanvas.height = meta.grid.nrows;
  scoreImage = scoreCtx.createImageData(scoreCanvas.width, scoreCanvas.height);
  texCanvas.width = meta.grid.ncols * TEX_SCALE; texCanvas.height = meta.grid.nrows * TEX_SCALE;

  state.analogs = analogs.features.map((f) => {
    const p = f.properties, bodies = p.body.map((b) => (b === "moon" ? "Moon" : "Mars")).join(" & ");
    return {
      lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], name: p.name, country: p.country,
      bodies, why: p.why_analog, dimensions: p.dimensions, reference: p.reference, url: p.source_url,
      colour: BODY_COLOUR[p.body[0]] || "#ffffff",
    };
  });
  globe.pointsData(state.analogs);

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
  status(`${meta.n_cells.toLocaleString()} land cells · ${meta.features.length} features in ${meta.dimensions.length} dimensions · click the globe or a site`);
  $("loader").classList.add("done");
}

main().catch((e) => {
  console.error(e);
  status(`Could not load data: ${e.message}`);
  $("loader").querySelector("p").textContent = `Could not load data: ${e.message}`;
});
