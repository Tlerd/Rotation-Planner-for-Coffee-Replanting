// ReRoot v2 front end: 3D SRTM terrain, NASA layers, click a spot, rank rotation plans.

// ---------- 1. CONSTANTS AND STATE ----------

// Month labels and average days per month (POWER rain is mm/day, crops need mm per season)
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
// Demo farm: the first spot shown, so the page is never empty
const DEMO = { lat: 12.5615, lon: 108.2817 };
// Monthly rain at or above this counts as a heavy-rain month (team assumption)
const HEAVY_RAIN_MM = 200;
// Legend colours must match the ramps in tools/preprocess.py
const LEGENDS = {
  slope: { title: "Slope, %", stops: ["#2e7d32", "#cddc39", "#ff9800", "#e53935", "#7b1fa2"], ends: ["0", "8", "15", "25", "40+"] },
  ndvi: { title: "NDVI, Oct 2026 (bare to dense)", stops: ["#8c510a", "#dfc27d", "#7fbc41", "#006837"], ends: ["0", "0.3", "0.6", "0.9"] },
  smap: { title: "Root-zone soil moisture, m³/m³, 31 Oct 2026", stops: ["#d7b478", "#a6cee3", "#1f78b4", "#08306b"], ends: ["0.10", "0.25", "0.40", "0.55"] },
  none: { title: "Sentinel-2 cloudless satellite image", stops: [], ends: [] }
};
// The four farmer priorities, in slider order, with the words used in reasons
const CRITERIA = [
  { key: "soil", label: "soil health" },
  { key: "erosion", label: "erosion control" },
  { key: "income", label: "income" },
  { key: "water", label: "low water risk" }
];
// Latest answers from the API; the planner runs only when both are present
let meta = null;
let spot = null;
let chart = null;
let marker = null;

// Small helpers used everywhere
const $ = id => document.getElementById(id);
const clamp = v => Math.min(1, Math.max(0, v));
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Shows progress or an error in the panel's status line
function setStatus(text, isError = false) {
  $("status").textContent = text;
  $("status").className = isError ? "status error" : "status";
}

// ---------- 2. MAP: SATELLITE + SRTM 3D TERRAIN + NASA OVERLAYS ----------

// Satellite base and our own SRTM terrain tiles (built by tools/preprocess.py, served from /tiles)
const map = new maplibregl.Map({
  container: "map",
  center: [DEMO.lon, DEMO.lat],
  zoom: 12.3,
  pitch: 62,
  bearing: -25,
  maxPitch: 80,
  style: {
    version: 8,
    sources: {
      s2: {
        type: "raster", tileSize: 256, maxzoom: 15,
        tiles: ["https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg"],
        attribution: "Sentinel-2 cloudless by EOX (Copernicus Sentinel data 2020) · Terrain: NASA SRTM"
      },
      dem: { type: "raster-dem", tiles: [location.origin + "/tiles/dem/{z}/{x}/{y}.png"], encoding: "terrarium", tileSize: 256, minzoom: 8, maxzoom: 12 }
    },
    layers: [
      { id: "s2", type: "raster", source: "s2" },
      // Hillshade makes ridges and gullies readable even when looking straight down
      { id: "hillshade", type: "hillshade", source: "dem", paint: { "hillshade-exaggeration": 0.35, "hillshade-shadow-color": "#1f3b2d" } }
    ],
    terrain: { source: "dem", exaggeration: 1.5 },
    sky: {}
  }
});
// Zoom/rotate/tilt buttons for people who do not know the mouse gestures
map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

// Adds the three NASA overlays as map tiles (tiles drape on 3D terrain reliably; single images did not)
function addOverlays(bbox) {
  const [w, s, e, n] = bbox;
  const corners = [[w, n], [e, n], [e, s], [w, s]];
  // Slope has 30 m detail up to zoom 13; NDVI (250 m) and SMAP (9 km) stop at 12
  const maxzoom = { slope: 13, ndvi: 12, smap: 12 };
  for (const id of ["slope", "ndvi", "smap"]) {
    map.addSource(id, { type: "raster", tiles: [`${location.origin}/tiles/${id}/{z}/{x}/{y}.png`], tileSize: 256, minzoom: 9, maxzoom: maxzoom[id], bounds: bbox });
    map.addLayer({ id, type: "raster", source: id, paint: { "raster-opacity": 0.6 }, layout: { visibility: "none" } }, "hillshade");
  }
  // Outline of the study area so people know where the detailed data stops
  map.addSource("area", { type: "geojson", data: { type: "Feature", geometry: { type: "LineString", coordinates: [...corners, corners[0]] } } });
  map.addLayer({ id: "area", type: "line", source: "area", paint: { "line-color": "#fbfcfa", "line-width": 2, "line-dasharray": [2, 2] } });
  showLayer("slope");
}

// Turns one overlay on, the others off, and redraws the legend
function showLayer(which) {
  for (const id of ["slope", "ndvi", "smap"]) {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", id === which ? "visible" : "none");
  }
  const L = LEGENDS[which];
  $("legend").innerHTML = L.stops.length
    ? `<div>${L.title}</div><div class="bar" style="background:linear-gradient(90deg,${L.stops.join(",")})"></div><div class="ends">${L.ends.map(t => `<span>${t}</span>`).join("")}</div>`
    : `<div>${L.title}</div>`;
}

// ---------- 3. API CALLS ----------

// Study area, dataset sources and crops, from the backend (Postgres when attached)
async function loadMeta() {
  const res = await fetch("/api/meta");
  if (!res.ok) throw new Error(`/api/meta returned HTTP ${res.status}`);
  return res.json();
}

// Terrain, plant cover, soil moisture and climate for one point
async function loadPoint(lat, lon) {
  const res = await fetch(`/api/point?lat=${lat.toFixed(5)}&lon=${lon.toFixed(5)}`);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || `/api/point returned HTTP ${res.status}`);
  return body;
}

// ---------- 4. CLICK A SPOT ----------

// Loads everything for a point, moves the marker and redraws the panel
async function selectSpot(lat, lon, fly = true) {
  setStatus(`Reading NASA data for ${lat.toFixed(4)}, ${lon.toFixed(4)}…`);
  // A cherry-red marker shows which spot the panel describes
  if (!marker) marker = new maplibregl.Marker({ color: "#b3122a" });
  marker.setLngLat([lon, lat]).addTo(map);
  if (fly && !reduceMotion) map.easeTo({ center: [lon, lat], duration: 900 });
  try {
    spot = await loadPoint(lat, lon);
    // Use the SRTM slope of the cell as the starting slope; outside the area keep the slider value
    if (spot.cell && spot.cell.slope_pct != null) $("slope").value = spot.cell.slope_pct;
    drawFacts();
    drawChart();
    $("spot").hidden = $("climateBlock").hidden = $("planBlock").hidden = false;
    updatePlans();
    const store = spot.cell ? `cell read from ${spot.cell.store === "postgres" ? "the Postgres database" : "the bundled grid file"}` : "outside the detailed study area";
    setStatus(`Done: ${store}; climate ${spot.climate.cached ? "from cache" : "fresh from NASA POWER"}.`);
  } catch (err) {
    setStatus(`Could not load this spot: ${err.message}. Try again, or click inside the dashed area.`, true);
  }
}

// Key numbers for the spot, each with its source in plain words
function drawFacts() {
  const c = spot.cell;
  $("spotWhere").textContent = `${spot.lat.toFixed(4)}° N, ${spot.lon.toFixed(4)}° E` + (c ? "" : " (outside the study area: only climate is available)");
  const fmt = (v, d, unit) => (v == null ? "–" : `${v.toFixed(d)}${unit}`);
  const rows = c ? [
    ["Elevation", fmt(c.elevation_m, 0, " m"), "SRTM"],
    ["Slope", fmt(c.slope_pct, 1, " %"), "SRTM 30 m"],
    ["Plant cover", fmt(c.ndvi, 2, " NDVI"), "MODIS, Oct 2026"],
    ["Root-zone moisture", fmt(c.sm_rootzone, 2, " m³/m³"), "SMAP L4, 31 Oct 2026"],
    ["Surface moisture", fmt(c.sm_surface, 2, " m³/m³"), "SMAP L4, 31 Oct 2026"]
  ] : [];
  // Rainy-season total helps farmers compare with what they know
  const yearRain = spot.climate.rain_mm_day.reduce((s, v, i) => s + (v ?? 0) * DAYS[i], 0);
  rows.push(["Rain per year", `${Math.round(yearRain)} mm`, "NASA POWER 2015–2024"]);
  $("facts").innerHTML = rows.map(([k, v, src]) => `<dt>${k}</dt><dd>${v} <small>${src}</small></dd>`).join("");
}

// Monthly rain bars (mm per month, scenario applied) and temperature line
function drawChart() {
  const k = Number($("scenario").value);
  const rain = spot.climate.rain_mm_day.map((v, i) => Math.round((v ?? 0) * DAYS[i] * k));
  if (chart) chart.destroy();
  chart = new Chart($("climateChart"), {
    data: {
      labels: MONTHS,
      datasets: [
        { type: "bar", label: "Rain, mm/month", data: rain, backgroundColor: "#2f5a44", yAxisID: "y" },
        { type: "line", label: "Temperature, °C", data: spot.climate.t2m_c, borderColor: "#8c3b22", pointRadius: 2, yAxisID: "t" }
      ]
    },
    options: {
      animation: reduceMotion ? false : { duration: 300 },
      plugins: { legend: { labels: { boxWidth: 12 } } },
      scales: { y: { position: "left" }, t: { position: "right", grid: { drawOnChartArea: false } } }
    }
  });
}

// ---------- 5. SCORE CROPS, BUILD AND RANK SEQUENCES ----------

// Rain per month in mm for the chosen scenario
function rainMm() {
  const k = Number($("scenario").value);
  return spot.climate.rain_mm_day.map((v, i) => (v ?? 0) * DAYS[i] * k);
}

// Best allowed sowing month for one crop: rain over its season vs its water need, plus root-zone wetness
function cropFit(crop, rain) {
  const g = crop.growingDays.value;
  const months = Math.max(1, Math.round((g[0] + g[1]) / 2 / 30));
  const [lo, hi] = crop.waterNeedMm.value;
  // SMAP gives today's moisture for the cell; POWER gives the typical month-by-month pattern
  const wetness = spot.climate.gwetroot;
  let best = null;
  for (const m of crop.sowingMonths.value) {
    let r = 0, w = 0;
    // Wrap around the year so a late sowing can run into the next January
    for (let i = 0; i < months; i++) { const idx = (m - 1 + i) % 12; r += rain[idx]; w += wetness[idx] ?? 0; }
    w /= months;
    // 0 when rain is half the minimum need or less, 1 when it reaches the maximum need
    const waterFit = clamp((r - 0.5 * lo) / (hi - 0.5 * lo));
    // GWETROOT 0.3 counts as dry and 0.7 as well-watered
    const wetFit = clamp((w - 0.3) / 0.4);
    const safety = 0.7 * waterFit + 0.3 * wetFit;
    if (!best || safety > best.safety) best = { month: m, months, rain: r, safety };
  }
  return best;
}

// Four 0–1 scores per crop, one per priority
function cropScores(crop, fit) {
  return {
    soil: (crop.fixesNitrogen.value ? 0.5 : 0) + 0.5 * (crop.organicMatter.value - 1) / 2,
    erosion: (crop.erosionCover.value - 1) / 2,
    income: (crop.incomeLevel.value - 1) / 2,
    water: fit.safety
  };
}

// Every 2- and 3-year order of crops, never the same crop two years running
function buildSequences(ids) {
  const out = [];
  const grow = seq => {
    if (seq.length >= 2) out.push(seq);
    if (seq.length === 3) return;
    for (const id of ids) if (id !== seq[seq.length - 1]) grow([...seq, id]);
  };
  grow([]);
  return out;
}

// Weighted ranking; best plan per crop set only, so the top 3 really differ
function rankSequences(byId, weights) {
  const allZero = !Object.values(weights).some(Boolean);
  const w = k => (allZero ? 1 : weights[k]);
  const sumW = CRITERIA.reduce((s, { key }) => s + w(key), 0);
  const ranked = buildSequences(Object.keys(byId)).map(seq => {
    const avg = {};
    for (const { key } of CRITERIA) avg[key] = seq.reduce((s, id) => s + byId[id].scores[key], 0) / seq.length;
    let total = CRITERIA.reduce((s, { key }) => s + w(key) * avg[key], 0) / sumW;
    // Bonus: dense cover first (slope is bare after coffee removal); N-fixer last (before replanting)
    const startsCovered = byId[seq[0]].crop.erosionCover.value === 3;
    const endsWithN = byId[seq[seq.length - 1]].crop.fixesNitrogen.value;
    total += (startsCovered ? 0.03 : 0) + (endsWithN ? 0.03 : 0);
    return { seq, avg, total, startsCovered, endsWithN };
  }).sort((a, b) => b.total - a.total);
  const seen = new Set();
  return ranked.filter(r => { const k = [...new Set(r.seq)].sort().join("+"); if (seen.has(k)) return false; seen.add(k); return true; });
}

// Erosion index = slope % × heavy-rain months; thresholds 20 and 60 are team assumptions
function erosionRisk(rain) {
  const slope = Number($("slope").value);
  const heavy = MONTHS.filter((_, i) => rain[i] >= HEAVY_RAIN_MM);
  const index = slope * heavy.length;
  const level = index >= 60 ? "high" : index >= 20 ? "medium" : "low";
  return { slope, heavy, index, level, factor: clamp(index / 60) };
}

// Plain-English reason: what to sow each year and why it suits these priorities
function explain(plan, byId, weights, risk) {
  const short = c => c.name.split(" (")[0];
  const years = plan.seq.map((id, i) => {
    const { crop, fit } = byId[id];
    return `Year ${i + 1}: <b>${short(crop)}</b>, sow in ${MONTHS[fit.month - 1]}: about ${Math.round(fit.rain)} mm of rain over its ${fit.months}-month season (needs ${crop.waterNeedMm.value.join("–")} mm).`;
  });
  const crops = plan.seq.map(id => byId[id].crop);
  const names = list => [...new Set(list.map(short))].join(" and ") || "none of these crops";
  const facts = {
    soil: `${names(crops.filter(c => c.fixesNitrogen.value))} fix nitrogen`,
    erosion: `${names(crops.filter(c => c.erosionCover.value >= 2))} keep the slope covered`,
    income: `${names(crops.filter(c => c.incomeLevel.value >= 2))} bring cash income`,
    water: plan.avg.water > 0.8 ? "the rain covers each crop's water need" : "some crops may run short of rain in their season"
  };
  const top = [...CRITERIA].sort((a, b) => weights[b.key] * plan.avg[b.key] - weights[a.key] * plan.avg[a.key]);
  const weakest = [...CRITERIA].sort((a, b) => plan.avg[a.key] - plan.avg[b.key])[0];
  let why = `Strong on ${top[0].label} and ${top[1].label}: ${facts[top[0].key]}, and ${facts[top[1].key]}. Trade-off: weaker on ${weakest.label}.`;
  if (plan.startsCovered) why += " It starts with dense ground cover while the slope is bare.";
  if (plan.endsWithN) why += " It ends with a nitrogen-fixing crop before coffee goes back in.";
  if (risk.level !== "low") why += ` Erosion risk here is ${risk.level}, so ground cover counts for more.`;
  if (crops.some(c => Object.values(c).some(f => f && f.source === "TODO"))) why += ` <span class="todo">Some crop values in this plan are not verified yet (TODO).</span>`;
  return `${years.join("<br>")}<br>${why}`;
}

// Recomputes erosion and the top 3 plans from the spot, sliders and scenario
function updatePlans() {
  if (!meta || !spot) return;
  const rain = rainMm();
  const byId = {};
  for (const crop of meta.crops) { const fit = cropFit(crop, rain); byId[crop.id] = { crop, fit, scores: cropScores(crop, fit) }; }
  const weights = {};
  for (const { key } of CRITERIA) { weights[key] = Number($(`w_${key}`).value); $(`w_${key}_out`).textContent = weights[key]; }
  const risk = erosionRisk(rain);
  $("slope_out").textContent = risk.slope;
  $("erosionText").innerHTML = `Erosion risk: <b>${risk.level}</b>. Index ${risk.index.toFixed(1)} = slope ${risk.slope} % × ${risk.heavy.length} heavy-rain months (${risk.heavy.join(", ") || "none"}).`;
  // Steeper, wetter land weights erosion control up to 1.5×; flat land down to 0.5×
  const eff = { ...weights, erosion: weights.erosion * (0.5 + risk.factor) };
  const top = rankSequences(byId, eff).slice(0, 3);
  $("plans").innerHTML = top.map(p => `<li><div class="seq">${p.seq.map(id => byId[id].crop.name.split(" (")[0]).join(" → ")} <span class="score">score ${Math.round(p.total * 100)}</span></div>${explain(p, byId, eff, risk)}</li>`).join("");
}

// ---------- 6. WIRE IT UP ----------

// Re-rank live while sliders move; the scenario also redraws the chart
for (const { key } of CRITERIA) $(`w_${key}`).addEventListener("input", updatePlans);
$("slope").addEventListener("input", updatePlans);
$("scenario").addEventListener("change", () => { drawChart(); updatePlans(); });
// Layer radio buttons and terrain exaggeration
document.querySelectorAll('input[name="layer"]').forEach(r => r.addEventListener("change", e => showLayer(e.target.value)));
$("exag").addEventListener("input", e => { map.setTerrain({ source: "dem", exaggeration: Number(e.target.value) }); $("exagOut").textContent = `${e.target.value}×`; });
// Click anywhere on the land to plan that spot
map.on("click", e => selectSpot(e.lngLat.lat, e.lngLat.lng));

// On load: fetch meta, add overlays, list datasets, then show the demo farm
map.on("load", async () => {
  try {
    meta = await loadMeta();
    addOverlays(meta.bbox);
    $("datasets").innerHTML = Object.values(meta.datasets).map(d => `<li>${d}</li>`).join("")
      + "<li>NASA POWER monthly point API, community AG: PRECTOTCORR, T2M, GWETROOT, 2015–2024</li>"
      + Object.values(meta.cropSources).map(s => `<li><a href="${s.url}" target="_blank" rel="noopener">${s.title}</a></li>`).join("");
    setStatus(`Study area loaded: ${meta.cells.toLocaleString()} cells in ${meta.store === "postgres" ? "Postgres" : "the grid file"}.`);
    await selectSpot(DEMO.lat, DEMO.lon, false);
  } catch (err) {
    setStatus(`Could not load the study area: ${err.message}. Reload the page to try again.`, true);
  }
});
