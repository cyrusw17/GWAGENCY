"""Turn every .jpg in a client's img/ folder into the 800w and 1600w WebP pair the photo()
helper in template/layouts/_agent.mjs serves, then remove the .jpg. Needs Pillow.
usage: python3 tools/webp-photos.py clients/<slug>/img"""
import glob, os, sys
from PIL import Image
for f in glob.glob(os.path.join(sys.argv[1], "*.jpg")):
    im, b = Image.open(f).convert("RGB"), f[:-4]
    for w in (800, 1600):
        r = im if im.width <= w else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        r.save(f"{b}-{w}.webp", "WEBP", quality=72, method=5)
    os.remove(f)
    print("  webp", os.path.basename(b))
