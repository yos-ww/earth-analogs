# Literature check of the candidate regions (B, 2026-11-14; updated 2026-11-15)

Question for each candidate region in `web/data/candidates.geojson` (now 36 finds, A's run of 2026-11-15, commit `bec93f2`; earlier runs had 55 and 54): is the place already used or published as a Mars or Moon analog? This decides the `novelty` label (`docs/contract.md`); novelty is checked by a person, not by the pipeline.

**Method and limits.** One or two targeted web searches per region ("<place> Mars analog", "… planetary analogue", "… Moon analog"), reading titles and abstracts only. This is a first pass, not a full literature review:
- "No analog study found" means none turned up in this pass. It does **not** yet justify the word `unrecognized`.
- Before any site is called `unrecognized` in the app or the write-up, repeat the search in Google Scholar and NASA ADS, in English and the local language.

## Current: the 36 bare-ground finds (A's commit `bec93f2`, 2026-11-15)

A restricted finds to bare ground (`ndvi_max` < 0.15) and scored dust on bare ground only, which left 36 finds. Six were in no region box. B searched them the same way and widened one box (Red Sea Hills of Sudan, north to 22.5 N). **All 36 now have a verdict:** 18 no analog study found, 13 little studied, 5 known. The 2026-11-15 table below and the 2026-11-14 table further down are earlier runs: their ranks are out of date, but their evidence still holds for the same regions. Regions that no longer hold a find (e.g. Kuwait, northeast Nigeria) keep their box in `web/regions.js`; it does no harm.

| Region | Finds (target #rank) | Verdict |
|---|---|---|
| Makran coast (Iran–Pakistan) | Jezero #1 · Jezero #3 · Utopia #1 · Arcadia #1 · Marius Hills #4 | No analog study found |
| **Eastern Afghanistan–Waziristan borderlands** (new) | Jezero #2 | No analog study found |
| Eastern Desert of Egypt, Red Sea Hills and Sinai | Jezero #4 · Utopia #4 · Shackleton #7 · Marius Hills #2 | No analog study found |
| Red Sea Hills of Sudan and western Eritrea (box widened) | Jezero #6 · Shackleton #9 | No analog study found |
| **Western Tibet, Ngari** (new) | Gale #2 | No analog study found |
| Chagai and Registan deserts (Pakistan–Afghanistan) | Arcadia #2 | No analog study found |
| **Sistan Basin, Afghanistan–Iran** (new) | Arcadia #3 | No analog study found |
| Hami Basin (China) | Shackleton #3 | No analog study found |
| Western Saudi lava fields (Harrat Khaybar area) | Marius Hills #3 | No analog study found |
| Richtersveld and Namaqualand | Marius Hills #6 | No analog study found |
| Southern Iran, Zagros salt domes | Gale #1 · Utopia #2 | Little studied |
| **Northern Tarim Basin and Tianshan foothills, Kuqa** (new) | Gale #3 | Little studied |
| Southern coast of Peru | Gale #5 · Shackleton #4 | Little studied |
| **Central Oman, Al Wusta** (new) | Utopia #3 | Little studied |
| Tibesti and southern Libya | Utopia #5 · Shackleton #8 | Little studied |
| Hoggar and Tassili (Algeria) | Arcadia #4 | Little studied |
| Turpan Depression (China) | Shackleton #2 | Little studied |
| Lut Desert and central Iran | Shackleton #6 · Marius Hills #5 | Little studied |
| Damaraland (Namibia) | Marius Hills #1 | Little studied |
| Altiplano and Atacama | Jezero #5 · Gale #4 · Shackleton #1 | Known |
| Puna (Argentina) | Shackleton #5 | Known |
| Antarctica | Shackleton #10 | Known |

**Evidence for the five new regions:**

- **Eastern Afghanistan–Waziristan borderlands** (32.1 N, 69.1 E): nothing. A 2025 review of analog sites on the Indian subcontinent turned up, but its excerpt doesn't cover this area. The only other hit is a viral 2012 comparison of a Kandahar desert photo with a Curiosity image, which is not a study.
- **Western Tibet, Ngari** (32.4 N, 81.1 E): nothing. Popular geography sites call Ngari a natural laboratory "as an analog for Mars" without citing research. The Tibetan Plateau analog work is in the Qaidam Basin (Xiao et al. 2017), and Ladakh (Tso Kar, in our known list) is about 310 km away.
- **Northern Tarim Basin, Kuqa** (42.1 N, 84.6 E) → little studied: nothing at this site. A 2018 study (Journal of Remote Sensing, in Chinese) compared the river network of the Kaidu River in the Tarim Basin, about 150 km east, with Mars' Evros Vallis. We count that as nearby work, the same rule we used for southern Peru.
- **Central Oman, Al Wusta** (19.9 N, 57.6 E) → little studied: nothing at this site. Oman hosts analog work elsewhere: the AMADEE-18 Mars simulation in Dhofar (2018, about 400 km away), a Dhofar–Eridania Basin mineral comparison, the Samail Ophiolite (in our known list, 342 km away), and a 2025 announcement of further Moon/Mars analog missions (location not stated).
- **Sistan Basin** (31.6 N, 61.1 E): the yardangs ("kaluts") and wind erosion are described by the Helmand Sistan archaeology project, but no Mars analog study was found. Yardang analog work is in the Qaidam Basin and Egypt's Western Desert.

## Update 2026-11-15: the 54 finds of contract version 2 (earlier run)

The scoring change of 2026-11-15 (like-for-like for every feature, contract version 2) regenerated the finds: 54, of which 17 were outside every region box. B searched the new areas the same way, one or two first-pass searches each, and widened two boxes. **All 54 finds now have a verdict:** 24 "no analog study found", 15 little studied, 15 known area. The summary table further down is the 2026-11-14 run; its ranks are out of date, but its evidence still holds for the same regions.

**Which find is in which region now** (generated from `web/data/candidates.geojson` and `web/regions.js`):

| Region | Finds (target #rank) | Verdict |
|---|---|---|
| Makran coast (Iran–Pakistan) | Jezero #1 · Jezero #2 · Utopia #1 · Arcadia #1 · Marius Hills #4 | No analog study found |
| Chagai and Registan deserts (Pakistan–Afghanistan) | Jezero #3 · Arcadia #2 | No analog study found |
| Eastern Desert of Egypt, Red Sea Hills and Sinai | Jezero #4 · Gale #6 · Utopia #4 · Utopia #5 · Arcadia #5 · Shackleton #9 · Marius Hills #5 | No analog study found |
| **Red Sea Hills of Sudan and western Eritrea** (new) | Jezero #7 · Shackleton #8 | No analog study found |
| **Northeast Nigeria, Gombe–Bauchi** (new) | Utopia #6 | No analog study found (green savanna: see below) |
| **Northeast Iran, Sarakhs / Kopet Dag foothills** (new) | Arcadia #3 | No analog study found |
| **Biskra and the Saharan Atlas foothills, Algeria** (new) | Arcadia #6 | No analog study found |
| **Hami Basin, China** (new) | Shackleton #6 | No analog study found |
| **East of Lake Turkana, Kenya** (new) | Marius Hills #2 | No analog study found |
| **Western Saudi lava fields, Harrat Khaybar area** (new) | Marius Hills #3 | No analog study found |
| **Santa Cruz plateaus, Patagonia** (new) | Marius Hills #9 | No analog study found |
| **Northern Patagonian basalt plateaus, Río Negro** (new) | Marius Hills #10 | No analog study found |
| Tibesti and southern Libya (box widened east to 20 E) | Jezero #5 · Gale #7 | Little studied |
| Southern coast of Peru | Jezero #9 · Gale #5 · Shackleton #4 | Little studied |
| Southern Iran, Zagros salt domes | Gale #1 · Utopia #3 | Little studied |
| Lut Desert and central Iran | Gale #4 · Shackleton #5 · Marius Hills #6 | Little studied |
| **Kuwait desert** (new) | Utopia #2 | Little studied |
| Hoggar and Tassili (Algeria) | Arcadia #4 | Little studied |
| **Turpan Depression, China** (new box) | Shackleton #3 | Little studied |
| Damaraland (Namibia) | Marius Hills #1 | Little studied |
| Payunia volcanic field (Argentina) | Marius Hills #8 | Little studied |
| Altiplano and Atacama | Jezero #6 · Gale #2 · Utopia #8 · Shackleton #1 | Known |
| Nevada Great Basin | Jezero #8 | Known area |
| **Mojave Desert and lower Colorado River** (new) | Jezero #10 | Known area |
| Qaidam Basin (China) | Gale #3 | Known |
| Moroccan Sahara and Anti-Atlas (box widened to 29 N, 9.5 W) | Gale #8 · Shackleton #7 | Known area |
| **Coober Pedy and the Arckaringa Basin, Australia** (new) | Utopia #7 | Known area |
| Puna (Argentina) | Shackleton #2 | Known |
| Antarctica | Shackleton #10 | Known |
| Sonoran Desert | Marius Hills #7 | Known area |
| Pilbara (Australia) | Marius Hills #11 | Known |
| **Central Baja California, Mexico** (new) | Marius Hills #12 | Known area |

**Evidence for the new regions** (first pass, 2026-11-15):

- **Red Sea Hills of Sudan / western Eritrea** (17.6–18.1 N, 37.1–37.9 E): only Earth-observation descriptions (NASA Earth Observatory, "The Red Sea Hills of Sudan": granite hills with desert varnish). The analog work in the region is the Danakil/Dallol (Europlanet), several hundred km away.
- **Northeast Nigeria** (10.9 N, 10.6 E): nothing. **Caveat:** this cell is green savanna (`ndvi_max` 0.49, satellite rain ≈ 880 mm/yr). It reaches the top 1% on landscape, ground brightness, dust and rock, with plants scoring 0.12 and rain 0. Asked A whether it should count as a find.
- **Northeast Iran, Sarakhs / Kopet Dag foothills** (36.1 N, 60.4 E): nothing beyond general geography.
- **Biskra, Algeria** (34.9 N, 5.9 E): nothing for this site. Chotts in general are cited as playa analogs for Martian evaporite basins (Komatsu et al. 2007, via secondary sources); Chott Melrhir is about 60 km south-east.
- **Hami Basin, China** (43.9 N, 93.9 E): wind-erosion and yardang work (Kapp et al., Earth-Science Reviews 2024), not as a planetary analog. The Chinese yardang analog work is in the Qaidam Basin (Wang et al., JGR Planets 2018).
- **East of Lake Turkana, Kenya** (2.9 N, 36.4 E): nothing; popular descriptions only ("extra-terrestrial landscape").
- **Harrat Khaybar area, Saudi Arabia** (25.4 N, 39.1 E): astronaut photos and popular articles compare it with Mars or the Moon (NASA Earth Observatory, Slate 2010); no scientific analog study found.
- **Santa Cruz and Río Negro plateaus, Patagonia** (46.6 S, 69.9 W; 40.6 S, 68.4 W): NASA SRTM and Earth Observatory descriptions of the basalt plateaus (Somuncurá, Los Menucos); no analog study.
- **Kuwait** (29.1 N, 48.1 E) → little studied: a 2025 GIS site-selection study (Alharbi & Almatar, figshare dataset 28599647) proposes the Jal Az-Zor escarpment, about 50 km away, as a Mars analog site; NASA/JPL flew a MARSIS/SHARAD-like 40 MHz sounding radar over northern Kuwait's aquifers (Caltech news, 2011).
- **Turpan Depression** (42.6 N, 88.1 E) → little studied: Reiss et al., LPSC 2012, "Dust devil tracks in the Turpan Depression desert (China): implications for their formation on Mars" (DLR elib 80270). The 2026-11-14 table listed this point under Tarim/Kumtag, but that box stopped at 40 N; it now has its own box.
- **Mojave / lower Colorado River** (34.4 N, 114.4 W) → known area: Mojave (Dumont Dunes) is in our known list, 222 km away.
- **Coober Pedy / Arckaringa** (28.1 S, 134.4 E) → known area: Mars Society Australia shortlisted the Arkaringa Hills near Coober Pedy for its MARS-Oz station and proposes Moon Plain (25 km NE of Coober Pedy) as a test site (SA Geological Survey MESA Journal; MSA field trips 2001–2023).
- **Central Baja California** (28.6 N, 114.1 W) → known area: NASA Ames has studied the Guerrero Negro microbial mats, about 75 km away, for biosignatures relevant to Mars (Des Marais et al.; NASA Astrobiology Institute reports).

## Summary (2026-11-14 run: 55 finds, ranks out of date)

| Region | Candidates (target #rank) | Verdict | Why |
|---|---|---|---|
| **Makran coast, Iran–Pakistan** (25.6–25.9 N, 59.6–65.4 E) | Jezero #1, #2 · Arcadia #2 · Utopia #1 · Marius Hills #4 | **No analog study found** | Only generic mentions: Makran mud volcanoes are cited as examples of the landform type that may exist on Mars, never studied as a Mars analog site |
| **Chagai / Registan, Pakistan–Afghanistan** (29.1 N, 62.9–65.6 E) | Arcadia #1 · Jezero #3 | **No analog study found** | Nothing in the search |
| **Southern Iran, Hormozgan / Zagros salt domes** (26.1–26.9 N, 54.6–56.1 E) | Gale #1 · Shackleton #4 | **Under-studied** (was "no analog study found"; changed 2026-11-14 after A found Aftabi, EGU 2006) | Zagros salt glaciers (Hormuz Formation) are classic salt-tectonics sites. Iranian salt structures have been compared with Martian salt sheets in conference work (P. Aftabi, Geological Survey of Iran, EGU 2006: https://www.meetings.copernicus.org/www.cosis.net/abstracts/EGU06/00849/EGU06-J-00849-5.pdf), but no field analog study at this site was found |
| **Lut Desert (Dasht-e Lut), Iran** (30.1–32.9 N, 53.1–58.9 E) | Marius Hills #1, #6 · Shackleton #7 | **Under-studied** | Aeolian work only: Lut yardangs compared with Aeolis yardangs on Mars (Hesarakizad & Maghsoudi, in Persian), Lut as a transverse aeolian ridge (TAR) analog (Foroutan & Zimbelman; Univ. of Calgary thesis). No multi-dimension or field-analog programme |
| **Eastern Desert of Egypt / Red Sea Hills / Sinai** (21.4–28.6 N, 33.1–34.6 E) | Jezero #7 · Utopia #4, #7 · Arcadia #5 · Gale #7 · Shackleton #10 | **No analog study found** for the Eastern Desert | Egypt's classic analog work is the **Western** Desert (El-Baz et al., aeolian features; inverted channels, Icarus 2018). The Eastern Desert candidates are a different, basement-rock landscape |
| **Tibesti, Chad / southern Libya** (19.9–26.9 N, 16.9–17.9 E) | Jezero #4 · Gale #6 · Utopia #6 | **Under-studied** | Emi Koussi compared with Elysium Mons (NASA Earth Observatory; Malin 1977); region rarely visited (inaccessible, unstable) |
| **Hoggar / Tassili, Algeria** (22.9–25.4 N, 5.9–6.1 E) | Arcadia #4 · Marius Hills #5 · Jezero #8 | **Under-studied** | Mostly visual/outreach (NASA named Mars features after Algerian parks); one 2025 EPSC abstract on the nearby Ahnet Basin as an Arabia Terra analog |
| **Damaraland, Namibia** (21.4 S, 14.1 E) | Marius Hills #2 | **Under-studied** | Etendeka flood basalts are well described geologically; no planetary-analog study found for Damaraland itself. The Namib (Gobabeb) analog work is about dunes and fog, 260 km away |
| **Richtersveld / Namaqualand, South Africa–Namibia** (28.1 S, 18.1 E) | Marius Hills #3 | **No analog study found** | Nothing in the search |
| **Central Saudi Arabia** (22.6 N, 45.1 E) | Utopia #3 | **Under-studied** | A 2026 review (*Extremophiles*) calls Saudi deserts and salt flats possible Mars analogs whose potential "remains largely unexplored"; the documented Arabian analog is Dhofar, Oman |
| **Tarim / Kumtag / Lop Nur, China** (38.4–42.6 N, 88.1–88.6 E) | Utopia #2 · Gale #3 · Shackleton #3 | **Under-studied** | Kumtag and Lop Nur yardangs are studied geomorphologically; the established Mars-analog yardang work is in the Qaidam Basin (JGR Planets 2018) |
| **Qaidam Basin, China** (39.4 N, 94.1 E) | Gale #5 | **Known** | Qaidam (Dalangtan) is in our known list (Xiao et al. 2017) |
| **Altiplano / Atacama, Chile–Bolivia** (17.6–21.6 S, ~69.9 W; 28–29.6 S) | Gale #2, #8 · Jezero #5, #10 · Arcadia #6 · Utopia #5 · Marius Hills #9 · Shackleton #1, #6 | **Known** | The most studied Mars analog region on Earth (Yungay, Pajonales, Licancabur in our list) |
| **Puna, Argentina** (24.6 S, 65.9 W) | Shackleton #2 | **Known (active)** | Campo de Piedra Pómez wind/aeolian analog (Icarus 2020), EPSC 2021–2022 abstracts on Puna lakes and soils |
| **Southern Peru coast** (15.1–16.1 S, 73.6–75.1 W) | Gale #4 · Jezero #9 | **Under-studied** | Pampas de La Joya (≈16.5 S 71.9 W) is a published Mars analog (soils, climate 2004–2008, NASA-backed field work), but it is 180–350 km from these points; the Nazca/Ocoña coast itself has only visual comparisons |
| **Payunia, Argentina** (36.6 S, 68.6 W) | Marius Hills #7 | **Under-studied** | EPSC 2007 abstract: Payún Matrú lava flows as analogs of long Martian flows (Arsia Mons); SEGEMAR paper calls it "a lunar landscape"; no Moon field-analog work |
| **Nevada Great Basin** (38.1 N, 117.9 W) | Jezero #6 · Marius Hills #10 | **Known area** | Lunar Crater Volcanic Field (Apollo training) is ≈160 km east; Nevada is a standard field-test region |
| **Sonoran / Gran Desierto, USA–Mexico** (32.9–33.1 N, 113.1–114.6 W) | Marius Hills #8 · Utopia #8 | **Known area** | Pinacate (Apollo training) and Mojave analog sites nearby |
| **Pilbara, Australia** (23.4 S, 117.9 E) | Marius Hills #11 | **Known** | Pilbara is in our known list (biology); Hamersley terrain for a Moon target is a new angle but the region is not new |
| **Anti-Atlas, Morocco** (31.4 N, 6.9 W) | Shackleton #9 | **Known area** | Moroccan Sahara is a field-analog region (Ibn Battuta Centre) |
| **Eritrea western lowlands** (17.6 N, 37.9 E) | Shackleton #5 | **Not checked yet** | |
| **Antarctica** (83–89 S) | Shackleton #8, #11, #12 | **Known** | Antarctic analog work is extensive |

## What this means for the story

- **Strongest "surprise" claim:** the **Makran–Chagai–Hormozgan belt (south-east Iran and south-west Pakistan)**.
  - It holds the #1 candidate of **four** of the six targets (Jezero, Gale, Utopia, Arcadia). It is five of six only if the Lut Desert just north of it is counted (Marius Hills #1).
  - Its candidates are **360–1,010 km** from the nearest site in our known list, which is the Samail Ophiolite, Oman, for all of them (`nearest_known_km` in `candidates.geojson`; e.g. Arcadia #2 361 km, Jezero #2 397 km, Utopia #1 424 km, Gale #1 570 km). *Corrected 2026-11-14 after A's check; the first version said 800–1500 km.*
  - This pass found no analog study for Makran or Chagai. For the Zagros salt domes, salt structures have been compared with Martian salt sheets in conference work (Aftabi, EGU 2006), but no field analog study at the site was found. For Makran, check in the Scholar/ADS pass whether Skinner & Mazzini 2009 (Martian mud volcanism, terrestrial analogs) uses Makran. It is the best candidate for the first dossier, after a Scholar/ADS check.
- **Also promising, with partial literature:**
  - the **Eastern Desert of Egypt**, distinct from the well-known Western Desert;
  - **Damaraland**, flood basalt as a lunar-mare analog for Marius Hills;
  - **central Saudi Arabia**, which a 2026 review explicitly calls unexplored.
- **Validation, not discovery:** the Altiplano/Atacama, Qaidam, Puna, Nevada and Sonoran candidates land in known analog regions, so the method rediscovers known analogs, which supports the validation story.
- **Lut is "under-studied", not new:** published aeolian comparisons exist. Our angle (match on terrain, temperature, aridity, albedo and geology together, not only yardangs) is the new part.

## Next steps

1. Scholar/ADS check for Makran, Chagai, Hormozgan/Zagros salt domes, Egypt's Eastern Desert and Richtersveld (in English, plus Persian/Arabic/Urdu keywords where possible). For the Zagros, search specifically for Iranian salt glaciers ("namakier") compared with Mars (A's suggestion).
2. Check Eritrea.
3. After A's data freeze (Checkpoint 2): write `data/candidate_notes.csv` (`id,name,novelty,dossier`) from this table, using A's candidate ids.

## Sources consulted

- Lut: Hesarakizad & Maghsoudi, *Quantitative Geomorphological Research* 14(3) (Persian); Foroutan & Zimbelman, Lut TARs (GSA 2017 Cordilleran abstract, https://gsa.confex.com/gsa/2017CD/webprogram/Paper292992.html); University of Calgary thesis (https://prism.ucalgary.ca/handle/11023/3645).
- Mud volcanoes and Mars: USGS, "Martian mud volcanism: terrestrial analogs and implications for formational scenarios" (https://pubs.usgs.gov/publication/70037153).
- Tibesti: NASA Earth Observatory, Emi Koussi (https://science.nasa.gov/earth/earth-observatory/emi-koussi-volcano-chad-north-africa-3023).
- Algeria: EPSC-DPS 2025 abstract on the Ahnet Basin (https://meetingorganizer.copernicus.org/EPSC-DPS2025/EPSC-DPS2025-1671.html).
- Egypt (Western Desert): El-Baz et al., USGS (https://pubs.usgs.gov/publication/70012315); inverted channels, Icarus 2018 (https://dx.doi.org/10.1016/j.icarus.2018.03.001).
- Kumtag / Lop Nur / Qaidam: Lop Nur yardangs (Acta Geographica Sinica 2021, https://www.geog.com.cn/EN/abstract/article/0375-5444/50472); Qaidam yardangs as Mars analogue (JGR Planets 2018).
- Puna: Campo de Piedra Pómez (Icarus 2020, https://ui.adsabs.harvard.edu/abs/2020Icar..34613765F); EPSC 2022 Puna aeolian abstract (https://meetingorganizer.copernicus.org/EPSC2022/EPSC2022-715.html).
- Peru: Pampas de La Joya climatology (International Journal of Astrobiology, 2004–2008 observations); EPSC-DPS 2011 abstract (https://meetingorganizer.copernicus.org/EPSC-DPS2011/EPSC-DPS2011-1798.pdf).
- Payunia: EPSC 2007 abstract (https://meetings.copernicus.org/www.cosis.net/abstracts/EPSC2007/00340/EPSC2007-J-00340.pdf); SEGEMAR (https://repositorio.segemar.gob.ar/handle/308849217/1330).
- Saudi Arabia: "Extreme Arabian environments and their microbiomes", *Extremophiles* 2026 (summary: https://astrobiology.com/2026/04/13/extreme-arabian-environments-and-their-microbiomes-new-frontiers-for-astrobiology-and-biosignature-discovery/).
- Zagros salt glaciers: IUGS Geoheritage (https://iugs-geoheritage.org/?p=10760).
