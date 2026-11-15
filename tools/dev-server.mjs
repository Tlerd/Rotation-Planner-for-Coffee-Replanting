// Local stand-in for Vercel: serves web/ as static files and web/api/*.js as functions.
// Usage: node tools/dev-server.mjs  (then open http://localhost:3000)
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

// The Vercel project root; API code reads data/ relative to the working directory, like on Vercel
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..", "web");
process.chdir(ROOT);
// Content types for the files the app serves
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json" };

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  // /api/<name> runs web/api/<name>.js with Vercel-style req.query and res.status().json()
  if (url.pathname.startsWith("/api/")) {
    const mod = await import(pathToFileURL(path.join(ROOT, "api", url.pathname.slice(5) + ".js")));
    req.query = Object.fromEntries(url.searchParams);
    res.status = code => { res.statusCode = code; return res; };
    res.json = obj => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(obj)); };
    return mod.default(req, res);
  }
  // Everything else is a static file; "/" means index.html
  const file = path.join(ROOT, url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname));
  try {
    const body = await readFile(file);
    res.setHeader("Content-Type", TYPES[path.extname(file)] || "application/octet-stream");
    res.end(body);
  } catch {
    res.statusCode = 404;
    res.end("Not found");
  }
}).listen(3000, () => console.log("ReRoot v2 dev server on http://localhost:3000"));
