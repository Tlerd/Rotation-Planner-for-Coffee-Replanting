# ReRoot demo deck (7 slides)

Rules from the Space Apps guide: 7 slides or fewer including the title, public link with no login, English only. Include team name, member names, challenge, a project image, the user experience, and how NASA and partner data made the project possible. No NASA logos, flags or mission identifiers. AI-generated images need a visible watermark. No recognizable people under 18.

Images in `docs/img/` are real screenshots of the live app, so they need no AI watermark.

---

## Slide 1: Title

**On the slide**
- ReRoot
- Plan the years between old coffee and new coffee, with NASA data
- Team: bio_find · Member: Đức Anh (GitHub: Tlerd)
- NASA Space Apps Challenge 2026 · Challenge: Field Shift: Adapting Farms with NASA Data
- Image: `docs/img/01-3d-slope.jpg`
- Link: coffee-pied-eight.vercel.app

**Speaker note**
ReRoot helps coffee farmers on hillsides decide what to grow while they replant.

---

## Slide 2: The problem

**On the slide**
- Coffee trees in Vietnam's Central Highlands are ageing and must be replaced.
- Farmers are advised to rotate other crops for 2–3 years before replanting, so the soil can recover.
- Most smallholder farms are on slopes. From June to October, heavy rain washes bare soil away.
- The question: which crops, in which order, on my hillside?
- Image (optional): your own photo of the farm. Make sure no recognizable child is in it.

**Speaker note**
I own a hillside coffee farm. When the old trees come out, the soil is bare just as the rainy season starts.

---

## Slide 3: What ReRoot does

**On the slide**
1. Click your hillside on a 3D map.
2. See your spot's NASA data: slope, plant cover, soil moisture, rain and temperature.
3. Set what matters to you: soil health, erosion control, income, water risk.
4. Get the 3 best 2–3 year rotation plans, each with a plain-English reason.
- Image: `docs/img/02-plans.jpg`

**Speaker note**
Every number on screen shows where it came from. Plans that use unverified crop values are flagged in yellow.

---

## Slide 4: How NASA data made it possible

**On the slide**
| NASA data | What ReRoot uses it for |
|---|---|
| SRTM 30 m elevation | 3D terrain, slope of every 30 m cell, erosion risk |
| SMAP L4 soil moisture (9 km) | Root-zone and surface moisture of the field now |
| MODIS NDVI (250 m) | How much plant cover protects the soil |
| NASA POWER (2015–2024) | Monthly rain, temperature and root-zone wetness for each crop's season |

- Partner data: Copernicus Sentinel-2 cloudless image (ESA) as the base map.
- Image: `docs/img/03-smap.jpg` and `docs/img/04-ndvi.jpg` side by side

**Speaker note**
Without SRTM we could not see which fields are steep. Without POWER and SMAP we could not tell if a crop gets enough water.

---

## Slide 5: How the plan is chosen

**On the slide**
- For each crop, find the sowing month where NASA rain over the season best covers the crop's water need (FAO values).
- Build all 100 sequences of 2–3 years, never the same crop twice in a row.
- Score each sequence with the farmer's priorities.
- Erosion risk = slope × months with 200 mm of rain or more. A steeper, wetter field gives erosion control more weight.
- Bonus for dense ground cover first and a nitrogen-fixing crop last, before coffee goes back in.
- What-if: average, 30 % wetter or 30 % drier year.

**Speaker note**
On a 25 % slope with 5 heavy-rain months, ReRoot starts with the green manure Crotalaria. On gentle land with income as the priority, it starts with peanut.

---

## Slide 6: Built to be checked

**On the slide**
- Live app: 3D map (MapLibre) · serverless API (Vercel) · Postgres database (Neon) with 40,000 grid cells.
- Python pipeline turns raw NASA files (HDF5, SRTM tiles) into map layers and the database grid.
- Open code: github.com/Tlerd/Rotation-Planner-for-Coffee-Replanting
- Honest limits: some crop values are still TODO; SMAP and NDVI are single dates; the detailed area is 55 × 55 km in Dak Lak.
- AI use: an AI assistant helped draft code and text; the team made the decisions and checked the results.

**Speaker note**
We show what is verified and what is not, so extension workers can trust and improve it.

---

## Slide 7: Impact and next steps

**On the slide**
- Less soil lost on slopes during the replanting years.
- Better soil when coffee goes back in.
- Plans a farmer can understand and discuss with an extension worker.
- Next: verify crop values with local extension guides; add SMAP and NDVI time series and IMERG extreme rain; cover all coffee provinces; Vietnamese language.
- Try it: coffee-pied-eight.vercel.app
- Image: `docs/img/01-3d-slope.jpg` (cropped to the map)

**Speaker note**
ReRoot turns NASA Earth data into one clear decision for a farmer standing on a hillside.

---

## 30-second video script (alternative to the deck)

Subtitles in English. Record the live app.

| Time | Screen | Subtitle |
|---|---|---|
| 0–5 s | 3D map with slope layer | "Old coffee trees must be replaced. On slopes, the bare soil washes away." |
| 5–11 s | Click a steep hillside; panel fills | "ReRoot reads NASA data for my field: SRTM slope, SMAP soil moisture, MODIS plant cover, POWER rain." |
| 11–18 s | Switch layers: SMAP, then NDVI | "Every number shows where it came from." |
| 18–25 s | Move the income and erosion sliders; plans change | "I set what matters to me. ReRoot ranks 100 rotation plans." |
| 25–30 s | Top plan with its reason | "Start with cover crop, end with nitrogen-fixing beans, then replant. coffee-pied-eight.vercel.app" |
