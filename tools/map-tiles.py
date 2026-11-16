"""Cut the campus map into tiles that the website loads as they scroll into view.

Usage (from the repository root, needs Python 3 and Pillow):

    python3 tools/map-tiles.py

Reads data/map/map.webp and writes a GRID x GRID set of tiles to
static/map-tiles/{row}-{col}.webp. GRID must match MAP_TILE_GRID in
src/components/map/MapTiles.tsx. Quality 75 keeps the tiles together about the
size of the source image; a phone's first view needs only a few of them.
"""

from pathlib import Path

from PIL import Image

GRID = 6
QUALITY = 75

root = Path(__file__).resolve().parent.parent
source = Image.open(root / "data/map/map.webp").convert("RGBA")
if source.width != source.height or source.width % GRID:
    raise SystemExit(f"Expected a square map divisible by {GRID}, got {source.size}")

out = root / "static/map-tiles"
out.mkdir(parents=True, exist_ok=True)
for old in out.glob("*.webp"):
    old.unlink()

size = source.width // GRID
total = 0
for row in range(GRID):
    for col in range(GRID):
        tile = source.crop((col * size, row * size, (col + 1) * size, (row + 1) * size))
        path = out / f"{row}-{col}.webp"
        tile.save(path, "WEBP", quality=QUALITY, method=6)
        total += path.stat().st_size
print(f"Wrote {GRID * GRID} tiles of {size}px, {total / 1e6:.2f} MB in all, to {out}")
