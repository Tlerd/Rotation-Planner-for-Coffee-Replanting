// Shared data access for the API routes. Files starting with "_" are not exposed as routes by Vercel.
import { readFileSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

// The preprocessed NASA grid and crop table ship with the function (see vercel.json includeFiles)
const DATA_DIR = path.join(process.cwd(), "data");
// Read once per cold start, then reuse across requests
let gridCache = null;
let cropsCache = null;

// Loads the 200 x 200 grid built by tools/preprocess.py
export function grid() {
  if (!gridCache) gridCache = JSON.parse(readFileSync(path.join(DATA_DIR, "grid.json"), "utf8"));
  return gridCache;
}

// Loads the crop table with its per-value sources
export function crops() {
  if (!cropsCache) cropsCache = JSON.parse(readFileSync(path.join(DATA_DIR, "crops.json"), "utf8"));
  return cropsCache;
}

// The Neon integration on Vercel injects DATABASE_URL; without it we serve from the files above
const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
export const sql = DB_URL ? neon(DB_URL) : null;

// Variables stored per cell, in table-column order
export const FIELDS = ["elevation_m", "slope_pct", "ndvi", "sm_rootzone", "sm_surface"];

// Creates the tables and loads the grid on first use, so no manual seeding step or secret is needed
let ready = null;
export function ensureDb() {
  if (!sql) return Promise.resolve(false);
  // Share one setup promise between concurrent requests in the same instance
  if (!ready) ready = setup().catch(err => { ready = null; throw err; });
  return ready;
}

async function setup() {
  // One row per grid cell; row/col let us find a cell from lat/lon without a spatial index
  await sql`CREATE TABLE IF NOT EXISTS cells (
    id integer PRIMARY KEY, row integer NOT NULL, col integer NOT NULL, lat real NOT NULL, lon real NOT NULL,
    elevation_m real, slope_pct real, ndvi real, sm_rootzone real, sm_surface real)`;
  // Where each variable came from, shown to the user next to the numbers
  await sql`CREATE TABLE IF NOT EXISTS datasets (key text PRIMARY KEY, description text NOT NULL)`;
  // Crops as JSON documents, so the TODO/source markers travel with each value
  await sql`CREATE TABLE IF NOT EXISTS crops (id text PRIMARY KEY, doc jsonb NOT NULL)`;
  // NASA POWER answers are cached so repeat clicks are fast and the API is called politely
  await sql`CREATE TABLE IF NOT EXISTS power_cache (key text PRIMARY KEY, doc jsonb NOT NULL, fetched_at timestamptz NOT NULL DEFAULT now())`;

  const g = grid();
  const total = g.nrow * g.ncol;
  // Seed only when the table is not complete yet
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM cells`;
  if (n < total) {
    // Insert in chunks so each HTTP request to Neon stays small
    const CHUNK = 5000;
    for (let start = 0; start < total; start += CHUNK) {
      const ids = [], rows = [], cols = [], lats = [], lons = [];
      const vals = FIELDS.map(() => []);
      for (let i = start; i < Math.min(total, start + CHUNK); i++) {
        const r = Math.floor(i / g.ncol), c = i % g.ncol;
        ids.push(i); rows.push(r); cols.push(c);
        // Cell centre coordinates, north row first
        lats.push(+(g.bbox[3] - (r + 0.5) * g.step).toFixed(5));
        lons.push(+(g.bbox[0] + (c + 0.5) * g.step).toFixed(5));
        FIELDS.forEach((f, k) => vals[k].push(g[f][i]));
      }
      // unnest turns parallel arrays into rows in one statement; ON CONFLICT makes reruns safe
      await sql.query(
        `INSERT INTO cells (id,row,col,lat,lon,${FIELDS.join(",")})
         SELECT * FROM unnest($1::int[],$2::int[],$3::int[],$4::real[],$5::real[],$6::real[],$7::real[],$8::real[],$9::real[],$10::real[])
         ON CONFLICT (id) DO NOTHING`,
        [ids, rows, cols, lats, lons, ...vals]
      );
    }
  }
  // Dataset descriptions and crops are small, so refresh them every cold start
  for (const [key, description] of Object.entries(g.sources)) {
    await sql`INSERT INTO datasets (key, description) VALUES (${key}, ${description})
              ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description`;
  }
  for (const c of crops().crops) {
    await sql`INSERT INTO crops (id, doc) VALUES (${c.id}, ${JSON.stringify(c)}::jsonb)
              ON CONFLICT (id) DO UPDATE SET doc = EXCLUDED.doc`;
  }
  return true;
}

// Finds the grid row/col for a point, or null when it is outside the study area
export function locate(lat, lon) {
  const g = grid();
  const r = Math.floor((g.bbox[3] - lat) / g.step);
  const c = Math.floor((lon - g.bbox[0]) / g.step);
  if (r < 0 || r >= g.nrow || c < 0 || c >= g.ncol) return null;
  return { row: r, col: c, id: r * g.ncol + c };
}
