"""Backup satellite imagery for the world warm-up, used when the EOX tiles can't load (the Claude artifact blocks
outside image hosts). Reprojects NASA's Blue Marble Next Generation (public domain; the 5400x2700 copy shipped in the
basemap-data package, mpl_toolkits/basemap_data/bmng.jpg) from plate carree to Web Mercator and cuts it into a 3x3 grid.

    python3 genbluemarble.py path/to/bmng.jpg
"""
import math, sys
import numpy as np
from PIL import Image

src = np.asarray(Image.open(sys.argv[1]).convert("RGB"))
H, W = src.shape[:2]
N, SIDE, MAXLAT = 3, 5400, 85.0511287798
ys = (np.arange(SIDE) + 0.5) / SIDE                       # 0 at the top of the Mercator square, 1 at the bottom
lat = np.degrees(np.arctan(np.sinh(math.pi * (1 - 2 * ys))))
rows = np.clip(((90 - lat) / 180 * H).astype(int), 0, H - 1)
merc = src[rows]                                           # same longitudes, so only the rows move
piece = SIDE // N
for r in range(N):
    for c in range(N):
        Image.fromarray(merc[r * piece:(r + 1) * piece, c * piece * W // SIDE:(c + 1) * piece * W // SIDE]) \
            .resize((piece, piece), Image.LANCZOS).save(f"../img/sat/bm-{r}{c}.jpg", quality=80, optimize=True, progressive=True)
print("bounds per row (lat):", [round(math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * k / N)))), 4) for k in range(N + 1)])
