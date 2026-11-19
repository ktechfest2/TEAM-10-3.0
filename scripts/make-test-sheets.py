"""
Makes photo-like EC8A test sheets with hand-drawn digits, to test the reader with something harder than clean type.

  <venv>/bin/python scripts/make-test-sheets.py test-sheets

Each digit is a pen stroke with its own wobble, slant, size and pressure; the sheet is then tilted, shaded unevenly,
blurred and compressed like a phone photo. The true figures are written next to the images (truth.txt).
Needs Pillow and numpy.
"""
import math
import random
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "test-sheets")
OUT.mkdir(parents=True, exist_ok=True)

# Digits as pen paths in a unit box (x right, y down).
GLYPHS = {
    "0": [[(0.5, 0.0), (0.12, 0.2), (0.05, 0.55), (0.2, 0.92), (0.55, 1.0), (0.9, 0.75), (0.95, 0.35), (0.75, 0.05), (0.5, 0.0)]],
    "1": [[(0.3, 0.22), (0.55, 0.0), (0.55, 1.0)]],
    "2": [[(0.1, 0.25), (0.3, 0.0), (0.7, 0.0), (0.9, 0.25), (0.7, 0.55), (0.1, 1.0), (0.95, 1.0)]],
    "3": [[(0.1, 0.1), (0.5, 0.0), (0.85, 0.2), (0.5, 0.48), (0.9, 0.7), (0.7, 1.0), (0.1, 0.92)]],
    "4": [[(0.7, 1.0), (0.7, 0.0), (0.05, 0.65), (0.95, 0.65)]],
    "5": [[(0.85, 0.0), (0.2, 0.0), (0.15, 0.45), (0.6, 0.4), (0.9, 0.65), (0.7, 0.97), (0.1, 0.9)]],
    "6": [[(0.8, 0.05), (0.35, 0.2), (0.12, 0.6), (0.3, 0.97), (0.75, 0.9), (0.85, 0.6), (0.5, 0.45), (0.2, 0.6)]],
    "7": [[(0.05, 0.0), (0.95, 0.0), (0.4, 1.0)]],
    "8": [[(0.5, 0.5), (0.2, 0.25), (0.5, 0.0), (0.8, 0.25), (0.5, 0.5), (0.15, 0.75), (0.5, 1.0), (0.85, 0.75), (0.5, 0.5)]],
    "9": [[(0.8, 0.4), (0.5, 0.5), (0.2, 0.3), (0.5, 0.0), (0.8, 0.25), (0.8, 0.5), (0.7, 1.0)]],
}


def smooth(points, steps=10):
    """Catmull-Rom spline through the points."""
    pts = [points[0], *points, points[-1]]
    out = []
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[i + 1], pts[i + 2]
        for s in range(steps):
            t = s / steps
            out.append(tuple(0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t ** 3) for k in (0, 1)))
    out.append(pts[-2])
    return out


def pen(draw, path, ink, width):
    for i in range(len(path) - 1):
        w = max(2, int(width * (0.8 + 0.4 * math.sin(i * 0.7))))  # uneven pressure
        draw.line([path[i], path[i + 1]], fill=ink, width=w)
        draw.ellipse([path[i][0] - w / 2, path[i][1] - w / 2, path[i][0] + w / 2, path[i][1] + w / 2], fill=ink)


def write_number(draw, text, x, y, height, ink, rng, slant=0.18, width=None, cross=False):
    """Hand-writes a number with its top-left at (x, y)."""
    width = width or max(3, height // 9)
    cx = x
    for ch in text:
        gw = height * rng.uniform(0.5, 0.62)
        gh = height * rng.uniform(0.9, 1.08)
        dy = rng.uniform(-0.06, 0.06) * height
        for stroke in GLYPHS[ch]:
            pts = [(px + rng.uniform(-0.05, 0.05), py + rng.uniform(-0.05, 0.05)) for px, py in stroke]
            path = [(cx + px * gw + slant * (1 - py) * gh, y + dy + py * gh) for px, py in smooth(pts)]
            pen(draw, path, ink, width)
        cx += gw + height * rng.uniform(0.12, 0.28)
    if cross:  # a crossed-out correction
        draw.line([(x - 6, y + height * 0.55), (cx, y + height * 0.4)], fill=ink, width=width)
        draw.line([(x - 6, y + height * 0.4), (cx, y + height * 0.65)], fill=ink, width=width)
    return cx


def font(size, bold=False):
    for name in ("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf", "NotoSans-Bold.ttf" if bold else "NotoSans-Regular.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def sheet(unit, figures, ink, seed, correction=None):
    rng = random.Random(seed)
    W, H = 1000, 1250
    img = Image.new("RGB", (W, H), (244, 241, 233))
    d = ImageDraw.Draw(img)
    d.text((50, 40), "INDEPENDENT NATIONAL ELECTORAL COMMISSION", font=font(26, True), fill=(40, 40, 40))
    d.text((50, 80), "FORM EC8A  ·  STATEMENT OF RESULT OF POLL FROM POLLING UNIT", font=font(22), fill=(40, 40, 40))
    d.text((50, 120), f"POLLING UNIT: {unit[0]}     CODE: {unit[1]}", font=font(20), fill=(70, 70, 70))
    rows = [("APC", "APC"), ("LP", "LP"), ("PDP", "PDP"), ("NNPP", "NNPP"), (None, None), ("TOTAL VALID VOTES", "valid"), ("REJECTED BALLOTS", "rejected"), ("ACCREDITED VOTERS", "accredited")]
    y = 210
    for label, key in rows:
        if label is None:
            y += 40
            continue
        d.rectangle([50, y, 950, y + 110], outline=(120, 120, 130), width=3)
        d.line([(430, y), (430, y + 110)], fill=(120, 120, 130), width=3)
        d.line([(700, y), (700, y + 110)], fill=(120, 120, 130), width=3)
        d.text((70, y + 36), label, font=font(30, True), fill=(30, 30, 30))
        value = str(figures[key])
        x = 455 + rng.uniform(-6, 12)
        if correction and key == correction[0]:
            # the wrong figure is struck through, and the right one written beside it in the next box
            write_number(d, correction[1], x, y + 22, 62, ink, rng, cross=True)
            write_number(d, value, 725 + rng.uniform(-4, 10), y + 16, 78, ink, rng)
        else:
            write_number(d, value, x, y + 14 + rng.uniform(-6, 6), 80, ink, rng)
        y += 110
    d.text((50, H - 60), "Synthetic test sheet made by the Tally team. Not a real result.", font=font(18), fill=(130, 130, 130))
    return img


def photograph(img, seed, tilt, blur, size, quality):
    """Makes the flat sheet look like a phone photo."""
    rng = np.random.default_rng(seed)
    W, H = img.size
    # perspective: the top edge is further away than the bottom
    dx = W * rng.uniform(0.03, 0.07)
    coeffs = _perspective([(dx, 0), (W - dx * 0.4, dx * 0.5), (W, H), (0, H - dx * 0.3)], [(0, 0), (W, 0), (W, H), (0, H)])
    img = img.transform((W, H), Image.PERSPECTIVE, coeffs, Image.BICUBIC, fillcolor=(70, 66, 60))
    img = img.rotate(tilt, resample=Image.BICUBIC, expand=True, fillcolor=(70, 66, 60))
    a = np.asarray(img).astype(np.float32)
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    light = 1.0 - 0.28 * (xx / w) - 0.12 * (yy / h) + 0.05 * np.sin(xx / 90.0)  # uneven light and a soft shadow
    a *= light[..., None]
    a += rng.normal(0, 5, a.shape)  # sensor noise
    img = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(blur))
    return img.resize(size, Image.LANCZOS), quality


def _perspective(src, dst):
    m = []
    for (x, y), (u, v) in zip(dst, src):
        m.append([x, y, 1, 0, 0, 0, -u * x, -u * y])
        m.append([0, 0, 0, x, y, 1, -v * x, -v * y])
    A = np.array(m, dtype=np.float64)
    B = np.array([c for p in src for c in p], dtype=np.float64)
    return np.linalg.solve(A, B).tolist()


SHEETS = [
    # name, unit, figures, ink, seed, correction, tilt, blur, size, quality
    ("sheet-A-clear", ("Ung. Rimi Primary School", "37-02-04-011"), dict(APC=143, LP=27, PDP=86, NNPP=4, valid=260, rejected=6, accredited=266), (20, 30, 150), 11, None, 1.5, 0.6, (1200, 1500), 85),
    ("sheet-B-dim", ("Kutunku Health Centre", "37-03-02-007"), dict(APC=58, LP=9, PDP=131, NNPP=12, valid=210, rejected=3, accredited=213), (25, 25, 25), 22, None, -3.0, 1.2, (1000, 1250), 60),
    ("sheet-C-big-messy-with-correction", ("Gwarinpa Market Square", "37-06-05-031"), dict(APC=207, LP=15, PDP=64, NNPP=0, valid=286, rejected=11, accredited=297), (10, 40, 140), 33, ("valid", "270"), 4.5, 1.6, (3000, 3750), 92),
]

truth = []
for name, unit, figures, ink, seed, correction, tilt, blur, size, quality in SHEETS:
    flat = sheet(unit, figures, ink, seed, correction)
    photo, q = photograph(flat, seed, tilt, blur, size, quality)
    path = OUT / f"{name}.jpg"
    photo.save(path, "JPEG", quality=q)
    truth.append(f"{path.name}  ({path.stat().st_size // 1024} KB)  {unit[0]} {unit[1]}\n  " + ", ".join(f"{k}={v}" for k, v in figures.items()) + (f"\n  NOTE: total valid was first written as {correction[1]} and crossed out; the true figure is {figures[correction[0]]}" if correction else ""))
(OUT / "truth.txt").write_text("\n\n".join(truth) + "\n")
print("\n\n".join(truth))
