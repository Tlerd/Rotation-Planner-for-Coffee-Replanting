// GET /api/meta  ->  study area, dataset sources and crop table, read from Postgres when attached.
import { sql, ensureDb, grid, crops } from "./_lib.js";

export default async function handler(req, res) {
  try {
    // Create and seed the tables on first use
    const db = await ensureDb();
    const g = grid();
    let datasets = g.sources, cropList = crops().crops;
    // Prefer the database copy, so the app shows what the backend actually stores
    if (db) {
      const ds = await sql`SELECT key, description FROM datasets ORDER BY key`;
      datasets = Object.fromEntries(ds.map(r => [r.key, r.description]));
      const cr = await sql`SELECT doc FROM crops`;
      // Keep the same crop order as the JSON file
      const order = crops().crops.map(c => c.id);
      cropList = cr.map(r => r.doc).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    }
    // Count cells so the page can prove the grid is in the database
    const cells = db ? (await sql`SELECT count(*)::int AS n FROM cells`)[0].n : g.nrow * g.ncol;
    res.setHeader("Cache-Control", "public, max-age=600");
    return res.status(200).json({
      store: db ? "postgres" : "file", cells, bbox: g.bbox, step: g.step,
      datasets, crops: cropList, cropSources: crops().sources
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
