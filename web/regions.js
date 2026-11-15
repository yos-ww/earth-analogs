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
  { name: "Southern Iran, Zagros salt domes", verdict: "under", box: [25.5, 28, 53.5, 57.5],
    note: "Iranian salt structures have been compared with Martian salt sheets in conference work (Aftabi, EGU 2006), but our first-pass search found no field analog study at this site." },
  { name: "Lut Desert and central Iran", verdict: "under", box: [29.5, 34, 52.5, 60] },
  { name: "Eastern Desert of Egypt, Red Sea Hills and Sinai", verdict: "none", box: [21, 29.5, 32.5, 35.5] },
  { name: "Tibesti and southern Libya", verdict: "under", box: [19, 27.5, 15, 20] },   // east edge 19 -> 20 for Gale #7 (2026-11-15)
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
  { name: "Moroccan Sahara and Anti-Atlas", verdict: "known", box: [29, 32.5, -9.5, -5] },   // widened 2026-11-15 for Gale #8
  { name: "Antarctica", verdict: "known", box: [-90, -60, -180, 180] },
  // Added 2026-11-15 for the finds of contract version 2 (first-pass web search; docs/literature-check.md).
  { name: "Red Sea Hills of Sudan and western Eritrea", verdict: "none", box: [17, 19, 36.5, 38.5] },
  { name: "Mojave Desert and lower Colorado River (USA)", verdict: "known", box: [34, 35.5, -116, -114] },
  { name: "Kuwait desert", verdict: "under", box: [28.5, 30.1, 46.5, 48.6],
    note: "A 2025 GIS study proposes Jal Az-Zor in Kuwait (about 50 km away) as a Mars analog site, and NASA/JPL tested Mars-style radar sounding over northern Kuwait. No field analog work found at this site." },
  { name: "Northeast Nigeria (Gombe–Bauchi)", verdict: "none", box: [10, 11.5, 9.5, 11.5],
    note: "No analog study found. Note: this is green savanna with a rainy season. It matches on landscape, ground brightness, dust and rock, not on plants or rain." },
  { name: "Coober Pedy and the Arckaringa Basin (Australia)", verdict: "known", box: [-29.5, -27, 133, 136] },
  { name: "Northeast Iran (Sarakhs, Kopet Dag foothills)", verdict: "none", box: [35.5, 37, 59.5, 61.5] },
  { name: "Biskra and the Saharan Atlas foothills (Algeria)", verdict: "none", box: [34.3, 35.5, 5, 6.8] },
  { name: "Turpan Depression (China)", verdict: "under", box: [42, 43.5, 87.5, 90],
    note: "Dust-devil tracks here were compared with Mars in one conference paper (Reiss et al., LPSC 2012). No other analog work found." },
  { name: "Hami Basin (China)", verdict: "none", box: [43, 44.5, 92.5, 95],
    note: "Hami's yardangs and winds are studied for Earth science, but our first-pass search found no Mars or Moon analog study here." },
  { name: "East of Lake Turkana (Kenya)", verdict: "none", box: [2, 4, 35.8, 37.5] },
  { name: "Western Saudi lava fields (Harrat Khaybar area)", verdict: "none", box: [24.5, 26.5, 38.5, 40.5],
    note: "Often compared with the Moon or Mars in astronaut photos and popular articles, but our first-pass search found no scientific analog study." },
  { name: "Santa Cruz plateaus, Patagonia (Argentina)", verdict: "none", box: [-48, -45.5, -71, -68.5] },
  { name: "Northern Patagonian basalt plateaus (Río Negro)", verdict: "none", box: [-41.5, -40, -69.5, -67] },
  { name: "Central Baja California (Mexico)", verdict: "known", box: [27.5, 29.5, -115, -113],
    note: "NASA Ames has long studied the microbial mats of Guerrero Negro, about 75 km away, for biosignatures relevant to Mars." },
];

export function regionOf(lat, lng) {
  const r = REGIONS.find(({ box: [s, n, w, e] }) => lat >= s && lat <= n && lng >= w && lng <= e);
  return r || { name: null, verdict: "unchecked" };
}
