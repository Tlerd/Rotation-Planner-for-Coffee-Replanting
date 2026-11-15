# ReRoot – Rotation Planner for Coffee Replanting

NASA Space Apps Challenge 2026 · Challenge: **Field Shift: Adapting Farms with NASA Data**

ReRoot helps smallholder coffee farmers on sloped land in Vietnam's Central Highlands plan the 2–3 year rotation between removing old coffee trees and replanting.

**Live app (v2, 3D map + API + database):** https://coffee-pied-eight.vercel.app/
**Simple version (v1, static):** https://tlerd.github.io/Rotation-Planner-for-Coffee-Replanting/

## v2: 3D terrain planner (folder `web/`, deployed on Vercel)
- **Front end** (`web/index.html`, `web/app.js`, `web/style.css`): MapLibre GL JS 3D map with NASA SRTM terrain on a Sentinel-2 cloudless base. Layers: slope (SRTM 30 m), plant cover (MODIS NDVI), root-zone soil moisture (SMAP L4). Click a spot to see its NASA data, a 10-year climate chart, a rain scenario, priority sliders and the top 3 rotation plans.
- **Back end** (`web/api/`): Vercel serverless functions. `/api/meta` returns the study area, dataset sources and crops. `/api/point?lat=&lon=` returns the cell's elevation, slope, NDVI and soil moisture, and a NASA POWER average year (fetched server side and cached).
- **Database**: Neon Postgres. Tables `cells` (40,000 grid cells), `crops`, `datasets` and `power_cache`. The API creates and seeds them on first use from `web/data/grid.json`. Without a database the API reads the same files.
- **Data pipeline** (`tools/preprocess.py`, run once on a laptop): SRTM GL1 tile N12E108 → Terrarium terrain tiles and slope; SMAP L4 `.h5` and MODIS NDVI → overlay tiles; all → a 200 × 200 grid (about 275 m cells) for 12.30–12.80° N, 108.00–108.50° E.
- **Run locally**: `cd web && npm install`, then `node tools/dev-server.mjs` from the repository root and open http://localhost:3000.

## What it does
1. Loads 10 years (2015–2024) of monthly climate for any farm location from NASA POWER: rain, air temperature and root-zone soil wetness.
2. Matches each rotation crop (maize, peanut, soybean, mung bean, Crotalaria) to that climate. For every allowed sowing month it compares the rain over the crop's season with the crop's water need, and adds root-zone wetness.
3. Builds every 2- and 3-year crop sequence and ranks them with four farmer priority sliders: soil health, erosion control, income and low water risk.
4. Estimates erosion risk as slope × heavy-rain months (months with 200 mm of rain or more from NASA POWER). Higher risk gives erosion control more weight.
5. Shows the top 3 plans with a plain-English reason for each, and warns when a plan uses crop values that are not verified yet.

## Status
- [x] Milestone 1 – Load 10-year monthly climate from NASA POWER
- [x] Milestone 2 – Rotation crop table (`data/crops.json`) with a source for every value or a `TODO` marker
- [x] Crop scoring, 2–3 year sequences, priority sliders, top 3 plans with reasons
- [x] Milestone 3 – Slope and erosion risk (slope slider; SRTM slope precomputed for the demo farm)
- [x] v2 – 3D SRTM terrain, SMAP soil moisture, MODIS NDVI, serverless API, Postgres database, rain scenario
- [ ] Future work – SMAP and NDVI time series, IMERG extreme-rain layer, data beyond the study area

## NASA data
- NASA POWER, Monthly & Annual point API (community AG), parameters `PRECTOTCORR` (precipitation corrected), `T2M` (air temperature at 2 m), `GWETROOT` (root-zone soil wetness) – https://power.larc.nasa.gov/ · API: https://power.larc.nasa.gov/api/temporal/monthly/point
- SRTM (Shuttle Radar Topography Mission) GL1 v003 30 m elevation, tile N12E108 (LP DAAC), used for v2 terrain and slope and for the v1 demo slope in `data/srtm_demo.json` – https://www.earthdata.nasa.gov/data/instruments/srtm
- SMAP L4 Global 3-hourly 9 km Surface and Root Zone Soil Moisture, SPL4SMGP v8, 31 Oct 2026 (NSIDC DAAC) – https://www.earthdata.nasa.gov/data/platforms/space-based-platforms/smap
- MODIS MOD13Q1 v061 250 m 16-day NDVI, period starting 16 Oct 2026, via the ORNL DAAC MODIS web service – https://modis.ornl.gov/

## Other resources
- OpenTopoData public API (`srtm30m` dataset), used once offline to read SRTM elevations – https://www.opentopodata.org/
- FAO Irrigation Water Management Training Manual No. 3, Tables 6 and 14 (crop growing periods and water needs) – https://www.fao.org/4/s2022e/s2022e07.htm
- Horn, B. K. P. (1981), "Hill shading and the reflectance map", Proceedings of the IEEE 69(1) – slope method
- Chart.js (MIT licence) – https://www.chartjs.org/ · loaded from https://cdn.jsdelivr.net/npm/chart.js@4
- Copernicus Sentinel-2 cloudless 2020 by EOX IT Services GmbH (contains modified Copernicus Sentinel data 2020), CC BY-NC-SA 4.0 – https://s2maps.eu/
- MapLibre GL JS 4.7.1 (BSD-3-Clause) – https://maplibre.org/
- Neon Postgres and `@neondatabase/serverless` (MIT) – https://neon.com/
- NumPy, h5py and Pillow (Python), used in `tools/preprocess.py`
- Be Vietnam Pro font (SIL Open Font License), Google Fonts

## Limits and assumptions
- Values marked `"source": "TODO"` in `data/crops.json` are placeholders and are shown in yellow until the team verifies them.
- The scoring thresholds (root-zone wetness 0.3/0.7, heavy-rain month 200 mm, erosion index 20/60) and the order bonuses are the team's own simplifications, not a published method.
- The model uses one main crop per year in the rainy season and does not model waterlogging.

## Use of AI
An AI assistant (Claude, Anthropic) helped draft code and data structures. The team made the design decisions, reviewed and tested every change, and checked every sourced number against its source. AI-assisted files:
- `index.html` – climate loading, crop table, scoring, sequence ranking, reasons, erosion risk
- `web/data/crops.json` – structure and FAO values; all other values are marked `TODO`
- `web/index.html`, `web/app.js`, `web/style.css`, `web/api/*.js`, `web/vercel.json` – v2 app and API
- `tools/preprocess.py`, `tools/dev-server.mjs` – data pipeline and local server
- `docs/submission.md` – draft text for the submission form
- `data/srtm_demo.json` – slope calculation for the demo farm
- `README.md`

Commit messages also state which changes were AI-assisted. No AI-generated images, videos, or NASA logos are used in this repository.
