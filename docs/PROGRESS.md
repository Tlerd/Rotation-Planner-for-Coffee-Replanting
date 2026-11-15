# ReRoot progress

Last update: 15 Nov 2026, 17:45 (Asia/Saigon). Plan and work parts: `docs/PLAN.md`.

## Next
1. **Submit for Judging** on the Space Apps project page before 20:00. The team owner must click it.
2. Verify the TODO crop values in `web/data/crops.json` with a Vietnamese extension document.
3. Start the v2 demo on a steep spot or on the real farm coordinates.
4. Test v2 on a real phone.
5. Optional, only after the first submission: IMERG layer, SMAP and NDVI time series, Vietnamese interface.
6. Re-submit by 22:00 if anything changed.

## Open issues
- 29 crop values are marked `"source": "TODO"`: sowing months, nitrogen fixing, organic matter, erosion cover, income, and all mung bean and Crotalaria numbers.
- The demo farm cell has a 5 % slope. The study area averages 16 %. Use a steeper spot when you record or present.
- SMAP and NDVI are single dates (31 Oct 2026 and 16 Oct 2026).
- The v2 map was not tested on a real phone. The page has no horizontal scroll at 375 px.
- The use-of-SI answer in the form does not include "Ideation". Change it if the team thinks it applies.

## Completed

### 14 Nov 2026
- [x] **Milestone 1** (`3374f0f`): v1 loads 10-year monthly NASA POWER climate (rain, temperature, root-zone wetness) and draws a chart and a table.
- [x] **Push and GitHub Pages**: pushed `main`, enabled Pages (main, root) with `gh api`. Checked the live page. The POWER response shape matched the code, so no fix was needed.
- [x] **Milestone 2** (`4570ab4`): crop table with five crops. FAO sources for water need and growing days of maize, peanut and soybean. All other values marked TODO and shown in yellow.
- [x] **Scoring and plans** (`f7d4ff8`): crop water fit from NASA rain and root-zone wetness, 100 sequences, four priority sliders, top 3 plans with reasons.
- [x] **Milestone 3** (`b52bec7`): slope slider and erosion index (slope × heavy-rain months). Demo-farm slope from SRTM computed offline, because the elevation API has no CORS header.

### 15 Nov 2026
- [x] **README** (`3b5cf70`): features, NASA data with links, other resources, limits, Use of AI.
- [x] **NASA data downloads**: SRTM tile N12E108 through Earthdata in Chrome, SMAP L4 `.h5` (already downloaded), MODIS NDVI from the ORNL DAAC web service.
- [x] **v2 app** (`b2227c2`): data pipeline, terrain and overlay tiles, 200 × 200 grid, serverless API, 3D map front end, rain scenario.
- [x] **Vercel and Neon** (`96fd580`, `d54f3e0`): Root Directory set to `web`. Created Neon database `reroot-db` and connected it. Fixed data paths for Vercel. Live API reads 40,000 cells from Postgres and caches NASA POWER answers.
- [x] **Phone layout and hillshade** (`5f1879f`): compact map controls on small screens, separate DEM source for hillshade.
- [x] **README and submission draft for v2** (`9498c8c`).
- [x] **Slide content and video script** (`e27f9a1`): `docs/slides.md`, 4 app screenshots in `docs/img/`.
- [x] **Slide deck** (`e62aa89`, `4bd7af7`): `web/slides.html` (public on Vercel) and `docs/ReRoot-slides.pdf`, 7 slides, team bio_find.
- [x] **Submission form** (`270fc61`): all fields entered and saved at 17:38. All four sections show Complete. Not yet submitted for judging.
- [x] **Plan and progress files**: `docs/PLAN.md` and this file.

## How to update this file
- Move an item from "Next" to "Completed" when it is done, with the date and the commit hash.
- Add new problems to "Open issues". Remove them when they are fixed.
