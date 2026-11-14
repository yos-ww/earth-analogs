# Data Sources: Earth Analogs Challenge

Resources listed on the hackathon Resources tab. Use this file to decide which source to query for a given analog dimension. See `challenge.md` for the challenge itself.

> URLs are the official links provided for each resource.

## Quick lookup: which source for which question

| Analog dimension | Best sources |
|---|---|
| Earth surface imagery, temperature, vegetation, aerosols, ice, water | NASA Earthdata Search, NASA Worldview, Copernicus, JAXA G-Portal |
| Radar / all-weather / day-night surface roughness, ice, wetlands | CSA RCM, RADARSAT-1, SAR Python Tutorial, Copernicus (Sentinel-1) |
| Lunar topography, imagery, roughness | NASA PDS, LRO (LOLA, LROC) |
| Lunar temperature, polar cold traps, ice | LRO Diviner, LRO LEND |
| Lunar radar, subsurface / ice | LRO Mini-RF |
| Mars imagery, geoscience, atmosphere | NASA PDS |
| Snow, precipitation, vegetation | JAXA G-Portal |
| Finding datasets, workflows, experiments | ESA Open Science Catalog |

## NASA

### Earth

- **NASA Earthdata Search** (https://search.earthdata.nasa.gov/): NASA's primary portal for discovering and accessing Earth science observations.
- **NASA Worldview** (https://worldview.earthdata.nasa.gov/index.html): Interactive environment for visually exploring NASA satellite imagery and environmental observations. Good for quick visual exploration and checking candidate sites.

### Moon and Mars

- **NASA Planetary Data System, PDS** (https://pds.nasa.gov/): Long-term archive for planetary science data from NASA orbital, lander, and rover missions. Covers lunar and Martian observations: imagery, geoscience, atmospheres, plasma environments, cartography, and other measurements.
- **NASA Lunar Reconnaissance Orbiter, LRO** (https://pds-geosciences.wustl.edu/missions/lro/): Extensive observations of the lunar surface. Instruments:
  - LROC: imagery
  - LOLA: laser altimetry (topography)
  - Diviner: thermal radiometer
  - LEND: neutron detector (hydrogen / ice)
  - Mini-RF: radar
  - others
- **NASA LRO Diviner Lunar Data** (https://pds-geosciences.wustl.edu/missions/lro/diviner.htm): Maps lunar surface temperatures. Especially useful for the lunar poles. Polar and resource products can be compared with extreme cold, ice-bearing, or other terrestrial environments.

## Space agency partners

### CSA, Canadian Space Agency

- **RADARSAT Constellation Mission, RCM, Data** (https://donnees-data.asc-csa.gc.ca/en/dataset/rcm): Three Earth observation satellites that scan Earth day or night in any weather. Focus areas:
  - Maritime surveillance: ice, surface wind, oil pollution, ships
  - Disaster management
  - Ecosystem monitoring: agriculture, wetlands, forestry, coastal change
- **RADARSAT-1 Data** (https://donnees-data.asc-csa.gc.ca/en/dataset/radarsat1): Launched November 1995. Synthetic aperture radar (SAR) imaging day or night, in all weather and through cloud, smoke, and haze. The full Canadian RADARSAT-1 archive is released under an open license.
- **SAR Python Tutorial** (https://github.com/asc-csa/Synthetic_Aperture_Radar_Tutorial): Shows how to work with SAR imagery using Python and QGIS, with practical steps for accessing and visualizing data. Start here if you are new to SAR.

### ESA, European Space Agency

- **Copernicus Data Space Ecosystem** (https://dataspace.copernicus.eu/): Free and open access to Sentinel Earth-observation data covering land, oceans, and atmosphere, with tools for visualization and processing.
- **ESA Open Science Catalog** (https://opensciencedata.esa.int/): Catalog of publicly available geoscience datasets, products, experiments, and workflows.

### JAXA, Japan Aerospace Exploration Agency

- **JAXA G-Portal** (https://gportal.jaxa.jp/gpr/index/index): Earth-observation products from JAXA missions, searchable by variables such as precipitation, snow, and vegetation.

## Notes for use

- The resource list is not exhaustive; the organizers may add more before the hackathon.
- The sources cover three groups:
  - Earth observation (NASA Earthdata, Worldview, CSA, ESA, JAXA)
  - Lunar data (PDS, LRO)
  - Mars data (PDS)
- A similarity analysis needs both Earth and Moon/Mars layers, so most approaches will combine sources from more than one group.
- Radar sources (RCM, RADARSAT-1, Mini-RF) can be compared directly: the same measurement type exists for Earth and the Moon.
- Diviner temperatures can be compared with Earth temperature products to find terrestrial cold-trap and extreme-cold analogs.
