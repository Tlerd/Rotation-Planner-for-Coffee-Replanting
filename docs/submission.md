# Space Apps 2026 submission text (draft)

Copy each block into the matching field of the submission form. Check every claim before you submit.

## Project Name
ReRoot: Rotation Planner for Coffee Replanting

## Summary (about 170 words)
Coffee trees in Vietnam's Central Highlands are getting old, and farmers must pull them out and replant. Experts advise a 2–3 year rotation with other crops before replanting, so the soil can recover. Most smallholders farm on slopes, where bare soil washes away in the rainy season. ReRoot helps a farmer plan that gap. On a 3D map built from NASA SRTM elevation, the farmer clicks their hillside. ReRoot reads NASA data for that spot: slope from SRTM, plant cover from MODIS NDVI, soil moisture from SMAP, and 10 years of rain, temperature and root-zone wetness from NASA POWER. It scores five rotation crops (maize, peanut, soybean, mung bean and the green manure Crotalaria) against that climate. It then ranks every 2- and 3-year sequence with the farmer's own priorities: soil health, erosion control, income and water risk. Steep, rainy fields give erosion control more weight. The farmer gets the top three plans, each with a plain-English reason and the NASA numbers behind it.

## Project Demonstration
TODO: link to the 30-second video or the 7-slide deck (public, no login).

## Project Link
- App (v2, 3D map, API and database): https://coffee-pied-eight.vercel.app/
- Simple version (v1, static): https://tlerd.github.io/Rotation-Planner-for-Coffee-Replanting/
- Code: https://github.com/Tlerd/Rotation-Planner-for-Coffee-Replanting

## Project Details
**What it does.** ReRoot is a decision-support tool for the 2–3 years between removing old coffee trees and replanting. A farmer clicks a spot on a 3D terrain map. The app shows the spot's elevation, slope, plant cover, soil moisture and average year of rain and temperature. It then recommends the three best crop sequences for the farmer's priorities and explains each one.

**How it works.**
- A Python script turns raw NASA files into small web data: SRTM 30 m elevation becomes 3D terrain tiles and slope; MODIS NDVI and SMAP L4 root-zone soil moisture become map layers; all of them go into a 200 × 200 cell grid (about 275 m cells) for a 55 × 55 km area of Dak Lak province.
- The grid, the crop table and a cache of NASA POWER answers live in a Postgres database (Neon) behind two serverless API routes on Vercel.
- The browser draws the 3D map with MapLibre, on a Sentinel-2 cloudless base image.
- For each crop, the app finds the sowing month where the rain over the crop's season best covers the crop's water need (FAO values), and adds root-zone wetness.
- It ranks all 100 sequences with four priority sliders. Erosion risk (slope × months with 200 mm of rain or more) raises the weight of erosion control. A rain scenario (average, 30 % wetter, 30 % drier) shows how plans change.

**Benefits.** Farmers see their own hillside and the reasons behind each plan, not a black box. Plans that start with ground cover and end with a nitrogen-fixing crop protect the soil before coffee goes back in. Extension workers can use the same view to explain options.

**Factors considered.** Slope, heavy-rain months, rain in each crop's season, root-zone wetness, current soil moisture, plant cover, nitrogen fixing, organic matter, ground cover and income.

**Tools and languages.** HTML, CSS, JavaScript, Node.js serverless functions, PostgreSQL (Neon), Python (NumPy, h5py, Pillow), MapLibre GL JS, Chart.js, Vercel, GitHub Pages.

**Creativity.** ReRoot focuses on one real, under-served decision: what to grow while coffee is being replanted on slopes. It combines terrain, satellite soil moisture, vegetation and climate in one click, and every number shows its source.

**Limits.** Many crop values (sowing months, organic matter, ground cover, income) are still marked TODO and shown as unverified. Scoring thresholds are the team's own simplifications. SMAP is one snapshot (31 Oct 2026) and NDVI one 16-day period (Oct 2026). Detailed data cover only the study area; elsewhere the app uses NASA POWER climate and a manual slope.

## NASA Data
- NASA POWER Monthly & Annual API (PRECTOTCORR, T2M, GWETROOT; community AG) – https://power.larc.nasa.gov/
- SRTM GL1 v003 30 m elevation (SRTMGL1, tile N12E108), LP DAAC – https://www.earthdata.nasa.gov/data/instruments/srtm
- SMAP L4 Global 3-hourly 9 km Surface and Root Zone Soil Moisture (SPL4SMGP v8), NSIDC DAAC – https://www.earthdata.nasa.gov/data/platforms/space-based-platforms/smap
- MODIS/Terra Vegetation Indices 16-Day L3 Global 250 m (MOD13Q1 v061), via the ORNL DAAC MODIS web service – https://modis.ornl.gov/

## Space Agency Partner & Other Data
- Copernicus Sentinel-2 cloudless mosaic 2020 by EOX IT Services GmbH (contains modified Copernicus Sentinel data 2020), CC BY-NC-SA 4.0 – https://s2maps.eu/
- FAO Irrigation Water Management Training Manual No. 3, Tables 6 and 14 – https://www.fao.org/4/s2022e/s2022e07.htm
- OpenTopoData (srtm30m), used once for the v1 demo slope – https://www.opentopodata.org/
- MapLibre GL JS 4.7.1 (BSD-3-Clause) – https://maplibre.org/
- Chart.js 4 (MIT) – https://www.chartjs.org/
- @neondatabase/serverless (MIT) and Neon Postgres – https://neon.com/
- NumPy, h5py, Pillow (Python libraries)
- Be Vietnam Pro font (SIL Open Font License), Google Fonts

## Use of AI (for the form and the README)
An AI assistant (Claude, Anthropic) helped draft code, data structures and text. The team chose the problem and the approach, made the design decisions, reviewed and tested all code, and checked sourced numbers against their sources. AI-assisted files are listed in the README and in the commit messages. TODO: if images in the slides or video are AI-generated, name the tool here and make sure each image has a visible watermark. No NASA logos, flags or mission identifiers are used.
