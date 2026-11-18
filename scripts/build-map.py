#!/usr/bin/env python3
"""
Builds lib/data/fct-map.json: one Voronoi cell per polling site, clipped to the real FCT boundary.

Inputs
  1. Nigeria ADM2 (LGA) boundaries, GRID3 via geoBoundaries (CC BY 4.0):
     https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/NGA/ADM2/geoBoundaries-NGA-ADM2_simplified.geojson
  2. data/fct-2023-pu-results.json (public polling-unit locations, see README credits)

Usage (needs numpy, scipy, shapely):
  python3 scripts/build-map.py <adm2.geojson> data/fct-2023-pu-results.json lib/data/fct-map.json
"""
import json
import math
import sys

import numpy as np
from scipy.spatial import Voronoi
from shapely.geometry import Point, Polygon, MultiPolygon, shape
from shapely.ops import unary_union

adm2_path, units_path, out_path = sys.argv[1:4]

WANT = {"Abaji": "ABAJI", "Bwari": "BWARI", "Gwagwalada": "GWAGWALADA", "Kuje": "KUJE", "Kwali": "KWALI", "Municipal Area Council": "MUNICIPAL"}
LGAS = ["ABAJI", "BWARI", "GWAGWALADA", "KUJE", "KWALI", "MUNICIPAL"]
LGA_LABEL = {"MUNICIPAL": "AMAC"}

geoms = {}
for f in json.load(open(adm2_path))["features"]:
    name = f["properties"]["shapeName"]
    if name in WANT:
        g = shape(f["geometry"])
        c = g.centroid
        if 8.3 < c.y < 9.5 and 6.6 < c.x < 7.9:  # inside the FCT, not a same-named LGA elsewhere
            geoms[WANT[name]] = g
assert set(geoms) == set(LGAS), f"missing LGAs: {set(LGAS) - set(geoms)}"

fct = unary_union(list(geoms.values()))
minx, miny, maxx, maxy = fct.bounds
k = math.cos(math.radians((miny + maxy) / 2))
W = 1000.0
scale = W / ((maxx - minx) * k)
H = (maxy - miny) * scale


def px(lng, lat):
    return ((lng - minx) * k * scale, (maxy - lat) * scale)


def project(g):
    if g.geom_type == "Polygon":
        return Polygon([px(x, y) for x, y in g.exterior.coords], [[px(x, y) for x, y in r.coords] for r in g.interiors])
    return MultiPolygon([project(p) for p in g.geoms])


fct_p = project(fct)
lga_p = {n: project(g) for n, g in geoms.items()}


def path(g):
    polys = [g] if g.geom_type == "Polygon" else [p for p in g.geoms if p.geom_type == "Polygon"]
    parts = []
    for p in polys:
        pts = list(p.simplify(0.25).exterior.coords)[:-1]
        parts.append("M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in pts) + "Z")
    return "".join(parts)


sites = {}
for r in json.load(open(units_path)):
    if not (r.get("lat") and r.get("lng")):
        continue
    pt = Point(px(r["lng"], r["lat"]))
    if not fct_p.buffer(6).contains(pt):
        continue  # a few source coordinates are wrong; skip them rather than draw them
    key = (round(pt.x, 1), round(pt.y, 1))
    s = sites.setdefault(key, {"x": pt.x, "y": pt.y, "lga": r["lga_name"], "codes": []})
    s["codes"].append(r["pu_code"])

pts = list(sites.values())
arr = np.array([[p["x"], p["y"]] for p in pts])
far = 4000
vor = Voronoi(np.vstack([arr, [[-far, -far], [W + far, -far], [W + far, H + far], [-far, H + far]]]))

cells = []
for i, p in enumerate(pts):
    reg = vor.regions[vor.point_region[i]]
    if -1 in reg or len(reg) < 3:
        continue
    poly = Polygon(vor.vertices[reg]).intersection(fct_p)
    if poly.is_empty:
        continue
    cells.append({"d": path(poly), "lga": LGAS.index(p["lga"]), "cx": round(p["x"], 1), "cy": round(p["y"], 1), "codes": p["codes"]})

out = {
    "w": W,
    "h": round(H, 1),
    "outline": path(fct_p),
    "lgas": [{"n": LGA_LABEL.get(n, n.title()), "d": path(lga_p[n]), "cx": round(lga_p[n].representative_point().x, 1), "cy": round(lga_p[n].representative_point().y, 1)} for n in LGAS],
    "cells": cells,
}
json.dump(out, open(out_path, "w"), separators=(",", ":"))
print(f"{len(cells)} cells, {sum(len(c['codes']) for c in cells)} units -> {out_path}")
