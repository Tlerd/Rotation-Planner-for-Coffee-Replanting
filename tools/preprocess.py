"""Turn raw NASA files into small web-ready files for ReRoot v2.

Run once on a laptop (not on Vercel):
    python tools/preprocess.py <SRTM .hgt.zip> <SMAP L4 gph .h5> <MODIS NDVI subset .json>

Outputs (under web/):
    tiles/dem/{z}/{x}/{y}.png  SRTM elevation as Terrarium-encoded tiles for 3D terrain
    overlays/slope.png         slope (%) from SRTM 30 m, coloured
    overlays/ndvi.png          MODIS NDVI, coloured
    overlays/smap.png          SMAP L4 root-zone soil moisture, coloured
    data/grid.json             200 x 200 cell grid (elevation, slope, NDVI, SMAP) that seeds the database
"""
import io
import json
import math
import os
import sys
import zipfile

import h5py
import numpy as np
from PIL import Image

# Output folder is the Vercel project, one level up from tools/
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "web")
# Study area for the database grid and overlays (Central Highlands around the demo farm)
LAT0, LAT1, LON0, LON1 = 12.30, 12.80, 108.00, 108.50
# 0.0025 degrees is about 275 m, close to the MODIS 250 m pixel
STEP = 0.0025
# Terrain tiles cover a wider frame so the 3D view does not end at the grid edge
DEM_LAT0, DEM_LAT1, DEM_LON0, DEM_LON1 = 12.15, 12.95, 108.0, 108.65
DEM_ZOOMS = range(8, 13)


def load_srtm(zip_path):
    # SRTM GL1 .hgt is 3601 x 3601 big-endian int16, row 0 = north edge (13N), col 0 = west edge (108E)
    with zipfile.ZipFile(zip_path) as z:
        name = [n for n in z.namelist() if n.endswith(".hgt")][0]
        raw = z.read(name)
    dem = np.frombuffer(raw, dtype=">i2").reshape(3601, 3601).astype(np.float32)
    # -32768 marks voids; fill them with the tile median so slopes stay finite
    dem[dem == -32768] = np.nan
    dem[np.isnan(dem)] = np.nanmedian(dem)
    return dem


def srtm_sample(dem, lat, lon):
    # Bilinear sample of the 1-degree SRTM tile (N12E108) at arrays of lat/lon
    r = (13.0 - lat) * 3600.0
    c = (lon - 108.0) * 3600.0
    r = np.clip(r, 0, 3599.999)
    c = np.clip(c, 0, 3599.999)
    r0 = np.floor(r).astype(int)
    c0 = np.floor(c).astype(int)
    fr, fc = r - r0, c - c0
    return (dem[r0, c0] * (1 - fr) * (1 - fc) + dem[r0 + 1, c0] * fr * (1 - fc)
            + dem[r0, c0 + 1] * (1 - fr) * fc + dem[r0 + 1, c0 + 1] * fr * fc)


def horn_slope_percent(dem):
    # Horn (1981) 3x3 slope on the 1 arc-second grid; pixel size shrinks with cos(latitude) in x
    dy = 111320.0 / 3600.0
    lats = 13.0 - np.arange(3601) / 3600.0
    dx = (dy * np.cos(np.radians(lats)))[:, None]
    z = np.pad(dem, 1, mode="edge")
    a, b, c = z[:-2, :-2], z[:-2, 1:-1], z[:-2, 2:]
    d, f = z[1:-1, :-2], z[1:-1, 2:]
    g, h, i = z[2:, :-2], z[2:, 1:-1], z[2:, 2:]
    dzdx = ((c + 2 * f + i) - (a + 2 * d + g)) / (8 * dx)
    dzdy = ((g + 2 * h + i) - (a + 2 * b + c)) / (8 * dy)
    return np.hypot(dzdx, dzdy) * 100.0


def tile_bounds(z, x, y):
    # Web Mercator tile -> lon/lat of its edges
    n = 2 ** z
    lon_w = x / n * 360 - 180
    lon_e = (x + 1) / n * 360 - 180
    lat_n = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n))))
    lat_s = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (y + 1) / n))))
    return lon_w, lat_s, lon_e, lat_n


def lonlat_to_tile(lon, lat, z):
    n = 2 ** z
    x = int((lon + 180) / 360 * n)
    y = int((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n)
    return x, y


def write_dem_tiles(dem):
    # Terrarium encoding: height = R*256 + G + B/256 - 32768 (what MapLibre "terrarium" expects)
    count = 0
    for z in DEM_ZOOMS:
        x0, y0 = lonlat_to_tile(DEM_LON0, DEM_LAT1, z)
        x1, y1 = lonlat_to_tile(DEM_LON1, DEM_LAT0, z)
        for x in range(x0, x1 + 1):
            for y in range(y0, y1 + 1):
                w, s, e, n = tile_bounds(z, x, y)
                # Pixel centres in Mercator, converted back to latitude row by row
                px = (np.arange(256) + 0.5) / 256
                lons = w + px * (e - w)
                my_n = math.asinh(math.tan(math.radians(n)))
                my_s = math.asinh(math.tan(math.radians(s)))
                lats = np.degrees(np.arctan(np.sinh(my_n + px * (my_s - my_n))))
                lon_g, lat_g = np.meshgrid(lons, lats)
                h = srtm_sample(dem, lat_g, lon_g)
                # Outside the SRTM tile we have no data: use sea level so MapLibre stays flat there
                outside = (lat_g < 12) | (lat_g > 13) | (lon_g < 108) | (lon_g > 109)
                h[outside] = 0
                v = h + 32768
                rgb = np.stack([np.floor(v / 256), np.floor(v) % 256, np.floor((v - np.floor(v)) * 256)], -1)
                path = os.path.join(OUT, "tiles", "dem", str(z), str(x))
                os.makedirs(path, exist_ok=True)
                Image.fromarray(rgb.astype(np.uint8), "RGB").save(os.path.join(path, f"{y}.png"), optimize=True)
                count += 1
    return count


def write_overlay_tiles(name, rgba, zooms):
    # Cuts a bbox-aligned RGBA image into XYZ tiles, because MapLibre drapes tiles on 3D terrain reliably
    h, w = rgba.shape[:2]
    count = 0
    for z in zooms:
        x0, y0 = lonlat_to_tile(LON0, LAT1, z)
        x1, y1 = lonlat_to_tile(LON1, LAT0, z)
        for x in range(x0, x1 + 1):
            for y in range(y0, y1 + 1):
                tw, ts, te, tn = tile_bounds(z, x, y)
                px = (np.arange(256) + 0.5) / 256
                lons = tw + px * (te - tw)
                my_n = math.asinh(math.tan(math.radians(tn)))
                my_s = math.asinh(math.tan(math.radians(ts)))
                lats = np.degrees(np.arctan(np.sinh(my_n + px * (my_s - my_n))))
                lon_g, lat_g = np.meshgrid(lons, lats)
                # Nearest source pixel; pixels outside the study area stay transparent
                ci = np.floor((lon_g - LON0) / (LON1 - LON0) * w).astype(int)
                ri = np.floor((LAT1 - lat_g) / (LAT1 - LAT0) * h).astype(int)
                inside = (ci >= 0) & (ci < w) & (ri >= 0) & (ri < h)
                tile = np.zeros((256, 256, 4), dtype=np.uint8)
                tile[inside] = rgba[ri[inside], ci[inside]]
                path = os.path.join(OUT, "tiles", name, str(z), str(x))
                os.makedirs(path, exist_ok=True)
                Image.fromarray(tile, "RGBA").save(os.path.join(path, f"{y}.png"), optimize=True)
                count += 1
    return count


def colour(values, stops, alpha=190):
    # Linear colour ramp; stops = [(value, (r, g, b)), ...]; NaN becomes transparent
    v = np.asarray(values, dtype=np.float32)
    out = np.zeros(v.shape + (4,), dtype=np.uint8)
    xs = [s[0] for s in stops]
    for k in range(3):
        out[..., k] = np.interp(v, xs, [s[1][k] for s in stops]).astype(np.uint8)
    out[..., 3] = np.where(np.isnan(v), 0, alpha)
    return out


def main(srtm_zip, smap_h5, ndvi_json):
    dem = load_srtm(srtm_zip)
    print("DEM tiles:", write_dem_tiles(dem))

    # Cell centres of the 200 x 200 grid, north row first (same order as images)
    nrow = int(round((LAT1 - LAT0) / STEP))
    ncol = int(round((LON1 - LON0) / STEP))
    lats = LAT1 - (np.arange(nrow) + 0.5) * STEP
    lons = LON0 + (np.arange(ncol) + 0.5) * STEP

    # Slope on the full 30 m grid, then the bbox window for the overlay and the cell means
    slope = horn_slope_percent(dem)
    r0, r1 = int((13 - LAT1) * 3600), int((13 - LAT0) * 3600)
    c0, c1 = int((LON0 - 108) * 3600), int((LON1 - 108) * 3600)
    slope_win = slope[r0:r1, c0:c1]
    dem_win = dem[r0:r1, c0:c1]
    # 1800 px / 200 cells = 9 x 9 SRTM pixels per cell
    k = slope_win.shape[0] // nrow
    cell_slope = slope_win[:nrow * k, :ncol * k].reshape(nrow, k, ncol, k).mean(axis=(1, 3))
    cell_elev = dem_win[:nrow * k, :ncol * k].reshape(nrow, k, ncol, k).mean(axis=(1, 3))

    # MODIS NDVI subset is on the sinusoidal grid; find the pixel under each cell centre
    nd = json.load(open(ndvi_json))
    R = 6371007.181
    xll, yll, cs = float(nd["xllcorner"]), float(nd["yllcorner"]), float(nd["cellsize"])
    nr, nc = int(nd["nrows"]), int(nd["ncols"])
    grid_nd = np.array(nd["subset"][0]["data"], dtype=np.float32).reshape(nr, nc)
    # Values below -2000 are fill; scale factor 0.0001 turns integers into NDVI
    grid_nd = np.where(grid_nd < -2000, np.nan, grid_nd * float(nd["scale"]))
    lon_g, lat_g = np.meshgrid(lons, lats)
    sx = R * np.radians(lon_g) * np.cos(np.radians(lat_g))
    sy = R * np.radians(lat_g)
    ci = np.floor((sx - xll) / cs).astype(int)
    ri = (nr - 1) - np.floor((sy - yll) / cs).astype(int)
    ok = (ci >= 0) & (ci < nc) & (ri >= 0) & (ri < nr)
    cell_ndvi = np.full((nrow, ncol), np.nan, dtype=np.float32)
    cell_ndvi[ok] = grid_nd[ri[ok], ci[ok]]

    # SMAP L4 9 km cells near the area; each grid cell takes its nearest SMAP cell
    with h5py.File(smap_h5, "r") as f:
        la, lo = f["cell_lat"][:], f["cell_lon"][:]
        near = (la > LAT0 - 0.2) & (la < LAT1 + 0.2) & (lo > LON0 - 0.2) & (lo < LON1 + 0.2)
        g = f["Geophysical_Data"]
        sm_rz = g["sm_rootzone"][:][near]
        sm_sf = g["sm_surface"][:][near]
        sm_pct = g["sm_rootzone_pctl"][:][near]
        s_lat, s_lon = la[near], lo[near]
        smap_time = os.path.basename(smap_h5).split("_")[4]
    dist = (lat_g[..., None] - s_lat) ** 2 + ((lon_g[..., None] - s_lon) * math.cos(math.radians(12.5))) ** 2
    nearest = dist.argmin(-1)
    fill = lambda a: np.where(a[nearest] < -9000, np.nan, a[nearest])
    cell_rz, cell_sf, cell_pct = fill(sm_rz), fill(sm_sf), fill(sm_pct)

    # Overlays: slope at full 30 m detail, NDVI and SMAP at grid detail
    # Colour each layer once at its native detail, then cut it into map tiles
    slope_rgba = colour(np.clip(slope_win, 0, 40), [(0, (46, 125, 50)), (8, (205, 220, 57)), (15, (255, 152, 0)), (25, (229, 57, 53)), (40, (123, 31, 162))])
    ndvi_rgba = colour(cell_ndvi, [(0, (140, 81, 10)), (0.3, (223, 194, 125)), (0.6, (127, 188, 65)), (0.9, (0, 104, 55))])
    smap_rgba = colour(cell_rz, [(0.1, (215, 180, 120)), (0.25, (166, 206, 227)), (0.4, (31, 120, 180)), (0.55, (8, 48, 107))])
    # Slope has 30 m detail, so it gets one more zoom level than the 250 m / 9 km layers
    print("overlay tiles", write_overlay_tiles("slope", slope_rgba, range(9, 14)),
          write_overlay_tiles("ndvi", ndvi_rgba, range(9, 13)), write_overlay_tiles("smap", smap_rgba, range(9, 13)))

    # Compact grid for the database seed: one array per variable, rounded to keep the file small
    rnd = lambda a, d: [None if np.isnan(v) else round(float(v), d) for v in a.ravel()]
    grid = {
        "bbox": [LON0, LAT0, LON1, LAT1], "step": STEP, "nrow": nrow, "ncol": ncol, "order": "row-major, north row first",
        "sources": {
            "elevation_m": "SRTM GL1 v003 30 m (N12E108), mean per cell",
            "slope_pct": "SRTM GL1 v003 30 m, Horn (1981) slope, mean per cell",
            "ndvi": f"MODIS MOD13Q1 v061 250 m 16-day NDVI, {nd['subset'][0]['calendar_date']}, via ORNL DAAC MODIS web service",
            "sm_rootzone": f"SMAP L4 SPL4SMGP v8 root-zone soil moisture (m3/m3), 9 km, {smap_time}",
            "sm_surface": f"SMAP L4 SPL4SMGP v8 surface soil moisture (m3/m3), 9 km, {smap_time}",
            "sm_rootzone_pctl": f"SMAP L4 SPL4SMGP v8 root-zone soil moisture percentile, 9 km, {smap_time}",
        },
        "elevation_m": rnd(cell_elev, 0), "slope_pct": rnd(cell_slope, 1), "ndvi": rnd(cell_ndvi, 3),
        "sm_rootzone": rnd(cell_rz, 3), "sm_surface": rnd(cell_sf, 3), "sm_rootzone_pctl": rnd(cell_pct, 0),
    }
    os.makedirs(os.path.join(OUT, "data"), exist_ok=True)
    json.dump(grid, open(os.path.join(OUT, "data", "grid.json"), "w"), separators=(",", ":"))
    print("grid", nrow, ncol, "slope mean/max", float(np.nanmean(cell_slope)), float(np.nanmax(cell_slope)),
          "ndvi mean", float(np.nanmean(cell_ndvi)), "smap rz range", float(np.nanmin(cell_rz)), float(np.nanmax(cell_rz)))


if __name__ == "__main__":
    main(*sys.argv[1:4])
