// GET /api/point?lat=..&lon=..  ->  NASA terrain, vegetation and soil moisture for the clicked cell,
// plus a 10-year NASA POWER monthly climate for the point.
import { sql, ensureDb, locate, grid, FIELDS } from "./_lib.js";

const POWER_URL = "https://power.larc.nasa.gov/api/temporal/monthly/point";
// 10 complete years give a stable average year
const START_YEAR = 2015, END_YEAR = 2024;

// Averages POWER's {"YYYYMM": value} series into 12 months, skipping month 13 (annual) and fill values
function monthlyAverage(series, fill) {
  const buckets = Array.from({ length: 12 }, () => []);
  for (const [key, v] of Object.entries(series)) {
    const m = parseInt(key.slice(4), 10);
    if (m >= 1 && m <= 12 && v !== fill) buckets[m - 1].push(v);
  }
  return buckets.map(b => (b.length ? +(b.reduce((s, v) => s + v, 0) / b.length).toFixed(3) : null));
}

// Calls NASA POWER (server side, so no CORS limits) and returns the average year
async function fetchPower(lat, lon) {
  const q = new URLSearchParams({
    parameters: "PRECTOTCORR,T2M,GWETROOT", community: "AG",
    latitude: lat, longitude: lon, start: START_YEAR, end: END_YEAR, format: "JSON"
  });
  const res = await fetch(`${POWER_URL}?${q}`);
  if (!res.ok) throw new Error(`NASA POWER returned HTTP ${res.status}`);
  const d = await res.json();
  const p = d.properties.parameter;
  const fill = d.header?.fill_value ?? -999;
  return {
    years: `${START_YEAR}-${END_YEAR}`,
    rain_mm_day: monthlyAverage(p.PRECTOTCORR, fill),
    t2m_c: monthlyAverage(p.T2M, fill),
    gwetroot: monthlyAverage(p.GWETROOT, fill),
    source: "NASA POWER monthly point API, community AG (PRECTOTCORR, T2M, GWETROOT)"
  };
}

// Uses the database cache when available; POWER's grid is coarse, so 2 decimals is a safe cache key
async function climate(lat, lon) {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  if (sql) {
    const hit = await sql`SELECT doc FROM power_cache WHERE key = ${key}`;
    if (hit.length) return { ...hit[0].doc, cached: true };
  }
  const doc = await fetchPower(lat, lon);
  if (sql) await sql`INSERT INTO power_cache (key, doc) VALUES (${key}, ${JSON.stringify(doc)}::jsonb) ON CONFLICT (key) DO NOTHING`;
  return { ...doc, cached: false };
}

// Reads one cell from Postgres, or from the bundled grid file if no database is attached
async function cell(lat, lon) {
  const loc = locate(lat, lon);
  if (!loc) return null;
  if (sql) {
    const rows = await sql`SELECT * FROM cells WHERE id = ${loc.id}`;
    if (rows.length) return { ...rows[0], store: "postgres" };
  }
  const g = grid();
  const out = { ...loc, store: "file" };
  for (const f of FIELDS) out[f] = g[f][loc.id];
  return out;
}

export default async function handler(req, res) {
  // Parse and validate the coordinates before doing any work
  const lat = parseFloat(req.query.lat), lon = parseFloat(req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return res.status(400).json({ error: "Give lat in -90..90 and lon in -180..180." });
  }
  try {
    // Make sure tables exist and the grid is loaded (no-op after the first call)
    await ensureDb();
    // Terrain/soil lookup and climate download run in parallel
    const [c, clim] = await Promise.all([cell(lat, lon), climate(lat, lon)]);
    // The browser may cache the answer for an hour; the data changes rarely
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.status(200).json({ lat, lon, inStudyArea: !!c, cell: c, climate: clim });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
