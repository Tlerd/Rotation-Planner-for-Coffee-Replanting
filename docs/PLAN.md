# ReRoot project plan

## Goal
ReRoot helps smallholder coffee farmers on sloped land in Vietnam's Central Highlands. It helps them choose a 2–3 year crop rotation between removing old coffee trees and replanting.

- Event: NASA Space Apps Challenge 2026.
- Challenge: Field Shift: Adapting Farms with NASA Data.
- Team: bio_find. Member: Đức Anh (GitHub: Tlerd).
- Deadline: Sunday 15 Nov 2026, 23:59 (Asia/Saigon). First submission by 20:00, final by 22:00.
- Demo farm: 12.5615° N, 108.2817° E (Dak Lak).

## Deliverables
| Deliverable | Location |
|---|---|
| v2 app (3D map, API, database) | https://coffee-pied-eight.vercel.app/ |
| v1 app (static) | https://tlerd.github.io/Rotation-Planner-for-Coffee-Replanting/ |
| Slide deck, 7 slides (web) | https://coffee-pied-eight.vercel.app/slides.html |
| Slide deck (PDF) | `docs/ReRoot-slides.pdf` |
| Submission form text | `docs/submission.md` |
| Code | https://github.com/Tlerd/Rotation-Planner-for-Coffee-Replanting |

## Architecture
- **v1** (`index.html`, repository root): one static page on GitHub Pages. It calls NASA POWER from the browser.
- **v2** (`web/`, Vercel project `coffee`, Root Directory `web`):
  - Front end: `web/index.html`, `web/app.js`, `web/style.css`. MapLibre GL JS 4.7.1 draws 3D SRTM terrain on a Sentinel-2 cloudless base, with slope, NDVI and SMAP layers.
  - Back end: `web/api/meta.js`, `web/api/point.js`, shared code in `web/api/_lib.js`.
  - Database: Neon Postgres `reroot-db` (Singapore, free plan), env `DATABASE_URL`. Tables: `cells`, `crops`, `datasets`, `power_cache`. The API creates and seeds them on first use.
  - Data pipeline: `tools/preprocess.py` (run once on a laptop). Local server: `tools/dev-server.mjs`.

## Data
| Data | Source | Use |
|---|---|---|
| NASA POWER monthly (PRECTOTCORR, T2M, GWETROOT), 2015–2024 | power.larc.nasa.gov API | Climate of each point, crop water fit, heavy-rain months |
| SRTM GL1 v003 30 m, tile N12E108 | LP DAAC (Earthdata login) | 3D terrain, slope, erosion risk |
| SMAP L4 SPL4SMGP v8, 31 Oct 2026 | NSIDC (Earthdata login) | Root-zone and surface soil moisture |
| MODIS MOD13Q1 v061 NDVI, 16 Oct 2026 | ORNL DAAC MODIS web service | Plant cover |
| Sentinel-2 cloudless 2020 (EOX) | s2maps.eu | Base map (partner data) |
| FAO Irrigation Water Management Manual No. 3 | fao.org | Crop water needs and growing days |
| Crop table | `web/data/crops.json` | Values with a source, or `"source": "TODO"` |

Study area for detailed data: 12.30–12.80° N, 108.00–108.50° E, as a 200 × 200 grid of about 275 m cells.

## Method
1. For each crop, try every allowed sowing month. Compare the rain over the crop's season with its water need, and add root-zone wetness. Keep the best month.
2. Build every 2- and 3-year sequence, with no crop two years in a row (100 sequences).
3. Score each sequence with four farmer priorities: soil health, erosion control, income, low water risk.
4. Erosion index = slope % × months with 200 mm of rain or more. A higher index gives erosion control more weight (0.5× to 1.5×).
5. Add small bonuses for dense cover first and a nitrogen-fixing crop last.
6. Show the top 3 plans, one per crop set, with a plain-English reason.

The thresholds are the team's own simplifications. The app and the README say so.

## Work parts
| # | Part | Status |
|---|---|---|
| 1 | Push repository, enable GitHub Pages, check NASA POWER parsing | Done |
| 2 | Milestone 2: crop table with sources | Done (29 values still TODO) |
| 3 | Crop scoring, sequences, priority sliders, top 3 with reasons | Done |
| 4 | Milestone 3: slope and erosion risk | Done |
| 5 | README: NASA data, other resources, Use of AI | Done |
| 6 | v2: NASA data pipeline (SRTM, SMAP, MODIS) | Done |
| 7 | v2: API, Neon database, 3D map, deploy on Vercel | Done |
| 8 | Slide deck (7 slides) and PDF | Done |
| 9 | Fill and save the submission form | Done |
| 10 | Submit for Judging (team owner clicks the button) | To do, by 20:00 |
| 11 | Verify TODO crop values with a Vietnamese extension document | To do |
| 12 | Start the demo on a steep spot or the real farm | To do |
| 13 | Test v2 on a real phone | To do |
| 14 | Optional: IMERG extreme-rain layer | Optional |
| 15 | Optional: SMAP and NDVI time series | Optional |
| 16 | Optional: Vietnamese interface | Optional |
| 17 | Final re-submission after changes | To do, by 22:00 |

Details and dates are in `docs/PROGRESS.md`.

## Rules for this project
- All UI text, README, slides and commit messages are in English.
- No NASA logos, flags or mission identifiers. AI-generated images need a visible watermark.
- Mark AI help in commit messages and in the README "Use of AI" section.
- Every agronomic number has a source, or `"source": "TODO"`. Do not invent citations.
- Code style: one comment that says why, directly above each line or 2–3 line block.
- Commit after each milestone and push.
