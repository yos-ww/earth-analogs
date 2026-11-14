// First-pass literature verdicts per candidate region, from docs/literature-check.md (B, 2026-11-14).
// Region boxes are [south, north, west, east] in degrees. The first box containing a point wins.
// This is a first web check, not a full review: "none" must not be shown as "never studied".

export const VERDICT_TEXT = {
  none: { label: "No analog study found yet", tone: "new",
    text: "Our first literature check found no study using this area as a Mars or Moon analog. A deeper check is still needed before calling it unrecognised." },
  under: { label: "Little studied", tone: "under",
    text: "A few studies mention this area, usually for one feature only (for example wind-carved ridges). Our match covers many features at once." },
  known: { label: "Already used by scientists", tone: "known",
    text: "This region is a known analog area. Finding it here shows the method agrees with what scientists already use." },
  unchecked: { label: "Not checked yet", tone: "unchecked",
    text: "We have not searched the literature for this area yet." },
};

export const REGIONS = [
  { name: "Makran coast (Iran–Pakistan)", verdict: "none", box: [24.5, 27.2, 57.5, 66.5] },
  { name: "Chagai and Registan deserts (Pakistan–Afghanistan)", verdict: "none", box: [28, 30.5, 62, 66.5] },
  { name: "Southern Iran, Zagros salt domes", verdict: "none", box: [25.5, 28, 53.5, 57.5] },
  { name: "Lut Desert and central Iran", verdict: "under", box: [29.5, 34, 52.5, 60] },
  { name: "Eastern Desert of Egypt, Red Sea Hills and Sinai", verdict: "none", box: [21, 29.5, 32.5, 35.5] },
  { name: "Tibesti and southern Libya", verdict: "under", box: [19, 27.5, 15, 19] },
  { name: "Hoggar and Tassili (Algeria)", verdict: "under", box: [22, 26, 4, 8] },
  { name: "Damaraland (Namibia)", verdict: "under", box: [-22.5, -20.5, 13, 15] },
  { name: "Richtersveld and Namaqualand", verdict: "none", box: [-29, -27, 17, 19] },
  { name: "Central Saudi Arabia", verdict: "under", box: [21, 24, 43, 47] },
  { name: "Kumtag and Lop Nur deserts (China)", verdict: "under", box: [38, 40, 86, 90] },
  { name: "Qaidam Basin (China)", verdict: "known", box: [36, 39.8, 90, 98] },
  { name: "Altiplano and Atacama", verdict: "known", box: [-30, -17, -71.5, -67] },
  { name: "Puna (Argentina)", verdict: "known", box: [-27, -23, -67, -65] },
  { name: "Southern coast of Peru", verdict: "under", box: [-16.5, -14.5, -76, -73] },
  { name: "Payunia volcanic field (Argentina)", verdict: "under", box: [-38, -35.5, -70, -67.5] },
  { name: "Nevada Great Basin", verdict: "known", box: [37, 39.5, -119, -115] },
  { name: "Sonoran Desert", verdict: "known", box: [31.5, 34, -116, -112] },
  { name: "Pilbara (Australia)", verdict: "known", box: [-24.5, -20, 115, 121] },
  { name: "Moroccan Sahara and Anti-Atlas", verdict: "known", box: [30, 32.5, -8.5, -5] },
  { name: "Antarctica", verdict: "known", box: [-90, -60, -180, 180] },
];

export function regionOf(lat, lng) {
  const r = REGIONS.find(({ box: [s, n, w, e] }) => lat >= s && lat <= n && lng >= w && lng <= e);
  return r || { name: null, verdict: "unchecked" };
}
