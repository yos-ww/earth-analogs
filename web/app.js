// Analog Atlas: 3D globe showing where Earth is most like a chosen Mars or Moon site.
// Data formats: docs/contract.md. Scoring: score.js (mirrors pipeline/score.py).
import { decodeGrid, dimensionScores, overallScores, cellScores, cellIndex, targetCoverage, MIN_DIMENSIONS } from "./score.js";
import { regionOf, VERDICT_TEXT } from "./regions.js";
import { MISSIONS, USE } from "./missions.js";

const DATA_DIR = "data"; // "mock" to test against web/mock/*
const IMG = { earth: "img/earth-blue-marble.jpg", bump: "img/earth-topology.png" };

// Look: weak matches stay transparent (real Earth shows), strong matches glow warm.
const RAMP_STOPS = ["#ffe66d", "#ffb02e", "#ff6a1a", "#e8202a", "#a3004f"]; // low -> high match
const SHOW_FROM = 0.35;         // scores below this are fully transparent
const MAX_ALPHA = 235;          // 0-255 opacity of a perfect match
const TEX_SCALE = 2;            // texture = 2x the score grid (2880 x 1440), smoothed
const FADE_MS = 550;            // cross-fade when the target changes
const RESUME_ROTATE_MS = 2500;  // auto-rotation resumes this long after the user lets go
const ICE_SHEET_FROM = 0.9;     // snow_ice fraction from which a cell counts as permanent ice sheet
const COLOURS = { mars: "#ff7a45", moon: "#f2f5fa", click: "255,179,71" };
// Candidates are styled by their literature verdict (web/regions.js), so real discoveries stand out
// from places where our search only re-found an area scientists already use.
const CAND_STYLE = {
  none:      { colour: "#39ff88", rgb: "57,255,136",  radius: 0.55, alt: 0.035, pulse: 0.75, heading: "New find",
               tag: "new find", group: "finds" },
  under:     { colour: "#ffd23f", rgb: "255,210,63",  radius: 0.5,  alt: 0.03,  pulse: 0.45, heading: "Little-studied find",
               tag: "little-studied find", group: "finds" },
  unchecked: { colour: "#7fb2ff", rgb: "127,178,255", radius: 0.32, alt: 0.015, pulse: 0,    heading: "Candidate (not checked yet)",
               tag: "candidate, not checked yet", group: "finds" },
  known:     { colour: "#9aa4b8", rgb: "154,164,184", radius: 0.3,  alt: 0.015, pulse: 0,    heading: "Known area our search found too",
               tag: "known area", group: "confirms" },
};

// Everyday words for visitors.
const DIM_NAME = {
  terrain: "Landscape shape", temperature: "Temperature", vegetation: "Plants", aridity: "Rainfall",
  albedo: "Ground brightness", ice: "Ice & snow", dust: "Dust in the air", geology: "Rock type",
};
const TARGET_BLURB = {
  jezero: "Where NASA's Perseverance rover landed in 2021: an ancient lake bed with a dried-up river delta.",
  gale: "Where NASA's Curiosity rover landed in 2012: plains at the foot of a 5 km high mountain.",
  utopia: "Where China's Zhurong rover landed in 2021: wide, flat northern plains.",
  arcadia: "A candidate landing site for the first human crews: flat plains with ice just below the surface.",
  shackleton: "The rim of Shackleton crater at the Moon's south pole, in NASA's Artemis landing region: almost constant sunlight next to dark, icy craters.",
  marius_hills: "A hole into an underground lava tube on the Moon: a possible natural shelter for a future base.",
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
  iceSheet: null, hideIce: false, cellWeight: null,
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
  .backgroundColor("#05070d")
  .globeImageUrl(IMG.earth)          // the photo first; replaced by the composite once loaded
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
  .ringMaxRadius((d) => d.maxR).ringPropagationSpeed((d) => d.speed).ringRepeatPeriod((d) => d.period);

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

function flyTo(lat, lng) {
  holdRotation();
  globe.pointOfView({ lat, lng, altitude: Math.min(globe.pointOfView().altitude, 1.8) }, 1000);
  resumeRotationSoon(1000);
}

window.addEventListener("resize", () => globe.width(window.innerWidth).height(window.innerHeight));

// Points and rings shown for the current target and toggles.
function targetCandidates() {
  return state.candidates.filter((c) => c.target_id === state.target?.id);
}
function updateLayers() {
  const cands = targetCandidates().filter((c) =>
    (c.style.group === "finds" && state.showCandidates) || (c.style.group === "confirms" && state.showConfirms));
  globe.pointsData([...(state.showAnalogs ? state.analogs : []), ...cands]);
  const rings = cands.filter((c) => c.style.pulse > 0).map((c) => ({
    lat: c.lat, lng: c.lng, rgb: c.style.rgb, strength: c.style.pulse, maxR: 2.4, speed: 1.2, period: 2200,
  }));
  if (state.clicked) rings.push({ lat: state.clicked[0], lng: state.clicked[1], rgb: COLOURS.click, strength: 1, maxR: 3, speed: 2.2, period: 1100 });
  globe.ringsData(rings);
}

// ---------- painting ----------
function paintScores(values) {
  const { grid } = state;
  const px = scoreImage.data;
  px.fill(0);
  for (let i = 0; i < grid.n; i++) {
    const s = values[i];
    if (Number.isNaN(s) || s <= SHOW_FROM) continue;          // weak match: real Earth shows
    if (state.hideIce && state.iceSheet[i]) continue;         // ice sheet hidden for this target
    const v = (Math.min(s, 1) - SHOW_FROM) / (1 - SHOW_FROM);
    const p = grid.cells[i] * 4, k = Math.round(v * 255) * 3;
    px[p] = LUT[k]; px[p + 1] = LUT[k + 1]; px[p + 2] = LUT[k + 2];
    px[p + 3] = Math.round(MAX_ALPHA * Math.pow(v, 0.8));
  }
  scoreCtx.putImageData(scoreImage, 0, 0);
  texCtx.drawImage(earthPhoto, 0, 0, texCanvas.width, texCanvas.height);
  texCtx.imageSmoothingEnabled = true;
  texCtx.imageSmoothingQuality = "high";
  texCtx.drawImage(scoreCanvas, 0, 0, texCanvas.width, texCanvas.height);
  const map = globe.globeMaterial().map;
  if (map) { map.image = texCanvas; map.needsUpdate = true; }
  else requestAnimationFrame(() => paintScores(values)); // photo texture not created yet
}

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
    state.overall = overallScores(state.dims.dimScores, state.dims.nd, state.weights);
    if (fade) startFade(previous, state.overall);
    else { state.fade = null; state.shown = state.overall; paintScores(state.overall); }
    refreshPanel();
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
  state.weights = state.grid.meta.dimensions.map((d) => t.weights?.[d] ?? 1);
  state.dims = dimensionScores(state.grid, t);
  state.hideIce = t.body === "mars";
  $("hide-ice").checked = state.hideIce;
  const count = (v) => targetCandidates().filter((c) => c.verdict === v).length;
  const parts = [[count("none"), "new find"], [count("under"), "little-studied find"], [count("known"), "known area found again"]]
    .filter(([n]) => n).map(([n, w]) => `${n} ${w}${n === 1 ? "" : "s"}`);
  $("target-blurb").innerHTML = `${esc(TARGET_BLURB[t.id] || "")}` +
    (parts.length ? ` <span class="sub">On Earth: ${parts.join(", ")}.</span>` : "");
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
  const oneIn = (p) => Math.max(1, Math.round(1 / p));
  let html = `<p>To test the method, we scored the places scientists <b>already use</b> to prepare for Mars and the Moon,
    and compared them with random <b>plain desert</b> (bare land without plants). If the method works, the known places should rank higher.</p>
    <h4>Mars (${m.n_sites} known places)</h4>
    ${trustBars([["Known Mars places", m.known_percentile_median, "known"], ["Plain desert", m.random_barren_median, "barren"], ["Any land", m.random_land_median, "land"]])}
    <p class="note">Numbers are percentiles of Earth's land (higher = more Mars-like).</p>
    <p><b>Result:</b> known Mars places rank above plain desert (${Math.round(m.known_percentile_median * 100)}th vs
      ${Math.round(m.random_barren_median * 100)}th percentile). The evidence is <b>modest</b>: about 1 in ${oneIn(m.p_vs_barren)} random sets
      of plain desert would do this well (p ≈ ${m.p_vs_barren.toFixed(2)}), and it depends on how "plain desert" is defined.</p>`;
  if (moon) {
    html += `<h4>Moon (${moon.n_sites} known places)</h4>
      ${trustBars([["Known Moon places", moon.known_percentile_median, "known"], ["Plain desert", moon.random_barren_median, "barren"]])}
      <p>The Moon test has <b>too few independent places</b> to conclude (half are in the USA), so we make no claim for it.</p>`;
  }
  if (t) {
    html += `<p class="note">For ${esc(shortName(state.target))} alone: known places ${Math.round(t.known_percentile_median * 100)}th vs plain desert
      ${Math.round(t.random_barren_median * 100)}th percentile (p ≈ ${t.p_vs_barren.toFixed(3)}).</p>`;
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

const verdictWord = (s) => (s >= 0.8 ? "very similar" : s >= 0.6 ? "similar" : s >= 0.4 ? "partly similar" : "different");

function areaPercentile(s) {
  const { overall } = state, w = state.cellWeight;
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
  const all = state.targets.map((t) => ({ t, s: cellScores(grid, t, i, state.weights).overall }))
    .sort((a, b) => (Number.isNaN(b.s) ? -1 : b.s) - (Number.isNaN(a.s) ? -1 : a.s))
    .map(({ t, s }) => bar(`${esc(shortName(t))} <span class="sub">${t.body === "moon" ? "Moon" : "Mars"}</span>`, s)).join("");
  return `<details class="more"><summary>See all the numbers</summary>
    <h4>Similarity by property (out of 100)</h4>${bars}
    <h4>Measured here vs ${esc(shortName(target))}</h4>
    <table class="cmp"><thead><tr><th></th><th>Here</th><th>${esc(shortName(target))}</th></tr></thead><tbody>${rows}</tbody></table>
    <h4>Similarity to every Mars and Moon site</h4>${all}</details>`;
}

// Fill the panel for a clicked place, known analog or candidate (`point`).
function showPlace(lat, lng, { quiet = false, point = null } = {}) {
  state.clicked = [lat, lng, point];
  if (!quiet) updateLayers(); // moves the click pulse
  const t = state.target, i = cellIndex(state.grid, lat, lng);
  let html = "";

  if (point?.kind === "analog") {
    const ref = point.url ? `<a href="${esc(point.url)}" target="_blank" rel="noopener">${esc(point.reference)}</a>` : esc(point.reference);
    html += `<h3>${esc(point.name)}</h3>
      <p class="sub">${esc(point.country)} · <span class="tag ${point.bodyKey}">already used for ${point.bodies}</span></p>
      <p>${esc(point.why)}</p><p class="note">Source: ${ref}</p>`;
  } else if (point?.kind === "candidate") {
    const reg = regionOf(lat, lng), v = VERDICT_TEXT[reg.verdict], st = point.style;
    html += `<h3>${esc(reg.name || "Candidate place")}</h3>
      <p class="sub">${fmtLatLon(lat, lng)} · <span class="tag" style="background:${st.colour}">${st.tag} · #${point.rank} for ${esc(shortName(t))}</span></p>
      <div class="newness ${v.tone}"><b>Is it new? ${v.label}.</b> ${v.text}</div>
      <p class="note">Area about ${Math.round(point.area_km2).toLocaleString()} km² · ${Math.round(point.nearest_known_km)} km from the nearest place scientists already use ·
        stays in the top list in ${Math.round(point.robustness * 100)}% of tests with changed weights.</p>`;
  } else {
    const reg = regionOf(lat, lng);
    html += `<h3>${reg.name ? esc(reg.name) : fmtLatLon(lat, lng)}</h3>${reg.name ? `<p class="sub">${fmtLatLon(lat, lng)}</p>` : ""}`;
  }

  if (i < 0) {
    html += `<p class="note">This is sea, or outside our land map, so it has no score.</p>`;
  } else if (Number.isNaN(state.overall[i])) {
    html += `<p class="note">Not enough satellite data here to compare it with ${esc(shortName(t))}.</p>`;
  } else {
    const s = state.overall[i], pct = areaPercentile(s);
    html += `<div class="score-big"><strong>${Math.round(s * 100)}<small>/100</small></strong>
      <span>similar to ${esc(shortName(t))} on ${bodyName(t.body)}<br>more similar than ${Math.round(pct * 100)}% of Earth's land</span></div>`;
    if (state.hideIce && state.iceSheet[i]) {
      html += `<p class="note">This is a permanent ice sheet, so it is not coloured for a Mars site: Mars sites have no ice on the surface.</p>`;
    }
    // Rainfall (aridity) is listed separately: the satellite estimate cannot tell dry from extremely
    // dry deserts, so it would be "different" almost everywhere (decision in CLAUDE.md, 2026-11-14).
    const scored = state.grid.meta.dimensions.map((d, k) => ({ d, s: state.dims.dimScores[i * state.dims.nd + k] }))
      .filter((x) => !Number.isNaN(x.s) && x.d !== "aridity").sort((a, b) => b.s - a.s);
    const good = scored.filter((x) => x.s >= 0.6);
    let bad = scored.filter((x) => x.s < 0.4).reverse();
    if (!bad.length && scored.length) bad = [scored[scored.length - 1]]; // always name the weakest one
    if (good.length) html += `<h4>✔ What is similar</h4><ul class="why good">${good.map((x) =>
      `<li><b>${dimName(x.d)}</b> (${verdictWord(x.s)}): ${describe(x.d, i)}</li>`).join("")}</ul>`;
    if (bad.length) html += `<h4>✖ Where it breaks down</h4><ul class="why bad">${bad.map((x) =>
      `<li><b>${dimName(x.d)}</b> (${verdictWord(x.s)}): ${describe(x.d, i)}</li>`).join("")}</ul>`;
    // Why this place matters for the mission: its strongest matches say what a team could practise here.
    const uses = good.filter((x) => USE[x.d]).slice(0, 3).map((x) => USE[x.d]);
    const weak = bad.filter((x) => USE[x.d]).slice(0, 1).map((x) => USE[x.d]);
    if (uses.length && s >= 0.5) {
      html += `<div class="matters"><b>🚀 Why this place matters:</b> a team preparing for ${esc(shortName(t))} could practise
        ${andList(uses.map((u) => `<b>${u}</b>`))} here` +
        (weak.length ? `, but not ${weak[0]}.` : ".") + `</div>`;
    } else if (s < 0.5) {
      html += `<div class="matters dim-matters">Too different from ${esc(shortName(t))} to be a useful practice site for it.</div>`;
    }
    if (!Number.isNaN(state.dims.dimScores[i * state.dims.nd + state.grid.meta.dimensions.indexOf("aridity")])) {
      html += `<p class="note rain"><b>Rainfall:</b> the rain satellite estimates ${fmtValue("precip", "mm/yr", cellValue(i, "precip"))} here.
        It is too coarse to tell dry from extremely dry deserts, so we do not list it above (it still counts in the score).</p>`;
    }
    html += `<p class="note">Earth can never copy Mars or the Moon fully: gravity, the thin or missing air and space radiation are always different.</p>`;
    html += detailsBlock(i);
  }

  if (point?.kind !== "candidate") {
    let best = null;
    for (const c of targetCandidates().filter((x) => x.style.group === "finds")) {
      const d = distanceKm(lat, lng, c.lat, c.lng);
      if (!best || d < best.d) best = { c, d };
    }
    if (best) html += `<p class="note">Nearest new or little-studied find for ${esc(shortName(t))}: ${Math.round(best.d)} km away.</p>`;
  }

  $("place-title").textContent = point?.kind === "candidate" ? point.style.heading : point?.kind === "analog" ? "Place scientists already use" : "Selected place";
  $("place-body").innerHTML = html;
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
    loadImage(IMG.earth),
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
  earthPhoto = photo;
  scoreCanvas.width = meta.grid.ncols; scoreCanvas.height = meta.grid.nrows;
  scoreImage = scoreCtx.createImageData(scoreCanvas.width, scoreCanvas.height);
  texCanvas.width = meta.grid.ncols * TEX_SCALE; texCanvas.height = meta.grid.nrows * TEX_SCALE;

  state.analogs = analogs.features.map((f) => {
    const p = f.properties, bodies = p.body.map((b) => (b === "moon" ? "the Moon" : "Mars")).join(" and ");
    return {
      kind: "analog", lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0],
      name: p.name, country: p.country, bodies, bodyKey: p.body[0], why: p.why_analog,
      reference: p.reference, url: p.source_url,
      title: p.name, subtitle: `Already used to prepare for ${bodies}`,
      colour: COLOURS[p.body[0]] || "#ffffff", radius: 0.28, alt: 0.012,
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

  const sel = $("target");
  for (const body of ["mars", "moon"]) {
    const group = document.createElement("optgroup");
    group.label = body === "mars" ? "Mars" : "Moon";
    for (const t of state.targets.filter((x) => x.body === body)) {
      const ok = targetCoverage(meta, t).have >= MIN_DIMENSIONS;
      group.appendChild(new Option(ok ? t.name : `${t.name} (values pending)`, t.id));
    }
    sel.appendChild(group);
  }
  sel.addEventListener("change", () => selectTarget(sel.value));
  const first = state.targets.find((t) => targetCoverage(meta, t).have >= MIN_DIMENSIONS) || state.targets[0];
  sel.value = first.id;
  selectTarget(first.id);
  status(`${meta.n_cells.toLocaleString()} places on Earth compared, each about 28 km across.`);
  $("loader").classList.add("done");
}

main().catch((e) => {
  console.error(e);
  status(`Could not load data: ${e.message}`);
  $("loader").querySelector("p").textContent = `Could not load data: ${e.message}`;
});
