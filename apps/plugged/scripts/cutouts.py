#!/usr/bin/env python3
"""Generate transparent product cutouts from catalog photos.

Flood-fills background pixels that are 8-connected to the image border, so
bright/white product details inside the silhouette are preserved.

Usage: python3 scripts/cutouts.py   (run from apps/plugged)
Writes: public/cut/<product-slug>.webp
"""

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

WHITE_TOL = 30
APP_ROOT = Path(__file__).resolve().parent.parent
SEED = APP_ROOT / "data" / "catalog.seed.json"
OUT_DIR = APP_ROOT / "public" / "cut"


def edge_connected_background(rgb: np.ndarray, edge_tolerance: int | None = None) -> np.ndarray:
    if edge_tolerance is None:
        candidate = np.min(rgb.astype(np.int16), axis=2) >= 255 - WHITE_TOL
    else:
        edge = np.concatenate(
            [rgb[:8].reshape(-1, 3), rgb[-8:].reshape(-1, 3), rgb[:, :8].reshape(-1, 3), rgb[:, -8:].reshape(-1, 3)]
        )
        background = np.median(edge, axis=0)
        candidate = np.sqrt(((rgb.astype(float) - background) ** 2).sum(axis=2)) <= edge_tolerance
    h, w = candidate.shape
    region = np.zeros((h, w), dtype=bool)
    region[0, :] = candidate[0, :]
    region[-1, :] = candidate[-1, :]
    region[:, 0] = candidate[:, 0]
    region[:, -1] = candidate[:, -1]
    prev = ~region
    while not np.array_equal(prev, region):
        prev = region
        grown = region.copy()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dx == 0 and dy == 0:
                    continue
                grown |= np.roll(region, (dy, dx), axis=(0, 1))
        region = grown & candidate
    return region


def cutout(src: Path, dst: Path, crop: tuple[int, int, int, int] | None = None, edge_tolerance: int | None = None) -> None:
    im = Image.open(src).convert("RGB")
    if crop is not None:
        im = im.crop(crop)
    bg = edge_connected_background(np.asarray(im), edge_tolerance)
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    a = Image.fromarray(alpha).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    out = im.convert("RGBA")
    out.putalpha(a)
    coords = np.asarray(a).nonzero()
    if coords[0].size:
        y0, y1, x0, x1 = coords[0].min(), coords[0].max(), coords[1].min(), coords[1].max()
        pad = 10
        out = out.crop((max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad + 1), min(im.height, y1 + pad + 1)))
    out.save(dst, quality=88, method=6)


def main() -> None:
    seed = json.loads(SEED.read_text())
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for product in seed["products"]:
        sources = [img["source"] for img in product.get("images", []) if img.get("source")]
        if not sources:
            print(f"skip {product['slug']}: no source image")
            continue
        src = APP_ROOT / sources[0]
        dst = OUT_DIR / f"{product['slug']}.webp"
        if product["slug"] == "truthear-keyx":
            cutout(src, dst, crop=(135, 864, 421, 1262), edge_tolerance=22)
        else:
            cutout(src, dst)
        print(f"cut {product['slug']} <- {src.name} ({dst.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
