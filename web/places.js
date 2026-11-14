// "How Mars-like is…" places. Countries use an approximate bounding box [south, north, west, east];
// cities use one point. Everything is looked up in the browser: no geocoding service is called.

export const COUNTRIES = {
  "Qatar": [24.5, 26.2, 50.75, 51.65],
  "United Arab Emirates": [22.6, 26.1, 51.6, 56.4],
  "Saudi Arabia": [16.4, 32.1, 34.6, 55.6],
  "Oman": [16.7, 26.4, 52.0, 59.8],
  "Bahrain": [25.8, 26.3, 50.4, 50.65],
  "Kuwait": [28.6, 30.1, 46.6, 48.4],
  "Jordan": [29.2, 33.3, 35.0, 39.2],
  "Egypt": [22.0, 31.6, 24.8, 36.8],
  "Iran": [25.1, 39.7, 44.1, 63.3],
  "Pakistan": [23.7, 37.0, 61.0, 77.8],
  "Morocco": [27.7, 35.9, -13.1, -1.1],
  "Algeria": [19.0, 37.0, -8.6, 11.9],
  "Libya": [19.5, 33.1, 9.4, 25.1],
  "Namibia": [-28.9, -17.0, 11.8, 25.2],
  "South Africa": [-34.8, -22.2, 16.5, 32.8],
  "Turkey": [36.0, 42.1, 26.1, 44.8],
  "Spain": [36.0, 43.8, -9.3, 3.3],
  "Iceland": [63.4, 66.5, -24.5, -13.5],
  "Chile": [-55.9, -17.6, -75.6, -66.5],
  "Peru": [-18.3, -0.1, -81.3, -68.7],
  "United States (lower 48)": [24.6, 49.3, -124.7, -67.0],
  "Mexico": [14.6, 32.7, -117.1, -86.8],
  "Australia": [-43.6, -10.7, 113.3, 153.6],
  "China": [18.2, 53.5, 73.6, 134.7],
  "Mongolia": [41.6, 52.1, 87.8, 119.9],
  "India": [6.8, 35.5, 68.2, 97.3],
};

export const CITIES = {
  "Doha": [25.29, 51.53], "Dubai": [25.2, 55.27], "Abu Dhabi": [24.45, 54.38], "Riyadh": [24.71, 46.68],
  "Muscat": [23.59, 58.41], "Kuwait City": [29.37, 47.98], "Manama": [26.23, 50.59], "Amman": [31.95, 35.93],
  "Cairo": [30.04, 31.24], "Tehran": [35.69, 51.39], "Karachi": [24.86, 67.0], "Istanbul": [41.01, 28.98],
  "Marrakesh": [31.63, -7.99], "Nairobi": [-1.29, 36.82], "Cape Town": [-33.92, 18.42], "Reykjavik": [64.15, -21.94],
  "London": [51.51, -0.13], "Paris": [48.86, 2.35], "New York": [40.71, -74.01], "Las Vegas": [36.17, -115.14],
  "Phoenix": [33.45, -112.07], "Santiago": [-33.45, -70.67], "Lima": [-12.05, -77.04], "Alice Springs": [-23.7, 133.88],
  "Sydney": [-33.87, 151.21], "Beijing": [39.9, 116.4], "Delhi": [28.61, 77.21], "Tokyo": [35.68, 139.69],
  "Ulaanbaatar": [47.92, 106.92],
};
