// Analog Atlas: 3D globe showing where Earth is most like a chosen Mars or Moon site.
// Data formats: docs/contract.md. Scoring: score.js (mirrors pipeline/score.py).
import { decodeGrid, dimensionScores, overallScores, cellScores, cellIndex, targetCoverage, MIN_DIMENSIONS } from "./score.js";
import { regionOf, VERDICT_TEXT } from "./regions.js";
import { MISSIONS, USE } from "./missions.js";
import { initTour } from "./tour.js";

const DATA_DIR = "data"; // "mock" to test against web/mock/*
// Earth: NASA Blue Marble Next Generation (topography and bathymetry, December 2004), 8192 or 4096 px wide.
// Sky: ESO/S. Brunier Milky Way panorama (CC BY 4.0), wrapped around the scene as a real sky sphere.
const IMG = {
  earth8k: "img/earth-8k.jpg", earth4k: "img/earth-4k.jpg", bump: "img/earth-topology.png",
  night: "img/earth-night.jpg", night8k: "img/earth-night-8k.jpg", water: "img/earth-water.jpg",
  sky: "img/milky-way.jpg",
};

// Look: the Earth photo is dimmed and desaturated so sand does not compete with the glow; the
// best-matching land burns from ember red to white-hot, with thin contour lines at 50 / 60 / 70.
// The glow is scaled to each site: it starts at the site's top SHOW_TOP of Earth's land (by area)
// and is white-hot from its top FULL_TOP, so Moon sites light up too. Display only: scores and
// percentiles elsewhere are unchanged, and the map key states the scores behind the scale.
const RAMP_STOPS = ["#5c0710", "#a10f18", "#e0201f", "#ff5a3c", "#ffb29e", "#fff6f2"]; // low -> high match: red to white-hot
const SHOW_TOP = 0.20;          // glow starts at the top 20% of land for this site
const FULL_TOP = 0.01;          // ... and is white-hot from the top 1%
const SHOW_FLOOR = 0.2;         // never glow below this score, whatever the site
const MIN_ALPHA = 70, MAX_ALPHA = 240; // 0-255 opacity at the start and the top of the scale
const EARTH_DIM = { grey: 0.4, light: 0.85 }; // photo under the glow: share desaturated, brightness kept
const SKY_INTENSITY = 0.6;      // star sky brightness, so the Milky Way does not compete with Earth
const CONTOURS = [0.5, 0.6, 0.7];
// Sun direction in camera space: light from the upper left and slightly in front, so the side you
// look at is always lit and the night side (with city lights) shows on the right-hand limb.
const SUN_VIEW = (() => { const v = [-0.78, 0.32, 0.54], n = Math.hypot(...v); return { x: v[0] / n, y: v[1] / n, z: v[2] / n }; })();
const TEX_SCALE = 2;            // texture = 2x the score grid (2880 x 1440), smoothed
const FADE_MS = 550;            // cross-fade when the target changes
const RESUME_ROTATE_MS = 2500;  // auto-rotation resumes this long after the user lets go
const ICE_SHEET_FROM = 0.9;     // snow_ice fraction from which a cell counts as permanent ice sheet
const COLOURS = { click: "255,255,255" };
// Two kinds of dot, matching the story: our finds (the discoveries) are filled bright cyan dots that
// pulse; known sites (the test) are filled red dots with a dark outline (Yosif, 2026-11-15). The outline keeps
// them visible on the red glow. The finer literature verdict stays in the panel text (heading).
const FIND = { colour: "#2ee8ff", rgb: "46,232,255" };
const RING = { outline: "#0b0e14", ring: "#ff3b3b" };   // known sites: red dot, dark outline
const CAND_STYLE = {
  none:      { ...FIND, radius: 1.0, alt: 0.012, pulse: 0.75, heading: "New find", group: "finds" },
  under:     { ...FIND, radius: 1.0, alt: 0.012, pulse: 0.75, heading: "Little-studied find", group: "finds" },
  unchecked: { ...FIND, radius: 1.0, alt: 0.012, pulse: 0.75, heading: "Candidate (not checked yet)", group: "finds" },
  known:     { ...RING, heading: "Known area our search found too", group: "confirms" },
};
// A known site: a filled red dot on a slightly larger dark disc (globe.gl points have no outline).
function ringDiscs(d) {
  return [
    { ...d, colour: RING.outline, radius: 0.95, alt: 0.009 },
    { ...d, colour: RING.ring,    radius: 0.78, alt: 0.0105 },
  ];
}
// Short axis names for the fingerprint radar.
const DIM_SHORT = {
  terrain: "Terrain", temperature: "Temp", vegetation: "Plants", aridity: "Rain",
  albedo: "Bright", ice: "Ice", dust: "Dust", geology: "Rock",
};
const ICON = {
  good: `<svg viewBox="0 0 16 16" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3L13 4.5"/></svg>`,
  bad: `<svg viewBox="0 0 16 16" fill="none" stroke-width="2" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>`,
};

// Everyday words for visitors.
const DIM_NAME = {
  terrain: "Landscape shape", temperature: "Temperature", vegetation: "Plants", aridity: "Rainfall",
  albedo: "Ground brightness", ice: "Ice & snow", dust: "Dust in the air", geology: "Rock type",
};

const $ = (id) => document.getElementById(id);
const status = (msg) => { $("status").textContent = msg; };
const dimName = (d) => DIM_NAME[d] || d.charAt(0).toUpperCase() + d.slice(1);
const bodyName = (b) => (b === "moon" ? "the Moon" : "Mars");
const shortName = (t) => t.name.split(" (")[0];
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const fmtLatLon = (lat, lng) =>
  `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"}, ${Math.abs(lng).toFixed(2)}°${lng >= 0 ? "E" : "W"}`;

const state = {
  grid: null, targets: [], target: null, dims: null, weights: [],
  overall: null, shown: null, fade: null, clicked: null,
  analogs: [], candidates: [], showAnalogs: true, showCandidates: true, showConfirms: true,
  iceSheet: null, hideIce: false, cellWeight: null, arc: null,
  compare: new Set(),   // dimensions ticked in "Dimensional analysis" (empty = all, normal scoring)
  live: null,           // live top 5 shown as globe dots while "Dimensional analysis" is on
};

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
for (const el of document.querySelectorAll(".ramp")) el.style.background = `linear-gradient(90deg, ${RAMP_STOPS.join(", ")})`;

// ---------- canvases: score layer (grid size) composited over the photo (2x) ----------
const scoreCanvas = document.createElement("canvas");
const scoreCtx = scoreCanvas.getContext("2d");
const texCanvas = document.createElement("canvas");
const texCtx = texCanvas.getContext("2d");
const contourCanvas = document.createElement("canvas");
const contourCtx = contourCanvas.getContext("2d");
let scoreImage = null;

function loadImage(src) {
  return new Promise((ok, fail) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => fail(new Error(`${src} did not load`));
    im.src = src;
  });
}

// Cells that are permanent ice sheet. Hidden from the colouring for rocky Mars targets: missing
// dimensions there are skipped, not penalised, so flat ice would otherwise look like a fair match.
function findIceSheets(grid) {
  const j = grid.meta.features.findIndex((f) => f.id === "snow_ice");
  const mask = new Uint8Array(grid.n);
  if (j < 0) return mask;
  for (let i = 0; i < grid.n; i++) if (grid.values[i * grid.nf + j] >= ICE_SHEET_FROM) mask[i] = 1;
  return mask;
}

// ---------- globe ----------
const globe = new Globe($("globe"))
  .width($("globe").clientWidth).height($("globe").clientHeight)
  .backgroundColor("#03050a")
  .backgroundImageUrl(IMG.sky)       // star field (wrapped as a sky sphere below)
  .bumpImageUrl(IMG.bump)
  .showAtmosphere(true)
  .atmosphereColor("#7fb2ff")
  .atmosphereAltitude(0.16)
  .pointOfView({ lat: 22, lng: 40, altitude: 2.3 })
  .onGlobeClick(({ lat, lng }) => { showPlace(lat, lng); flyTo(lat, lng); })
  // points: known analogs (small, orange/white) and new candidates (bigger, cyan)
  .pointLat((d) => d.lat).pointLng((d) => d.lng)
  .pointColor((d) => d.colour).pointAltitude((d) => d.alt).pointRadius((d) => d.radius).pointResolution(12)
  .pointsMerge(false).pointsTransitionDuration(400)
  .pointLabel((d) => `<div class="tip"><b>${esc(d.title)}</b><br><span>${esc(d.subtitle)}</span></div>`)
  .onPointClick((d) => { showPlace(d.lat, d.lng, { point: d }); flyTo(d.lat, d.lng); })
  // rings: gentle pulse around candidates, orange pulse where the user clicked
  .ringLat((d) => d.lat).ringLng((d) => d.lng)
  .ringColor((d) => (t) => `rgba(${d.rgb},${(1 - t) * d.strength})`)
  .ringMaxRadius((d) => d.maxR).ringPropagationSpeed((d) => d.speed).ringRepeatPeriod((d) => d.period)
  // text labels (used by the guided tour, e.g. to mark Doha)
  .labelLat((d) => d.lat).labelLng((d) => d.lng).labelText((d) => d.text)
  .labelSize((d) => d.size || 1.1).labelDotRadius((d) => (d.dot === false ? 0 : 0.45))
  .labelColor((d) => d.colour || "#ffffff").labelResolution(2).labelAltitude(0.02)
  // arc from a selected find to the nearest place scientists already use
  .arcStartLat((d) => d.sLat).arcStartLng((d) => d.sLng).arcEndLat((d) => d.eLat).arcEndLng((d) => d.eLng)
  .arcColor(() => ["rgba(46,232,255,0.95)", "rgba(238,242,247,0.95)"])
  .arcStroke(0.45).arcAltitudeAutoScale(0.35)
  .arcDashLength(0.35).arcDashGap(0.12).arcDashInitialGap(1).arcDashAnimateTime(2200);

// Sharpest Earth the GPU and screen can use: 8K on desktop GPUs that allow it, 4K otherwise.
const renderer = globe.renderer();
const HI_RES = renderer.capabilities.maxTextureSize >= 8192 && Math.min(screen.width, screen.height) >= 700;
const EARTH_URL = HI_RES ? IMG.earth8k : IMG.earth4k;
const NIGHT_URL = HI_RES ? IMG.night8k : IMG.night;
const GLOW_SCALE = HI_RES ? 3 : TEX_SCALE;   // glow texture: 4320 x 2160 on desktop
globe.globeImageUrl(EARTH_URL);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

// Oceans reflect the sun: a water mask made from the same Blue Marble image drives the shine.
function setupOceanShine(mat) {
  loadImage(IMG.water).then((im) => {
    const t = mat.map.clone();
    t.source = new mat.map.source.constructor(im);
    t.colorSpace = "";                     // a mask, not a colour image
    t.needsUpdate = true;
    mat.specularMap = t;
    mat.specular.setRGB(0.32, 0.36, 0.42);
    mat.shininess = 22;
    mat.needsUpdate = true;
  }).catch(() => {});                      // optional effect
}

// A rounder Earth: the default sphere has 75 segments, which shows as corners on the outline
// when zoomed in. Swap in a finer sphere of the same radius.
function smoothSphere(mat) {
  let earth = null;
  globe.scene().traverse((o) => { if (!earth && o.material === mat) earth = o; });
  const g = earth?.geometry, p = g?.parameters;
  if (!p || !p.radius) return;
  earth.geometry = new g.constructor(p.radius, 240, 160, p.phiStart, p.phiLength, p.thetaStart, p.thetaLength);
  g.dispose();
}

// Once three.js has loaded the textures: crisp filtering at grazing angles, and the star panorama
// mapped onto a sphere around the scene (so the sky turns with the camera like real space).
let earthReady = false, skyReady = false;
function finishTextures() {
  const map = globe.globeMaterial().map, sky = globe.scene().background;
  if (!earthReady && map && map.image) {
    earthReady = true;
    map.anisotropy = renderer.capabilities.getMaxAnisotropy();
    map.needsUpdate = true;
    smoothSphere(globe.globeMaterial());
    setupGlobeShader(map);
    setupOceanShine(globe.globeMaterial());
    if (state.shown) paintScores(state.shown);   // overlay waits for the globe mesh
  }
  if (!skyReady && sky && sky.isTexture && sky.image) {
    skyReady = true;
    sky.mapping = 303;                 // THREE.EquirectangularReflectionMapping
    sky.needsUpdate = true;
    globe.scene().backgroundIntensity = SKY_INTENSITY;
  }
  if (!earthReady || !skyReady) requestAnimationFrame(finishTextures);
}
requestAnimationFrame(finishTextures); // after this module has finished evaluating

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
controls.addEventListener("start", holdRotation);
controls.addEventListener("end", () => resumeRotationSoon());

// Cinematic camera: for long jumps rise first (a "flight"), then descend onto the target.
let flightTimer = 0;
function flyTo(lat, lng, altitude = null, ms = 1100) {
  holdRotation();
  clearTimeout(flightTimer);
  const pov = globe.pointOfView();
  const end = { lat, lng, altitude: altitude ?? Math.min(pov.altitude, 1.8) };
  const far = distanceKm(pov.lat, pov.lng, lat, lng) > 3000;
  if (far) {
    const mid = { lat: (pov.lat + lat) / 2, lng: pov.lng + (((lng - pov.lng + 540) % 360) - 180) / 2, altitude: Math.max(pov.altitude, end.altitude) + 0.6 };
    globe.pointOfView(mid, ms * 0.55);
    flightTimer = setTimeout(() => globe.pointOfView(end, ms * 0.75), ms * 0.55);
  } else {
    globe.pointOfView(end, ms);
  }
  resumeRotationSoon(far ? ms * 1.3 : ms);
}

window.addEventListener("resize", () => globe.width($("globe").clientWidth).height($("globe").clientHeight));

// Labels shown on the globe: tour labels (e.g. Doha) plus the distance label of the selected find.
const labelSets = { tour: [], arc: [] };
function applyLabels() { globe.labelsData([...labelSets.tour, ...labelSets.arc]); }

// Points and rings shown for the current target and toggles.
function targetCandidates() {
  return state.candidates.filter((c) => c.target_id === state.target?.id);
}
function updateLayers() {
  const cands = targetCandidates().filter((c) =>
    (c.style.group === "finds" && state.showCandidates) || (c.style.group === "confirms" && state.showConfirms));
  // known sites of the current body only (Mars sites when a Mars site is picked): less clutter
  const analogs = state.showAnalogs ? state.analogs.filter((a) => a.bodyList.includes(state.target?.body)) : [];
  // Dimensional analysis: a known site is shown only if it scores as well as the glowing places on the
  // ticked properties (at or above where the glow starts); else e.g. Rio Tinto would show under
  // "Temperature", where it scores 0. Without ticked properties every known site of the body is shown.
  let known = [...analogs, ...cands.filter((c) => c.style.group === "confirms")];
  if (state.compare.size && state.overall) {
    const cut = displayRange(state.overall).lo;
    known = known.filter((d) => {
      const i = cellIndex(state.grid, d.lat, d.lng);
      return i >= 0 && !(state.hideIce && state.iceSheet[i]) && state.overall[i] >= cut;
    });
  }
  const knownDiscs = known.flatMap((d) => ringDiscs(d));
  // "Dimensional analysis": the cyan dots are the live top 5 on the ticked dimensions, not the precomputed
  // finds (those were chosen on all dimensions together).
  const finds = state.live ? (state.showCandidates ? state.live : []) : cands.filter((c) => c.style.group === "finds");
  globe.pointsData([...knownDiscs, ...finds]);
  const rings = finds.filter((c) => c.style.pulse > 0).map((c) => ({
    lat: c.lat, lng: c.lng, rgb: c.style.rgb, strength: c.style.pulse, maxR: 4, speed: 1.2, period: 2200,
  }));
  if (state.clicked) rings.push({ lat: state.clicked[0], lng: state.clicked[1], rgb: COLOURS.click, strength: 1, maxR: 3, speed: 2.2, period: 1100 });
  globe.ringsData(rings);
  // arc from a selected find to the nearest known site, with the distance at its middle
  const arc = state.arc;
  globe.arcsData(arc ? [arc] : []);
  labelSets.arc = arc ? [{
    lat: (arc.sLat + arc.eLat) / 2, lng: arc.sLng + (((arc.eLng - arc.sLng + 540) % 360) - 180) / 2,
    text: `${arc.km.toLocaleString("en-US")} km to nearest known site`, size: 0.7, dot: false, colour: "#f4e7dc",
  }] : [];
  applyLabels();
}

// ---------- painting ----------
// Where the glow starts and where it is white-hot for the scores on screen: area-weighted quantiles
// over the land being shown (one histogram pass, ~2 ms), never below SHOW_FLOOR.
function displayRange(values) {
  const BINS = 1000, hist = new Float64Array(BINS), w = state.cellWeight;
  let total = 0, best = 0;
  for (let i = 0; i < values.length; i++) {
    const s = values[i];
    if (Number.isNaN(s) || (state.hideIce && state.iceSheet[i])) continue;
    hist[Math.min(BINS - 1, Math.max(0, Math.floor(s * BINS)))] += w[i];
    total += w[i];
    if (s > best) best = s;
  }
  const quantile = (q) => {
    let acc = 0;
    for (let b = 0; b < BINS; b++) { acc += hist[b]; if (acc >= q * total) return (b + 0.5) / BINS; }
    return 1;
  };
  if (state.compare.size) {
    // Dimensional analysis: the best places glow even when their scores are low (no place on Earth reaches
    // Mars temperatures: the best is about 35). The glow starts at the top 20% of land or at half the best
    // score, whichever is higher, so only places close to the best light up; a small floor keeps
    // all-zero sites dark.
    const lo = Math.max(0.02, quantile(1 - SHOW_TOP), 0.5 * best);
    return { lo, hi: Math.max(lo + 0.02, quantile(1 - FULL_TOP), lo + 0.5 * (best - lo)) };
  }
  const lo = Math.max(SHOW_FLOOR, quantile(1 - SHOW_TOP));
  return { lo, hi: Math.max(lo + 0.02, quantile(1 - FULL_TOP)) };
}
function updateMapKey(lo, hi) {
  if (!state.target) return;
  $("map-key-lo").textContent = Math.round(lo * 100);
  $("map-key-hi").textContent = `${Math.round(hi * 100)}+`;
  // Plain-words explanation of the glow, with this site's own numbers (rebuilt only when they change).
  const t = state.target, tn = esc(shortName(t)), body = t.body === "moon" ? "the Moon" : "Mars";
  const L = Math.round(lo * 100), H = Math.round(hi * 100), key = `${t.id}|${L}|${H}`;
  const box = $("mk-help-body");
  if (box.dataset.key === key) return;
  box.dataset.key = key;
  box.innerHTML = `
    <p>We split Earth's land into <b>${state.grid.n.toLocaleString("en-US")} places</b>, each about 28 km across, and compared
      every one with ${tn} on ${body} using NASA satellite data: landscape shape, temperature, plants, rainfall, ground
      brightness, ice and snow, dust in the air and rock type.</p>
    <p>Each place gets a <b>similarity score from 0 to 100</b>. 100 would be a perfect twin on all of them.</p>
    <ul>
      <li><b>No glow:</b> not in the top 20% of land for ${tn}.</li>
      <li><b>Dark red:</b> among the 20% of land most like ${tn} (score ${L} or more).</li>
      <li><b>White-hot:</b> the top 1% (score ${H} or more): the best places on Earth to practise for ${tn}.</li>
    </ul>
    <p>The numbers at both ends of the bar are those two scores for ${tn}.</p>
    <p><b>Cyan dots</b> are our finds: places that match well and are far from any site scientists already use.
      <b>Red dots</b> are known analog sites, the test: if the method works, they should glow too.</p>
    <p>The scale is set for each site, so compare <b>scores</b>, not colours, between sites. No place on Earth can copy
      gravity, air or radiation: see “About ${tn}”. Click any land for its score, or use “Dimensional analysis” to see one property at a time.</p>`;
}

let raster = null;       // displayed score per grid pixel (NaN = not shown), for the contours
let contourImage = null; // contour lines at grid resolution, drawn 2x with smoothing
function paintScores(values) {
  const { grid } = state;
  const px = scoreImage.data;
  const ncols = grid.meta.grid.ncols, nrows = grid.meta.grid.nrows;
  px.fill(0);
  raster.fill(NaN);
  const { lo, hi } = displayRange(values);
  for (let i = 0; i < grid.n; i++) {
    const s = values[i];
    if (Number.isNaN(s)) continue;
    if (state.hideIce && state.iceSheet[i]) continue;         // ice sheet hidden for this target
    const cell = grid.cells[i];
    raster[cell] = s;
    if (s < lo) continue;                                     // weaker match: the (dimmed) Earth shows
    const v = Math.min(1, (s - lo) / (hi - lo));
    const p = cell * 4, k = Math.round(v * 255) * 3;
    px[p] = LUT[k]; px[p + 1] = LUT[k + 1]; px[p + 2] = LUT[k + 2];
    px[p + 3] = Math.round(MIN_ALPHA + (MAX_ALPHA - MIN_ALPHA) * Math.pow(v, 0.7));
  }
  updateMapKey(lo, hi);
  scoreCtx.putImageData(scoreImage, 0, 0);

  // Contours: a pixel is on a line where its band (below 50 / 50-60 / 60-70 / 70+) differs from
  // the pixel to its right or below. One pass over the grid, a few milliseconds.
  const band = (s) => (Number.isNaN(s) ? -1 : s >= CONTOURS[2] ? 3 : s >= CONTOURS[1] ? 2 : s >= CONTOURS[0] ? 1 : 0);
  const cp = contourImage.data;
  cp.fill(0);
  // No contour lines in the dimensional analysis: on one property they trace the data's own grid
  // (dust is 1° data, 4 x 4 cells), which shows as square lines.
  for (let r = 0; r < (state.compare.size ? 0 : nrows - 1); r++) {
    for (let c = 0; c < ncols; c++) {
      const k = r * ncols + c, b = band(raster[k]);
      const br = band(raster[r * ncols + ((c + 1) % ncols)]), bd = band(raster[k + ncols]);
      const top = Math.max(b, br, bd);
      if (top >= 1 && (b !== br || b !== bd)) {
        const o = k * 4;
        cp[o] = 255; cp[o + 1] = 244; cp[o + 2] = 228; cp[o + 3] = top === 3 ? 200 : top === 2 ? 140 : 90;
      }
    }
  }
  contourCtx.putImageData(contourImage, 0, 0);

  // The glow lives on its own transparent texture on a shell just above the Earth photo, so the
  // photo can be 8K while a repaint only uploads the small score layer.
  const W = texCanvas.width, H = texCanvas.height;
  texCtx.clearRect(0, 0, W, H);
  texCtx.imageSmoothingEnabled = true;
  texCtx.imageSmoothingQuality = "high";
  // Soften the 0.25° cell edges into a field (ignored where unsupported). The dimensional analysis smooths
  // more, and most for dust, whose data is 1° (4 x 4 cells), so every property reads as an even glow.
  const blurCells = state.compare.size ? (state.compare.has("dust") ? 4 : 2) : 1.1;
  texCtx.filter = `blur(${blurCells * GLOW_SCALE}px)`;
  texCtx.drawImage(scoreCanvas, 0, 0, W, H);
  texCtx.filter = "none";
  texCtx.drawImage(contourCanvas, 0, 0, W, H);
  const tex = ensureOverlay();
  if (tex) tex.needsUpdate = true;
}

// GPU code shared by the Earth and the glow shell. The sun is fixed relative to the camera, so the
// side you look at is always lit and the night side shows on the limb (no per-frame JavaScript).
const DAY_MIX_GLSL = `float sunDot = dot(normalize(vNormal), normalize(sunView));
        float dayMix = mix(1.0, smoothstep(-0.20, 0.25, sunDot), dayNight);`;
const shared = { sunView: { value: SUN_VIEW }, dayNight: { value: 1 } };

// Earth: the photo is dimmed and partly desaturated so tan deserts do not read as a weak glow, and
// the night side shows NASA's Black Marble city lights.
let nightPhoto = null, nightTex = null, globeShader = null;
function setupGlobeShader(map) {
  shared.dayNight.value = $("day-night").checked ? 1 : 0;
  nightTex = { value: map };                                   // city lights replace this once loaded
  const mat = globe.globeMaterial();
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, shared, { nightMap: nightTex,
      dimGrey: { value: EARTH_DIM.grey }, dimLight: { value: EARTH_DIM.light } });
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>
        uniform sampler2D nightMap; uniform vec3 sunView; uniform float dayNight, dimGrey, dimLight, nightPhotoOn;`)
      .replace("#include <dithering_fragment>", `#include <dithering_fragment>
        float lum = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
        vec3 photo = gl_FragColor.rgb;
        float ocean = clamp((photo.b - photo.r) * 5.0, 0.0, 1.0);   // blue-dominant pixels keep their colour
        gl_FragColor.rgb = mix(mix(photo, vec3(lum), dimGrey) * dimLight, photo, ocean);
        ${DAY_MIX_GLSL}
        vec3 lights = nightPhotoOn > 0.5 ? texture2D(nightMap, vMapUv).rgb : vec3(0.0);
        vec3 nightCol = gl_FragColor.rgb * 0.40 + lights * vec3(1.0, 0.82, 0.55) * 1.15;
        gl_FragColor.rgb = mix(nightCol, gl_FragColor.rgb, dayMix);`)
    shader.uniforms.nightPhotoOn = nightOn;
    globeShader = shader;
  };
  mat.needsUpdate = true;
  attachNight();
}
const nightOn = { value: 0 };
function attachNight() {
  const map = globe.globeMaterial().map;
  if (!nightPhoto || !map || !nightTex) return;
  const t = map.clone();                                    // same Texture class, no separate three.js needed
  t.source = new map.source.constructor(nightPhoto);        // its own image (a clone shares the source)
  t.needsUpdate = true;
  nightTex.value = t;
  nightOn.value = 1;
}

// The glow shell: a second sphere just above the Earth, built from the globe's own three.js classes.
// Black diffuse + emissive map = the glow shines by itself; alpha comes from the texture.
let overlay = null;
function ensureOverlay() {
  if (overlay) return overlay.material.map;
  if (!earthReady) return null;
  const mat = globe.globeMaterial();
  let earth = null;
  globe.scene().traverse((o) => { if (!earth && o.material === mat) earth = o; });
  if (!earth) return null;
  const tex = mat.map.clone();
  tex.source = new mat.map.source.constructor(texCanvas);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.needsUpdate = true;
  // polygonOffset pulls the shell towards the camera in depth, so phone GPUs (coarser depth buffer)
  // do not flicker between it and the Earth when zoomed out.
  const glowMat = new mat.constructor({ map: tex, emissiveMap: tex, transparent: true, depthWrite: false, shininess: 0,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  glowMat.color.setRGB(0, 0, 0);
  glowMat.emissive.setRGB(1, 1, 1);
  glowMat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, shared);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 sunView; uniform float dayNight;")
      .replace("#include <dithering_fragment>", `#include <dithering_fragment>
        ${DAY_MIX_GLSL}
        gl_FragColor.rgb *= mix(0.45, 1.0, dayMix);`);
  };
  overlay = new earth.constructor(earth.geometry, glowMat);
  overlay.scale.setScalar(1.002);
  overlay.renderOrder = 1;
  overlay.raycast = () => {};       // clicks go to the Earth underneath
  earth.add(overlay);
  return tex;
}
$("day-night").addEventListener("change", (e) => { shared.dayNight.value = e.target.checked ? 1 : 0; });

function startFade(from, to) {
  if (!from) { state.shown = to; paintScores(to); return; }
  const mix = new Float32Array(to.length), t0 = performance.now();
  state.fade = { t0 };
  const step = (now) => {
    if (state.fade?.t0 !== t0) return;
    const t = Math.min((now - t0) / FADE_MS, 1), e = t * t * (3 - 2 * t);
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
  if (frame && !fade) return;
  cancelAnimationFrame(frame);
  const previous = fade && state.shown ? Float32Array.from(state.shown) : null;
  frame = requestAnimationFrame(() => {
    frame = 0;
    state.overall = state.compare.size ? weakestScores() : overallScores(state.dims.dimScores, state.dims.nd, state.weights);
    if (fade) startFade(previous, state.overall);
    else { state.fade = null; state.shown = state.overall; paintScores(state.overall); }
    refreshPanel();
    renderTopFinds();
  });
}

// ---------- controls ----------
function buildSliders() {
  const box = $("sliders");
  box.innerHTML = "";
  state.grid.meta.dimensions.forEach((d, k) => {
    const row = document.createElement("div");
    row.className = "slider";
    row.innerHTML = `<label for="w-${d}">${dimName(d)}</label>
      <input id="w-${d}" type="range" min="0" max="2" step="0.1" value="${state.weights[k]}">
      <span>${state.weights[k].toFixed(1)}</span>`;
    const input = row.querySelector("input"), out = row.querySelector("span");
    input.addEventListener("input", () => {
      if (state.compare.size) clearCompare();   // a slider move leaves "compare only" (weights kept)
      state.weights[k] = Number(input.value);
      out.textContent = state.weights[k].toFixed(1);
      rescore();
    });
    box.appendChild(row);
  });
}

function selectTarget(id) {
  const t = state.targets.find((x) => x.id === id);
  state.target = t;
  for (const b of document.querySelectorAll(".site-card")) {
    const on = b.dataset.id === id;
    b.setAttribute("aria-checked", on ? "true" : "false");
    b.tabIndex = on ? 0 : -1;
  }
  state.dims = dimensionScores(state.grid, t);
  // a new site keeps the "compare only" choice, so one property can be compared across sites,
  // minus properties this site has no value for (e.g. dust on the Moon)
  for (const d of [...state.compare]) if (!targetHasDim(t, d)) state.compare.delete(d);
  state.weights = state.compare.size ? state.grid.meta.dimensions.map((d) => (state.compare.has(d) ? 1 : 0))
    : state.grid.meta.dimensions.map((d) => t.weights?.[d] ?? 1);
  syncCompareUI();
  state.hideIce = t.body === "mars";
  $("hide-ice").checked = state.hideIce;
  const count = (v) => targetCandidates().filter((c) => c.verdict === v).length;
  const parts = [[count("none"), "new find"], [count("under"), "little-studied find"], [count("known"), "known area found again"]]
    .filter(([n]) => n).map(([n, w]) => `${n} ${w}${n === 1 ? "" : "s"}`);
  $("site-more-title").textContent = `About ${shortName(t)} (${t.body === "moon" ? "Moon" : "Mars"})`;
  $("site-counts").textContent = parts.length ? `Our search on Earth: ${parts.join(", ")}.` : "";
  const m = MISSIONS[t.id];
  $("mission").hidden = !m;
  $("mission").innerHTML = m ? `<p><b>The mission:</b> ${esc(m.mission)}</p>
    <p class="mission-tests"><b>What teams must test on Earth first:</b></p>
    <ul>${m.tests.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
  renderLimits(t);
  renderTrust();
  buildSliders();
  updateLayers();
  rescore({ fade: true });
}

$("reset").addEventListener("click", () => {
  clearCompare();
  state.weights = state.grid.meta.dimensions.map(() => 1);
  buildSliders();
  rescore({ fade: true });
});
$("hide-ice").addEventListener("change", (e) => {
  state.hideIce = e.target.checked;
  if (state.shown) paintScores(state.shown);
  refreshPanel();
});
$("show-analogs").addEventListener("change", (e) => { state.showAnalogs = e.target.checked; updateLayers(); });
$("show-candidates").addEventListener("change", (e) => { state.showCandidates = e.target.checked; updateLayers(); });
$("show-confirms").addEventListener("change", (e) => { state.showConfirms = e.target.checked; updateLayers(); });

// ---------- "What Earth can never copy" card (targets.json limits) ----------
const EARTH = { gravity: 9.81, pressure: 101325, radiation: 2.4 / 365 }; // m/s², Pa, mSv/day (world average natural dose)

function renderLimits(t) {
  const L = t.limits || {}, box = $("limits");
  const tip = (x) => esc(x?.source || "");
  const rows = [];
  if (L.gravity_ms2) {
    const g = L.gravity_ms2.value;
    rows.push(`<div title="${tip(L.gravity_ms2)}"><b>Gravity</b><span>${Math.round((100 * g) / EARTH.gravity)}% of Earth's</span><small>${g} m/s²</small></div>`);
  }
  if (L.pressure_pa) {
    const p = L.pressure_pa.value, pct = (100 * p) / EARTH.pressure;
    const txt = pct < 0.001 ? "almost none (vacuum)" : `${pct < 1 ? pct.toFixed(1) : Math.round(pct)}% of Earth's`;
    rows.push(`<div title="${tip(L.pressure_pa)}"><b>Air pressure</b><span>${txt}</span><small>${p < 0.01 ? p.toExponential(0) : Math.round(p)} Pa</small></div>`);
  }
  if (L.radiation_msv_day) {
    const r = L.radiation_msv_day.value;
    rows.push(`<div title="${tip(L.radiation_msv_day)}"><b>Radiation</b><span>about ${Math.round(r / EARTH.radiation / 10) * 10}× Earth's</span><small>${r} mSv/day</small></div>`);
  }
  box.hidden = !rows.length;
  box.innerHTML = rows.length ? `<p class="limits-title">What Earth can never copy at ${esc(shortName(t))}</p><div class="limits-row">${rows.join("")}</div>` : "";
}

// ---------- "Does it work?" (validation.json, optional) ----------
function trustBars(rows) {
  return rows.map(([name, v, cls]) =>
    `<div class="tbar ${cls}"><span>${name}</span><div class="track"><div class="fill" style="width:${Math.round(v * 100)}%"></div></div><b>${Math.round(v * 100)}</b></div>`).join("");
}

function renderTrust() {
  const v = state.validation;
  if (!v?.bodies?.mars) { $("trust").hidden = true; return; }
  const m = v.bodies.mars, moon = v.bodies.moon, t = v.targets?.[state.target?.id];
  // "about 1 in 210": rounded to 10s above 50 so it does not look more precise than it is
  const oneIn = (p) => { const x = 1 / p; return x > 50 ? Math.round(x / 10) * 10 : Math.max(1, Math.round(x)); };
  const pc = (x) => ordinal(Math.round(x * 100));
  // Mars sites that do not pass on their own (p > 0.05), read from the data
  const weak = (m.targets || []).filter((id) => v.targets?.[id]?.p_vs_barren > 0.05)
    .map((id) => `${esc(shortName(state.targets.find((x) => x.id === id) || { name: id }))} (p ≈ ${fmtP(v.targets[id].p_vs_barren)})`);
  let html = `<p>To test the method, we scored the places scientists <b>already use</b> to prepare for Mars and the Moon,
    and compared them with random <b>plain desert</b> (bare land without plants). If the method works, the known places should rank higher.</p>
    <h4>Mars (${m.n_sites} known places)</h4>
    ${trustBars([["Known Mars places", m.known_percentile_median, "known"], ["Plain desert", m.random_barren_median, "barren"], ["Any land", m.random_land_median, "land"]])}
    <p class="note">Numbers are percentiles of Earth's land (higher = more Mars-like).</p>
    <p><b>Result:</b> known Mars places rank above plain desert (${pc(m.known_percentile_median)} vs
      ${pc(m.random_barren_median)} percentile). Only about <b>1 in ${oneIn(m.p_vs_barren)}</b> random sets of plain desert do this well
      (p ≈ ${fmtP(m.p_vs_barren)}), so for Mars as a whole the method works.</p>
    <p class="note">Limits: the result depends on how "plain desert" is defined, it is not corrected for testing several sites${
      weak.length ? `, and ${andList(weak)} ${weak.length === 1 ? "does" : "do"} not pass on ${weak.length === 1 ? "its" : "their"} own` : ""}.</p>`;
  if (moon) {
    html += `<h4>Moon (${moon.n_sites} known places)</h4>
      ${trustBars([["Known Moon places", moon.known_percentile_median, "known"], ["Plain desert", moon.random_barren_median, "barren"]])}
      <p>Known Moon places rank higher too (${pc(moon.known_percentile_median)} vs ${pc(moon.random_barren_median)}, p ≈ ${fmtP(moon.p_vs_barren)}),
        but the test has <b>too few independent places</b> to conclude (half are in the USA), so we make no claim for the Moon.</p>`;
  }
  if (t) {
    const below = t.known_percentile_median < t.random_barren_median;
    html += `<p class="note">For ${esc(shortName(state.target))} alone: known places ${pc(t.known_percentile_median)} vs plain desert
      ${pc(t.random_barren_median)} percentile (p ≈ ${fmtP(t.p_vs_barren)}).${below
        ? ` Here the known places rank <b>below</b> plain desert: the score does not pick them out for this site.` : ""}</p>`;
  }
  html += `<h4>What the score cannot see</h4>
    <p class="note">Life and biosignatures, caves and lava tubes, ice under the ground, and practical things like access and safety.
    Places chosen by scientists for those reasons (for example Rio Tinto for its microbes) can score low here, and that is expected.</p>
    <p class="note"><a href="../docs/figures/validation.png" target="_blank" rel="noopener">See the validation chart</a> ·
    method and full numbers in the project write-up.</p>`;
  $("trust-body").innerHTML = html;
  $("trust").hidden = false;
}

// ---------- side panel ----------
function cellValue(i, id) {
  const j = state.grid.meta.features.findIndex((f) => f.id === id);
  if (j < 0) return NaN;
  const f = state.grid.meta.features[j], v = state.grid.values[i * state.grid.nf + j];
  return f.transform === "log1p" ? Math.expm1(v) : v;
}

function fmtValue(id, unit, v) {
  if (v === null || v === undefined || Number.isNaN(v)) return "–";
  if (unit === "K" && id === "lst_range") return `${v.toFixed(0)} K`; // a difference: no °C
  if (unit === "K") return `${(v - 273.15).toFixed(0)} °C`;
  if (id === "snow_ice") return `${(v * 100).toFixed(0)}%`;
  if (unit === "mm/yr") return `${v < 10 ? v.toFixed(1) : v.toFixed(0)} mm/yr`;
  if (unit === "m") return `${v.toFixed(0)} m`;
  if (unit === "degrees" || unit === "deg") return `${v.toFixed(1)}°`;
  return v.toFixed(v < 1 ? 2 : 1);
}

// One plain sentence per dimension: what it is here, and on the target.
function describe(dim, i) {
  const t = state.target, there = (id) => t.features[id], body = bodyName(t.body);
  const val = (id) => cellValue(i, id);
  switch (dim) {
    case "terrain": {
      const r = val("relief"), tr = there("relief")?.value;
      return `height differences of ${fmtValue("relief", "m", r)} here${tr !== undefined ? `, ${fmtValue("relief", "m", tr)} at ${esc(shortName(t))}` : ""}`;
    }
    case "temperature": {
      const n = val("lst_night_cold"), tn = there("lst_night_cold")?.value;
      return `coldest nights about ${fmtValue("x", "K", n)} here${tn !== undefined ? `, ${fmtValue("x", "K", tn)} on ${body}` : ""}`;
    }
    case "vegetation": {
      const v = val("ndvi_max");
      return Number.isNaN(v) ? "no plant data here" : v < 0.15 ? "almost no plants, like " + body : "plants grow here, none on " + body;
    }
    case "aridity": {
      // IMERG overestimates desert rain (e.g. ~45 mm/yr at Atacama Yungay, really a few mm), so
      // say "satellite estimate" and explain why even very dry deserts rarely match (A, 2026-11-14).
      const p = val("precip");
      return `the rain satellite estimates ${fmtValue("precip", "mm/yr", p).replace(" mm/yr", " mm")} a year here, none on ${body}. ` +
        `<span class="sub">Satellites tend to overestimate rain in deserts, so even very dry places rarely match on rainfall.</span>`;
    }
    case "albedo": {
      const a = val("albedo"), ta = there("albedo")?.value;
      return `ground reflects ${Number.isNaN(a) ? "–" : Math.round(a * 100) + "%"} of sunlight here${ta !== undefined ? `, about ${Math.round(ta * 100)}% at ${esc(shortName(t))}` : ""}`;
    }
    case "ice": {
      const s = val("snow_ice");
      return Number.isNaN(s) ? "no snow data here" : s < 0.05 ? "no snow or ice on the ground, like the site" : `snow or ice ${Math.round(s * 100)}% of the year here`;
    }
    case "dust": {
      const d = val("aod"), td = there("aod")?.value;
      return Number.isNaN(d) ? "no dust data here" : `${d > 0.3 ? "dusty" : "fairly clear"} air here${td !== undefined ? `; ${body} is ${td > 0.3 ? "dusty" : "clear"}` : ""}`;
    }
    case "geology": {
      const e = val("emis_b29");
      if (Number.isNaN(e)) return "no rock data here";
      return e < 0.9 ? "quartz-rich sand and rock here; the site is darker, basalt-like rock" : "dark, basalt-like rock or soil, like the site";
    }
    default: return "";
  }
}

// "a", "a and b", "a, b and c"
const andList = (xs) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
// 1st, 2nd, 3rd, 11th, 72nd
const ordinal = (n) => { const k = n % 100; return `${n}${k >= 11 && k <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th"}`; };
// p-values: 0.0004 -> "< 0.001", 0.0047 -> "0.005", 0.24 -> "0.24"
const fmtP = (p) => (p < 0.001 ? "< 0.001" : p < 0.01 ? p.toFixed(3) : p.toFixed(2));

const verdictWord = (s) => (s >= 0.8 ? "very similar" : s >= 0.6 ? "similar" : s >= 0.4 ? "partly similar" : "different");

function areaPercentile(s, overall = state.overall) {
  const w = state.cellWeight;
  let below = 0, total = 0;
  for (let i = 0; i < overall.length; i++) {
    const v = overall[i];
    if (Number.isNaN(v)) continue;
    total += w[i];
    if (v < s) below += w[i];
  }
  return total ? below / total : NaN;
}

function distanceKm(lat1, lng1, lat2, lng2) {
  const r = Math.PI / 180, a = Math.sin(((lat2 - lat1) * r) / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lng2 - lng1) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

function bar(name, v) {
  if (Number.isNaN(v)) return `<div class="dim missing"><span>${name}</span><div class="track"></div><span class="val">–</span></div>`;
  return `<div class="dim"><span>${name}</span><div class="track"><div class="fill" style="width:${(v * 100).toFixed(0)}%"></div></div><span class="val">${Math.round(v * 100)}</span></div>`;
}

// Everything in "See all the numbers": bars, measured values side by side, every target.
function detailsBlock(i) {
  const { grid, target, dims } = state;
  const bars = grid.meta.dimensions.map((d, k) => bar(dimName(d), dims.dimScores[i * dims.nd + k])).join("");
  const rows = grid.meta.features.map((f) => {
    const entry = target.features[f.id];
    const there = !entry ? "–" : entry.na ? "does not apply" : fmtValue(f.id, f.unit, entry.value);
    const beyond = dims.directional[f.id] ? ` <span class="badge" title="No place on Earth reaches this value">beyond Earth</span>` : "";
    const note = f.id === "precip" ? ` <span class="sub" title="Satellite rain estimates are too high in deserts">(estimate)</span>` : "";
    return `<tr><td>${esc(f.label || f.id)}${note}</td><td>${fmtValue(f.id, f.unit, cellValue(i, f.id))}</td><td>${there}${beyond}</td></tr>`;
  }).join("");
  // every site on its full score ("compare only" weights would make most of them 100)
  const all = state.targets.map((t) => ({ t, s: cellScores(grid, t, i, state.compare.size ? undefined : state.weights).overall }))
    .sort((a, b) => (Number.isNaN(b.s) ? -1 : b.s) - (Number.isNaN(a.s) ? -1 : a.s))
    .map(({ t, s }) => bar(`${esc(shortName(t))} <span class="sub">${t.body === "moon" ? "Moon" : "Mars"}</span>`, s)).join("");
  return `<details class="more"><summary>See all the numbers</summary>
    <h4>Similarity by property (out of 100)</h4>${bars}
    <h4>Measured here vs ${esc(shortName(target))}</h4>
    <table class="cmp"><thead><tr><th></th><th>Here</th><th>${esc(shortName(target))}</th></tr></thead><tbody>${rows}</tbody></table>
    <h4>Similarity to every Mars and Moon site</h4>${all}</details>`;
}

// Fingerprint radar: one axis per dimension, the target is the dashed outer ring (a perfect match),
// the place is the filled shape. Rain is greyed (satellite estimate); missing data is a dashed axis.
function fingerprintSVG(i) {
  const dims = state.grid.meta.dimensions, n = dims.length, cx = 56, cy = 56, R = 38;
  const pt = (k, r) => {
    const a = -Math.PI / 2 + (2 * Math.PI * k) / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const val = (k) => state.dims.dimScores[i * state.dims.nd + k];
  let svg = `<svg class="fp" viewBox="0 0 112 112" role="img" aria-label="Fingerprint: similarity per property">`;
  for (const f of [0.5, 1]) svg += `<polygon class="ring${f === 1 ? " outer" : ""}" points="${dims.map((_, k) => pt(k, R * f).join(",")).join(" ")}"/>`;
  dims.forEach((d, k) => {
    const off = d === "aridity" || Number.isNaN(val(k));
    const [x, y] = pt(k, R), [lx, ly] = pt(k, R + 11);
    svg += `<line class="axis${off ? " off" : ""}" x1="${cx}" y1="${cy}" x2="${x}" y2="${y}"/>`;
    svg += `<text class="${off ? "off" : ""}" x="${lx}" y="${ly}">${DIM_SHORT[d] || d}</text>`;
  });
  const shape = dims.map((_, k) => pt(k, R * Math.max(0.04, Number.isNaN(val(k)) ? 0 : val(k))).join(",")).join(" ");
  svg += `<polygon class="shape" points="${shape}"/></svg>`;
  return svg;
}

// The nearest place scientists already use, for the arc drawn from a selected find.
function nearestAnalog(lat, lng) {
  let best = null;
  for (const a of state.analogs) {
    const d = distanceKm(lat, lng, a.lat, a.lng);
    if (!best || d < best.d) best = { a, d };
  }
  return best;
}

// Fill the panel for a clicked place, known analog, candidate or "your place" search (`point`).
// Simple view first (name, badge, score + fingerprint, good for, different in); the rest under "More details".
function showPlace(lat, lng, { quiet = false, point = null } = {}) {
  state.clicked = [lat, lng, point];
  // arc + distance label from a selected find to the nearest known site
  state.arc = null;
  if (point?.kind === "candidate") {
    const near = nearestAnalog(lat, lng);
    if (near) state.arc = { sLat: lat, sLng: lng, eLat: near.a.lat, eLng: near.a.lng, km: Math.round(near.d), name: near.a.name };
  }
  if (!quiet) updateLayers(); // moves the click pulse, draws the arc
  const t = state.target, i = cellIndex(state.grid, lat, lng), tn = esc(shortName(t));
  const reg = regionOf(lat, lng);
  let simple = "", more = "";
  $("place-label").textContent = "Result";
  // where it is, up front: country (de facto borders) and coordinates
  const country = point?.kind === "analog" ? point.country : countryAt(lat, lng);
  const locLine = `<p class="loc"${country ? ` title="Present-day country; borders are de facto and approximate (Natural Earth)"` : ""}>${
    country ? `<b>${esc(country)}</b> · ` : ""}${fmtLatLon(lat, lng)}</p>`;

  // --- name, where, one badge ---
  if (point?.kind === "analog") {
    simple += `<h3>${esc(point.name)}</h3>${locLine}<p class="badge-line"><span class="tag known">Already used for ${point.bodies}</span></p>`;
    const ref = point.url ? `<a href="${esc(point.url)}" target="_blank" rel="noopener">${esc(point.reference)}</a>` : esc(point.reference);
    more += `<p>${esc(point.why)}</p><p class="note">Source: ${ref}</p>`;
  } else if (point?.kind === "candidate") {
    const v = VERDICT_TEXT[reg.verdict], st = point.style;
    simple += `<h3>${esc(reg.name || "Candidate place")}</h3>${locLine}
      <p class="badge-line"><span class="tag ${st.group === "finds" ? "find" : "known"}">${st.heading}</span></p>`;
    if (state.arc) simple += `<p class="note">${state.arc.km.toLocaleString("en-US")} km from the nearest place scientists already use (${esc(state.arc.name)}).</p>`;
    more += `<div class="newness ${v.tone}"><b>Is it new? ${v.label}.</b> ${esc(reg.note || v.text)}</div>
      <p class="note">#${point.rank} for ${tn} · area about ${Math.round(point.area_km2).toLocaleString("en-US")} km² ·
        ${Math.round(point.nearest_known_km)} km from the nearest place scientists already use ·
        stays in the top list in ${Math.round(point.robustness * 100)}% of tests with changed weights.</p>`;
  } else {
    simple += `<h3>${esc(reg.name || country || "Selected place")}</h3>${locLine}`;
  }

  // --- score, good for, different in ---
  if (i < 0) {
    simple += `<p class="note">Sea, or outside our land map: no score.</p>`;
  } else if (Number.isNaN(state.overall[i])) {
    simple += `<p class="note">Not enough satellite data here to compare with ${tn}.</p>`;
  } else {
    // One score: in the dimensional analysis it is the score on the ticked properties only.
    const s = state.overall[i], pct = areaPercentile(s, state.overall);
    const onWhat = state.compare.size ? ` on ${esc(andList([...state.compare].map((d) => dimName(d).toLowerCase())))}` : "";
    // Rainfall (aridity) is kept out of the lists: the satellite estimate cannot tell dry from extremely
    // dry deserts, so it would be "different" almost everywhere (decision in CLAUDE.md, 2026-11-14).
    const scored = state.grid.meta.dimensions.map((d, k) => ({ d, s: state.dims.dimScores[i * state.dims.nd + k] }))
      .filter((x) => !Number.isNaN(x.s) && x.d !== "aridity").sort((a, b) => b.s - a.s);
    const good = scored.filter((x) => x.s >= 0.6);
    let bad = scored.filter((x) => x.s < 0.4).reverse();
    if (!bad.length && scored.length) bad = [scored[scored.length - 1]]; // always name the weakest one

    const topShare = Math.max(1, Math.round((1 - pct) * 100));
    simple += `<div class="place-top"><div class="score-big"><strong>${Math.round(s * 100)}<small>/100</small></strong>
      <span>similar to ${tn}${onWhat}</span>
      <em class="pct">${pct >= 0.5 ? `Top ${topShare}% of Earth's land` : `More similar than ${Math.round(pct * 100)}% of land`}</em></div><div>${fingerprintSVG(i)}<p class="fp-note">dashed ring = ${tn}</p></div></div>`;
    const uses = good.filter((x) => USE[x.d]).slice(0, 2).map((x) => USE[x.d]);
    if (s >= 0.5 && uses.length) simple += `<p class="line good">${ICON.good}<span><b>Good for practising</b> ${andList(uses)}</span></p>`;
    else if (s < 0.5) simple += `<p class="line muted">Too different from ${tn} to be a useful practice site.</p>`;
    if (bad.length) simple += `<p class="line bad">${ICON.bad}<span><b>Different in</b> ${andList(bad.slice(0, 2).map((x) => dimName(x.d).toLowerCase()))}</span></p>`;
    if (state.hideIce && state.iceSheet[i]) simple += `<p class="note">Ice sheet: not coloured for a Mars site.</p>`;

    more += `<p class="note">More similar to ${tn} than ${Math.min(99, Math.round(pct * 100))}% of Earth's land.</p>`;
    if (good.length) more += `<h4>What is similar</h4><ul class="why good">${good.map((x) =>
      `<li><b>${dimName(x.d)}</b> (${verdictWord(x.s)}): ${describe(x.d, i)}</li>`).join("")}</ul>`;
    if (bad.length) more += `<h4>Where it breaks down</h4><ul class="why bad">${bad.map((x) =>
      `<li><b>${dimName(x.d)}</b> (${verdictWord(x.s)}): ${describe(x.d, i)}</li>`).join("")}</ul>`;
    if (!Number.isNaN(state.dims.dimScores[i * state.dims.nd + state.grid.meta.dimensions.indexOf("aridity")])) {
      more += `<p class="note"><b>Rainfall:</b> the rain satellite estimates ${fmtValue("precip", "mm/yr", cellValue(i, "precip"))} here.
        It is too coarse to tell dry from extremely dry deserts, so it is not listed above (it still counts in the score).</p>`;
    }
    more += `<p class="note">Earth can never copy gravity, the thin or missing air and space radiation: see "About ${tn}".</p>`;
    more += detailsBlock(i);
  }

  if (point?.kind !== "candidate") {
    let best = null;
    for (const c of targetCandidates().filter((x) => x.style.group === "finds")) {
      const d = distanceKm(lat, lng, c.lat, c.lng);
      if (!best || d < best.d) best = { c, d };
    }
    if (best) more += `<p class="note">Nearest new or little-studied find for ${tn}: ${Math.round(best.d)} km away.</p>`;
  }

  // keep "More details" open if the visitor had opened it
  const wasOpen = document.querySelector("#place-body details.more-top")?.open;
  $("place-body").innerHTML = simple +
    `<details class="more-top"${wasOpen ? " open" : ""}><summary>More details</summary>${more}</details>`;
  const wasHidden = $("place").hidden;
  $("place").hidden = false;
  $("hint").hidden = true;
  if (!quiet || wasHidden) $("place").scrollIntoView({ behavior: "smooth", block: "start" });
}

function refreshPanel() {
  if (!state.clicked) return;
  const [lat, lng, point] = state.clicked;
  if (point?.kind === "candidate" && point.target_id !== state.target.id) { // candidate of another target
    showPlace(lat, lng, { quiet: true });
    return;
  }
  showPlace(lat, lng, { quiet: true, point });
}

// ---------- HUD: coordinates and score under the cursor ----------
function setupHud() {
  const el = $("globe"), hud = $("hud");
  let pending = null, frame = 0;
  el.addEventListener("mousemove", (e) => {
    const r = el.getBoundingClientRect();
    pending = [e.clientX - r.left, e.clientY - r.top];
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const c = globe.toGlobeCoords(...pending);
      if (!c) { hud.classList.remove("on"); return; }
      const i = cellIndex(state.grid, c.lat, c.lng);
      const s = i >= 0 ? state.overall[i] : NaN;
      const what = state.compare.size ? ` on ${[...state.compare].map((d) => dimName(d).toLowerCase()).join(" + ")}` : "";
      hud.innerHTML = `${fmtLatLon(c.lat, c.lng)} · ${esc(shortName(state.target))}${esc(what)} <b>${Number.isNaN(s) ? "—" : Math.round(s * 100)}</b>`;
      hud.classList.add("on");
    });
  });
  el.addEventListener("mouseleave", () => hud.classList.remove("on"));
}

const cellLatLng = (i) => {
  const c = state.grid.cells[i], nc = state.grid.meta.grid.ncols, res = state.grid.meta.grid.res_deg;
  return [90 - (Math.floor(c / nc) + 0.5) * res, -180 + ((c % nc) + 0.5) * res];
};

// ---------- present-day country of any clicked point ----------
// Natural Earth 1:110m country outlines (public domain, ~100 KB), checked in the browser: no
// geocoding service. Borders are de facto and approximate; the ocean gets no country.
const COUNTRY_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json";
const COUNTRY_FIX = { "W. Sahara": "Western Sahara", "Dem. Rep. Congo": "DR Congo", "Central African Rep.": "Central African Republic",
  "Bosnia and Herz.": "Bosnia and Herzegovina", "Dominican Rep.": "Dominican Republic", "Eq. Guinea": "Equatorial Guinea",
  "S. Sudan": "South Sudan", "Solomon Is.": "Solomon Islands", "Falkland Is.": "Falkland Islands",
  "Fr. S. Antarctic Lands": "French Southern Lands", "N. Cyprus": "Northern Cyprus", "eSwatini": "Eswatini",
  "United States of America": "United States" };
let countries = null; // [{ name, bbox: [w, s, e, n], rings: [[[lng, lat], ...], ...] }]
function loadCountries() {
  if (!window.topojson) return;
  fetch(COUNTRY_URL).then((r) => r.json()).then((topo) => {
    const fc = window.topojson.feature(topo, topo.objects.countries);
    countries = fc.features.filter((f) => f.geometry).map((f) => {
      const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
      const rings = polys.flat();
      let w = 180, s = 90, e = -180, n = -90;
      for (const r of rings) for (const [x, y] of r) { w = Math.min(w, x); e = Math.max(e, x); s = Math.min(s, y); n = Math.max(n, y); }
      const name = f.properties.name;
      return { name: COUNTRY_FIX[name] || name, bbox: [w, s, e, n], rings };
    });
    refreshPanel();
  }).catch(() => {});                       // optional: the panel then shows coordinates only
}
function inRing(r, x, y) {
  let inside = false;
  for (let a = 0, b = r.length - 1; a < r.length; b = a++) {
    const [xa, ya] = r[a], [xb, yb] = r[b];
    if ((ya > y) !== (yb > y) && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) inside = !inside;
  }
  return inside;
}
function countryExact(lat, lng) {
  for (const c of countries) {
    const [w, s, e, n] = c.bbox;
    if (lng < w || lng > e || lat < s || lat > n) continue;
    let inside = false;                     // even-odd over all rings handles holes (e.g. Lesotho in South Africa)
    for (const r of c.rings) if (inRing(r, lng, lat)) inside = !inside;
    if (inside) return c.name;
  }
  return null;
}
function countryAt(lat, lng) {
  if (!countries) return null;
  // the 1:110m coast is coarse: a coastal land cell can fall just outside, so look up to ~0.5° around
  for (const d of [0, 0.25, 0.5]) {
    const offsets = d ? [[d, 0], [-d, 0], [0, d], [0, -d], [d, d], [d, -d], [-d, d], [-d, -d]] : [[0, 0]];
    for (const [dy, dx] of offsets) {
      const name = countryExact(lat + dy, lng + dx);
      if (name) return name;
    }
  }
  return null;
}

// ---------- "Dimensional analysis": score on chosen dimensions ----------
// Ticked = weight 1, unticked = weight 0: just another setting of the existing sliders (score.js
// drops weight-0 dimensions from the weighted mean). The glow and a live top 5 then show which
// places match the site on those dimensions alone.
const COMPARE_SPACING_KM = 200;           // same minimum spacing as the precomputed candidates
function buildCompare() {
  const box = $("compare-chips");
  box.innerHTML = state.grid.meta.dimensions.map((d) =>
    `<button type="button" class="chip-btn" data-dim="${d}" aria-pressed="false">${esc(dimName(d))}</button>`).join("");
  // (chips the current site has no value for are disabled in syncCompareUI)
  box.querySelectorAll("[data-dim]").forEach((b) => b.addEventListener("click", () => {
    const d = b.dataset.dim;
    if (state.compare.has(d)) state.compare.delete(d); else state.compare.add(d);
    applyCompare();
  }));
}
function applyCompare() {
  const dims = state.grid.meta.dimensions, on = state.compare.size > 0;
  state.weights = on ? dims.map((d) => (state.compare.has(d) ? 1 : 0))
    : dims.map((d) => state.target.weights?.[d] ?? 1);
  syncCompareUI();
  buildSliders();
  rescore({ fade: true });
}
// Does the site have a value for any feature of this dimension? (The Moon has no dust value, Shackleton no rock value.)
function targetHasDim(t, d) {
  return state.grid.meta.features.some((f) => f.dimension === d && t.features[f.id] && !t.features[f.id].na);
}
function syncCompareUI() {
  const on = state.compare.size > 0;
  for (const b of $("compare-chips").querySelectorAll("[data-dim]")) {
    const has = targetHasDim(state.target, b.dataset.dim);
    b.disabled = !has;
    b.title = has ? "" : `No ${dimName(b.dataset.dim).toLowerCase()} value for ${shortName(state.target)}`;
    b.setAttribute("aria-pressed", state.compare.has(b.dataset.dim) ? "true" : "false");
  }
  $("compare").classList.toggle("on", on);
  $("compare-title").textContent = "Dimensional analysis";
  // notes: values beyond anything on Earth (every place scores low on them) and the rainfall caveat
  const notes = [], t = state.target, tn = esc(shortName(t)), feats = state.grid.meta.features;
  for (const d of state.compare) {
    const dir = feats.filter((f) => f.dimension === d && state.dims.directional[f.id]);
    if (!dir.length) continue;
    const what = dir.map((f) => (f.label || f.id).toLowerCase());
    notes.push(`No place on Earth reaches ${tn}'s ${esc(andList(what))}, so every place scores low on ${esc(dimName(d).toLowerCase())}.`);
  }
  if (state.compare.has("aridity")) {
    notes.push("Rainfall: the satellite estimate is too high in deserts and close to 0 over ice sheets, so this ranking is rough.");
  }
  if (state.compare.size > 1) {
    notes.push("With several properties ticked, a place scores its weakest one: it has to match on all of them.");
  }
  $("compare-note").innerHTML = notes.join("<br>");
  $("compare-note").hidden = !notes.length;
}
function clearCompare() { state.compare.clear(); if (state.grid) syncCompareUI(); }

// Dimensional analysis score: the weakest of the ticked dimensions, so a place must match on all of them
// (an average let a good landscape hide a temperature of 0). NaN where a ticked dimension has no data.
function weakestScores() {
  const { dimScores, nd } = state.dims, ks = state.grid.meta.dimensions.map((d, k) => (state.compare.has(d) ? k : -1)).filter((k) => k >= 0);
  const n = dimScores.length / nd, out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let m = Infinity;
    for (const k of ks) { const v = dimScores[i * nd + k]; if (Number.isNaN(v)) { m = NaN; break; } if (v < m) m = v; }
    out[i] = m === Infinity ? NaN : m;
  }
  return out;
}

// Score on all dimensions with the site's default weights (cached per site), for tie-breaking.
let fullCache = { id: null, s: null };
function fullScores() {
  const t = state.target;
  if (fullCache.id !== t.id) {
    fullCache = { id: t.id, s: overallScores(state.dims.dimScores, state.dims.nd, state.grid.meta.dimensions.map((d) => t.weights?.[d] ?? 1)) };
  }
  return fullCache.s;
}

// The best places on the current scores, at least COMPARE_SPACING_KM apart (else five cells of one desert).
function liveTop(k = 5) {
  const s = state.overall, idx = [];
  let cut = displayRange(s).hi;
  for (let tries = 0; tries < 5 && idx.length < 200; tries++, cut -= 0.1) {
    idx.length = 0;
    for (let i = 0; i < s.length; i++) {
      if (Number.isNaN(s[i]) || s[i] < cut || (state.hideIce && state.iceSheet[i])) continue;
      idx.push(i);
    }
  }
  // Ties are common (e.g. every place dustier than Earth's p99 scores 100 on dust), so places with the
  // same shown score are ordered by their full score on all dimensions.
  const full = fullScores(), bin = (i) => Math.round(s[i] * 100);   // the score as shown
  idx.sort((a, b) => bin(b) - bin(a) || (full[b] || 0) - (full[a] || 0));
  // One place per named area: a region box (e.g. the Makran coast) can be ~900 km wide, so 200 km
  // spacing alone still listed it twice. Places with no region name are told apart by country.
  const picked = [], names = new Set();
  for (const i of idx) {
    const [lat, lng] = cellLatLng(i);
    if (picked.some((p) => distanceKm(lat, lng, p.lat, p.lng) < COMPARE_SPACING_KM)) continue;
    const name = regionOf(lat, lng).name || countryAt(lat, lng);
    if (name && names.has(name)) continue;
    if (name) names.add(name);
    picked.push({ i, lat, lng, s: s[i] });
    if (picked.length === k) break;
  }
  return picked;
}

// ---------- site cards, top finds ----------
function buildSites(meta) {
  const box = $("sites");
  box.innerHTML = "";
  for (const body of ["mars", "moon"]) {
    const row = document.createElement("div");
    row.className = "site-row";
    row.innerHTML = `<p class="site-body">${body === "mars" ? "Mars" : "Moon"}</p>`;
    const grid = document.createElement("div");
    grid.className = "site-grid";
    for (const t of state.targets.filter((x) => x.body === body)) {
      const ok = targetCoverage(meta, t).have >= MIN_DIMENSIONS;
      const b = document.createElement("button");
      b.type = "button";
      b.className = `site-card ${body}`;
      b.dataset.id = t.id;
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", "false");
      b.disabled = !ok;
      b.innerHTML = `<span class="site-name">${esc(shortName(t))}</span>${ok ? "" : `<span class="site-finds">values pending</span>`}`;
      b.addEventListener("click", () => { if (state.target?.id !== t.id) selectTarget(t.id); });
      grid.appendChild(b);
    }
    row.appendChild(grid);
    box.appendChild(row);
  }
  // arrow keys move between the six cards, as in any radio group
  box.addEventListener("keydown", (e) => {
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (!(e.key in keys)) return;
    const cards = [...box.querySelectorAll(".site-card:not(:disabled)")];
    const k = cards.indexOf(document.activeElement);
    if (k < 0) return;
    e.preventDefault();
    const next = cards[(k + keys[e.key] + cards.length) % cards.length];
    next.focus();
    next.click();
  });
}

// The five best finds for the chosen site (known areas left out), scored live with the sliders.
function renderTopFinds() {
  const t = state.target;
  if (!t || !state.overall) return;
  if (state.compare.size) { renderLiveTop(); return; }
  $("top-finds-note").hidden = true;
  if (state.live) { state.live = null; updateLayers(); }   // back to the precomputed finds on the globe
  $("top-finds-title").innerHTML = `Top finds for <span id="top-finds-site"></span>`;
  // the five best finds, one per named area (e.g. Jezero's #1 and #2 are both on the Makran coast)
  const seen = new Set();
  const list = targetCandidates().filter((c) => c.verdict !== "known").sort((a, b) => a.rank - b.rank)
    .filter((c) => { const key = regionOf(c.lat, c.lng).name || c.id; if (seen.has(key)) return false; seen.add(key); return true; })
    .slice(0, 5);
  $("top-finds").hidden = !list.length;
  $("top-finds-site").textContent = shortName(t);
  $("top-finds-list").innerHTML = list.map((c, k) => {
    const i = cellIndex(state.grid, c.lat, c.lng), s = i >= 0 ? state.overall[i] : NaN;
    return `<li><button type="button" class="find-row" data-k="${k}">
      <span class="dot new"></span>
      <span class="find-name">${esc(c.title)}<small>${esc(VERDICT_TEXT[c.verdict].label)}${list.filter((x) => x.title === c.title).length > 1 ? ` · ${fmtLatLon(c.lat, c.lng)}` : ""}</small></span>
      <b>${Number.isNaN(s) ? "–" : Math.round(s * 100)}</b></button></li>`;
  }).join("");
  $("top-finds-list").querySelectorAll(".find-row").forEach((b) => b.addEventListener("click", () => {
    const c = list[+b.dataset.k];
    holdRotation();
    flyTo(c.lat, c.lng, 1.1);
    showPlace(c.lat, c.lng, { point: c });
  }));
}

// "Dimensional analysis": the five best places on the ticked dimensions, ranked live over every land cell.
function renderLiveTop() {
  const t = state.target, list = liveTop(5);
  const names = [...state.compare].map((d) => dimName(d).toLowerCase());
  $("top-finds").hidden = !list.length;
  $("top-finds-title").textContent = `Top 5 like ${shortName(t)} on ${andList(names)}`;
  const full = fullScores();
  for (const [k, p] of list.entries()) {
    const reg = regionOf(p.lat, p.lng), country = countryAt(p.lat, p.lng);
    p.name = reg.name || country || fmtLatLon(p.lat, p.lng);
    p.sub = [reg.name && country !== reg.name ? country : null, fmtLatLon(p.lat, p.lng)].filter(Boolean).join(" · ");
    p.full = full[p.i];
    // globe dot (cyan, pulsing) for this live result
    Object.assign(p, { kind: "live", colour: FIND.colour, radius: 1.0, alt: 0.012, style: { pulse: 0.75, rgb: FIND.rgb },
      title: `#${k + 1} on ${andList(names)}`, subtitle: p.name });
  }
  // Ties: when several places share the top score (the site is beyond anything on Earth on this
  // property), say so: they are then ordered by their full score.
  const ties = list.length ? list.filter((p) => Math.round(p.s * 100) === Math.round(list[0].s * 100)).length : 0;
  const best = list.length ? Math.round(list[0].s * 100) : 0;
  // Nothing on Earth comes close (e.g. temperature: every Mars and Moon site is far colder): say so
  // instead of presenting a "top 5" of poor matches.
  const far = best < 50;
  $("top-finds-note").hidden = !far && ties < 2;
  $("top-finds-note").textContent = far
    ? `Nothing on Earth comes close to ${shortName(t)} on ${andList(names)}: the best place scores ${best}/100.${best < 5 ? "" : " These are the least different places."}`
    : ties < 2 ? "" : `${ties === list.length ? "All five" : `The first ${ties}`} score ${best} on ${andList(names)}, so they are ordered by their score on all properties.`;
  if (far && best < 5) list.length = 0;    // a ranking of zeros means nothing
  $("top-finds-list").innerHTML = list.map((p, k) => `<li><button type="button" class="find-row" data-k="${k}">
      <span class="rank">${k + 1}</span>
      <span class="find-name">${esc(p.name)}<small>${esc(p.sub)}</small></span>
      <b>${Math.round(p.s * 100)}</b></button></li>`).join("");
  state.live = list;
  updateLayers();
  $("top-finds-list").querySelectorAll(".find-row").forEach((b) => b.addEventListener("click", () => {
    const p = list[+b.dataset.k];
    flyTo(p.lat, p.lng, 1.1);
    showPlace(p.lat, p.lng);
  }));
}

function closePlace() {
  state.clicked = null; state.arc = null;
  $("place").hidden = true; $("hint").hidden = false;
  updateLayers();
}

// ---------- load ----------
async function fetchOk(path, kind) {
  const r = await fetch(`${DATA_DIR}/${path}`);
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return kind === "json" ? r.json() : r.arrayBuffer();
}

async function main() {
  const [meta, cellsBuf, featBuf, targets, analogs, candidates, validation, photo] = await Promise.all([
    fetchOk("meta.json", "json"), fetchOk("cells.bin"), fetchOk("features.bin"), fetchOk("targets.json", "json"),
    fetchOk("known_analogs.geojson", "json").catch(() => ({ features: [] })),
    fetchOk("candidates.geojson", "json").catch(() => ({ features: [] })),
    fetchOk("validation.json", "json").catch(() => null), // optional: "Does it work?" stays hidden without it
    loadImage(EARTH_URL),
  ]);
  state.validation = validation;
  state.grid = decodeGrid(meta, cellsBuf, featBuf);
  state.iceSheet = findIceSheets(state.grid);
  state.targets = targets.targets;
  state.cellWeight = new Float32Array(state.grid.n); // cos latitude: area of each cell
  for (let i = 0; i < state.grid.n; i++) {
    const row = Math.floor(state.grid.cells[i] / meta.grid.ncols);
    state.cellWeight[i] = Math.cos(((90 - (row + 0.5) * meta.grid.res_deg) * Math.PI) / 180);
  }
  loadImage(NIGHT_URL).then((im) => { nightPhoto = im; attachNight(); })
    .catch(() => { $("day-night").closest("label").hidden = true; }); // optional effect
  scoreCanvas.width = meta.grid.ncols; scoreCanvas.height = meta.grid.nrows;
  scoreImage = scoreCtx.createImageData(scoreCanvas.width, scoreCanvas.height);
  contourCanvas.width = meta.grid.ncols; contourCanvas.height = meta.grid.nrows;
  contourImage = contourCtx.createImageData(contourCanvas.width, contourCanvas.height);
  raster = new Float32Array(meta.grid.ncols * meta.grid.nrows);
  texCanvas.width = meta.grid.ncols * GLOW_SCALE; texCanvas.height = meta.grid.nrows * GLOW_SCALE;

  state.analogs = analogs.features.map((f) => {
    const p = f.properties, bodies = p.body.map((b) => (b === "moon" ? "the Moon" : "Mars")).join(" and ");
    return {
      kind: "analog", lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0],
      name: p.name, country: p.country, bodies, bodyKey: p.body[0], why: p.why_analog,
      reference: p.reference, url: p.source_url,
      title: p.name, subtitle: `Already used to prepare for ${bodies}`,
      bodyList: p.body,
    };
  });
  state.candidates = candidates.features.map((f) => {
    const lat = f.geometry.coordinates[1], lng = f.geometry.coordinates[0];
    const reg = regionOf(lat, lng), style = CAND_STYLE[reg.verdict];
    return {
      kind: "candidate", lat, lng, ...f.properties, verdict: reg.verdict, style,
      title: reg.name || "Candidate place", subtitle: `${style.heading} · ${VERDICT_TEXT[reg.verdict].label}`,
      colour: style.colour, radius: style.radius, alt: style.alt,
    };
  });

  buildSites(meta);
  buildCompare();
  const first = state.targets.find((t) => targetCoverage(meta, t).have >= MIN_DIMENSIONS) || state.targets[0];
  selectTarget(first.id);
  $("scope-cells").textContent = meta.n_cells.toLocaleString("en-US");
  status("Each place is a land cell about 28 km across.");
  $("place-close").addEventListener("click", closePlace);
  $("loader").classList.add("done");

  setupHud();
  // Map options are hidden from visitors; ?options=1 shows them (for us: layers, ice sheets, day/night, weights).
  if (new URLSearchParams(location.search).get("options") === "1") $("options").hidden = false;
  loadCountries();

  // A small "remote control" for the guided tour (web/tour.js): it can only steer the app, not change data.
  initTour({
    selectTarget(id) { clearCompare(); selectTarget(id); },   // the tour always shows the full score
    flyTo(lat, lng, altitude = 1.6, ms = 1800) { flyTo(lat, lng, altitude, ms); clearTimeout(resumeTimer); },
    rotate(on) { clearTimeout(resumeTimer); controls.autoRotate = on; },
    candidate: (targetId, rank) => state.candidates.find((c) => c.target_id === targetId && c.rank === rank),
    showCandidate(c) { if (c) showPlace(c.lat, c.lng, { point: c, quiet: false }); },
    closePlace,
    openFold(id, open = true) {
      const el = $(id);
      if (!el) return;
      el.open = open;
      if (open) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    },
    closeFolds() { for (const id of ["site-more", "trust", "options"]) $(id).open = false; },
    labels(list) { labelSets.tour = list || []; applyLabels(); },
    validation: () => state.validation,
    target: (id) => state.targets.find((t) => t.id === id),
    landCount: () => meta.n_cells,
    distanceKm,
    shortName,
  });
}

main().catch((e) => {
  console.error(e);
  status(`Could not load data: ${e.message}`);
  $("loader").querySelector("p").textContent = `Could not load data: ${e.message}`;
});
