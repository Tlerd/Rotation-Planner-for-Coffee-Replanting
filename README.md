# ReRoot – Rotation Planner for Coffee Replanting

NASA Space Apps Challenge 2026 · Challenge: **Field Shift: Adapting Farms with NASA Data**

ReRoot helps smallholder coffee farmers on sloped land in Vietnam's Central Highlands plan the 2–3 year rotation between removing old coffee trees and replanting.

**Live app:** https://tlerd.github.io/Rotation-Planner-for-Coffee-Replanting/

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
- [ ] Future work – live SRTM slope for any point, SMAP soil moisture, IMERG extreme rain, NDVI

## NASA data
- NASA POWER, Monthly & Annual point API (community AG), parameters `PRECTOTCORR` (precipitation corrected), `T2M` (air temperature at 2 m), `GWETROOT` (root-zone soil wetness) – https://power.larc.nasa.gov/ · API: https://power.larc.nasa.gov/api/temporal/monthly/point
- SRTM (Shuttle Radar Topography Mission) GL1 30 m elevation, used for the demo farm slope in `data/srtm_demo.json` – https://www.earthdata.nasa.gov/data/instruments/srtm

## Other resources
- OpenTopoData public API (`srtm30m` dataset), used once offline to read SRTM elevations – https://www.opentopodata.org/
- FAO Irrigation Water Management Training Manual No. 3, Tables 6 and 14 (crop growing periods and water needs) – https://www.fao.org/4/s2022e/s2022e07.htm
- Horn, B. K. P. (1981), "Hill shading and the reflectance map", Proceedings of the IEEE 69(1) – slope method
- Chart.js (MIT licence) – https://www.chartjs.org/ · loaded from https://cdn.jsdelivr.net/npm/chart.js@4

## Limits and assumptions
- Values marked `"source": "TODO"` in `data/crops.json` are placeholders and are shown in yellow until the team verifies them.
- The scoring thresholds (root-zone wetness 0.3/0.7, heavy-rain month 200 mm, erosion index 20/60) and the order bonuses are the team's own simplifications, not a published method.
- The model uses one main crop per year in the rainy season and does not model waterlogging.

## Use of AI
An AI assistant (Claude, Anthropic) helped draft code and data structures. The team made the design decisions, reviewed and tested every change, and checked every sourced number against its source. AI-assisted files:
- `index.html` – climate loading, crop table, scoring, sequence ranking, reasons, erosion risk
- `data/crops.json` – structure and FAO values; all other values are marked `TODO`
- `data/srtm_demo.json` – slope calculation for the demo farm
- `README.md`

Commit messages also state which changes were AI-assisted. No AI-generated images, videos, or NASA logos are used in this repository.
