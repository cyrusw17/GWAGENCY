#!/usr/bin/env python3
"""Sample before/after images for the exterior cleaning demos.

Demo sites can't use a real company's job photos, and stock photos of "before/after"
would pass off someone else's work. So these are drawn from noise: concrete, siding,
shingles, glass and pavers, each in a dirty and a clean state. Every demo labels them
as sample images. Real client sites replace them with the owner's own photos.

Dev-only tool (needs Pillow and numpy):  python3 tools/sample-images.py <out-dir> <set> [...]
Sets: driveway, stripe, siding, roof, moss, window, pavers
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

W, H = 1200, 900


def rng(seed):
    return np.random.default_rng(seed)


def noise(r, w, h, cell):
    """Smooth value noise: a coarse random grid scaled up with bicubic filtering."""
    gw, gh = max(2, w // cell + 2), max(2, h // cell + 2)
    g = Image.fromarray((r.random((gh, gw)) * 255).astype(np.uint8))
    return np.asarray(g.resize((gw * cell, gh * cell), Image.BICUBIC), dtype=np.float32)[:h, :w] / 255


def noise2(r, w, h, cx, cy):
    """Stretched noise: cx by cy pixel cells, for runs like rain streaks."""
    gw, gh = w // cx + 2, h // cy + 2
    g = Image.fromarray((r.random((gh, gw)) * 255).astype(np.uint8))
    return np.asarray(g.resize((gw * cx, gh * cy), Image.BICUBIC), dtype=np.float32)[:h, :w] / 255


def fbm(r, w, h, cells=(240, 120, 60, 24, 8), weights=(0.35, 0.25, 0.2, 0.12, 0.08)):
    return sum(noise(r, w, h, c) * k for c, k in zip(cells, weights))


def save(arr, path, q=70):
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    img.save(path, "WEBP", quality=q, method=6)


def tint(mask, rgb):
    return mask[..., None] * np.array(rgb, dtype=np.float32)[None, None, :]


def blend(base, rgb, mask):
    m = np.clip(mask, 0, 1)[..., None]
    return base * (1 - m) + np.array(rgb, dtype=np.float32) * m


# ---------- surfaces ----------

def concrete(r, w=W, h=H, joints=True):
    n = fbm(r, w, h)
    grain = r.normal(0, 1, (h, w)).astype(np.float32)
    base = 168 + (n - 0.5) * 38 + grain * 7
    img = np.stack([base + 4, base + 2, base - 4], -1)
    # aggregate specks
    sp = r.random((h, w)) > 0.985
    img[sp] -= r.uniform(20, 55, sp.sum())[:, None]
    if joints:  # saw-cut control joints in a perspective-free top view
        for x in (int(w * 0.38), int(w * 0.79)):
            img[:, x - 2:x + 3] *= 0.55
            img[:, x + 3:x + 5] *= 0.85
        y = int(h * 0.55)
        img[y - 2:y + 3] *= 0.55
    return img


def grime(r, w, h, strength=1.0, green=0.4):
    """Mildew, tire and foot traffic dirt: dark, slightly green, patchy."""
    m = fbm(r, w, h, (300, 150, 70, 30, 10), (0.3, 0.3, 0.2, 0.12, 0.08))
    m = np.clip((m - 0.32) * 2.2, 0, 1) * strength
    # tire tracks
    yy, xx = np.mgrid[0:h, 0:w]
    for cx in (w * 0.22, w * 0.62):
        wobble = noise(r, w, h, 200) * 40
        track = np.exp(-((xx - cx - wobble) / (w * 0.06)) ** 2) * 0.55
        m = np.maximum(m, track * strength * (0.6 + 0.4 * noise(r, w, h, 40)))
    # oil spots
    for _ in range(3):
        cx, cy, rad = r.uniform(0.2, 0.8) * w, r.uniform(0.3, 0.8) * h, r.uniform(25, 70)
        d = np.sqrt((xx - cx) ** 2 + ((yy - cy) * 1.3) ** 2)
        m = np.maximum(m, np.clip(1 - d / rad, 0, 1) ** 0.7 * 0.8 * strength)
    col = np.array([62, 66, 50]) * (1 - green) + np.array([58, 74, 48]) * green
    return m, col


def driveway(r, dirty):
    img = concrete(r)
    if dirty:
        m, col = grime(r, W, H)
        img = blend(img, col, m * 0.85)
    else:
        img = img * 1.04 + 6
    return img


def stripe(r):
    """The pressure washer's signature shot: one clean pass through a dirty slab."""
    clean = concrete(r) * 1.05 + 8
    m, col = grime(rng(11), W, H, 1.1)
    dirty = blend(clean.copy(), col, m * 0.9)
    yy, xx = np.mgrid[0:H, 0:W]
    edge = noise(rng(5), W, H, 30) * 26 + noise(rng(6), W, H, 6) * 8
    centre = H * 0.48 + (xx - W / 2) * 0.18
    band = np.abs(yy - centre + edge - 17) < H * 0.16
    mask = Image.fromarray((band * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2.2))
    m2 = np.asarray(mask, dtype=np.float32)[..., None] / 255
    out = dirty * (1 - m2) + clean * m2
    # water still on the clean pass reads darker at the leading edge
    wet = np.asarray(Image.fromarray((band * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(14)), dtype=np.float32) / 255
    out *= (1 - 0.08 * np.clip(wet * (1 - m2[..., 0]) * 3, 0, 1))[..., None]
    return out


def siding(r, dirty, base=(232, 230, 222), board=46):
    h, w = H, W
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    phase = (yy % board) / board
    shade = 1 - 0.18 * np.clip((phase - 0.82) / 0.18, 0, 1) - 0.05 * (1 - phase)
    grain = noise(r, w, h, 3) * 0.04 + noise(r, w, h, 60) * 0.03
    img = tint(shade - grain, base)
    # a window frame and a downspout so it reads as a house
    img[:, int(w * .86):int(w * .9)] = img[:, int(w * .86):int(w * .9)] * 0.9
    img[int(h * .12):int(h * .58), int(w * .18):int(w * .46)] = blend(img[int(h * .12):int(h * .58), int(w * .18):int(w * .46)], (250, 250, 248), np.ones((int(h * .58) - int(h * .12), int(w * .46) - int(w * .18))))
    win = img[int(h * .15):int(h * .55), int(w * .2):int(w * .44)]
    gy = np.linspace(0, 1, win.shape[0])[:, None]
    sky = np.stack([120 + 60 * gy, 140 + 50 * gy, 160 + 40 * gy], -1) * np.ones((1, win.shape[1], 1))
    win[:] = sky
    win[:, win.shape[1] // 2 - 3:win.shape[1] // 2 + 3] = 250
    if dirty:
        algae = fbm(r, w, h, (200, 100, 40, 16, 6))
        vert = np.clip((yy / h) ** 1.6 * 1.3, 0, 1)
        streak = noise(r, w, h * 6, 14)[::6][:h] if False else np.repeat(noise(r, w, 40, 14)[:1], h, 0)
        m = np.clip((algae - 0.38) * 2.4, 0, 1) * (0.35 + 0.65 * vert) + streak * 0.25 * vert
        m *= (0.7 + 0.6 * (phase > 0.75))
        img = blend(img, (96, 118, 70), m * 0.75)
        img = blend(img, (70, 74, 60), np.clip(m - 0.6, 0, 1))
    return img


def shingles(r, dirty, moss=False):
    h, w = H, W
    rows = 54
    img = np.zeros((h, w, 3), np.float32)
    yy, xx = np.mgrid[0:h, 0:w]
    row = yy // rows
    tab = ((xx + (row % 2) * 60 + (row * 37 % 23)) // 120)
    tone = (np.asarray(Image.fromarray((r.random((row.max() + 1, tab.max() + 2)) * 255).astype(np.uint8)), np.float32) / 255)[row, tab]
    gran = r.random((h, w)).astype(np.float32)
    base = 92 + tone * 18 + gran * 26
    img[:] = np.stack([base, base + 1, base + 4], -1)
    gap = ((xx + (row % 2) * 60 + (row * 37 % 23)) % 120) < 3
    img[gap] *= 0.45
    img[(yy % rows) > rows - 6] *= 0.62
    if dirty:
        # Gloeocapsa streaks: dark runs that start at random heights and fade downhill.
        cols = noise2(r, w, h, 16, 260)
        start = noise2(r, w, h, 40, 900)
        m = np.clip((cols - 0.5) * 3.2, 0, 1) * np.clip((yy / h) * 1.4 - start * 0.6, 0, 1)
        m *= 0.6 + 0.4 * noise(r, w, h, 20)
        img = blend(img, (34, 35, 33), m * 0.8)
        if moss:
            mm = np.clip((fbm(r, w, h, (120, 60, 24, 10, 4)) - 0.47) * 4.5, 0, 1)
            mm *= 0.45 + 0.55 * np.clip(((yy % rows) / rows - 0.3) * 2, 0, 1)
            mm = np.clip(mm * 1.6, 0, 1)
            tuft = noise(r, w, h, 3)
            col = np.stack([50 + tuft * 46, 66 + tuft * 52, 30 + tuft * 18], -1)
            img = img * (1 - mm[..., None]) + col * mm[..., None]
    return img


def window(r, dirty):
    h, w = H, W
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    sky = np.stack([150 + 70 * (yy / h), 178 + 50 * (yy / h), 205 + 30 * (yy / h)], -1)
    # reflected tree line and roof edge
    ridge = h * 0.62 + noise(r, w, h, 70)[0] * 90
    trees = yy > ridge[None, :]
    sky[trees] = np.array([64, 82, 70]) + noise(r, w, h, 12)[trees][:, None] * 40
    glint = np.exp(-((xx - yy * 0.6 - w * 0.3) / 60) ** 2) * 40
    img = sky + glint[..., None]
    # frame and muntins
    frame = (xx < 40) | (xx > w - 40) | (yy < 40) | (yy > h - 40) | (np.abs(xx - w / 2) < 9) | (np.abs(yy - h / 2) < 9)
    img[frame] = np.array([238, 236, 230])
    if dirty:
        haze = fbm(r, w, h) * 0.5 + 0.25
        img = blend(img, (196, 190, 172), haze * 0.55 * ~frame)
        spots = (r.random((h, w)) > 0.9975).astype(np.uint8) * 255
        spots = np.asarray(Image.fromarray(spots).filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(2)), np.float32) / 255
        img = blend(img, (214, 208, 190), spots * 0.9 * ~frame)
        drip = np.repeat(noise(r, w, 30, 9)[:1], h, 0) * (yy / h) ** 2
        img = blend(img, (150, 140, 118), np.clip(drip - 0.25, 0, 1) * ~frame)
        img[frame] = blend(img[frame][None], (120, 116, 100), np.full((1, frame.sum()), 0.25))[0]
    return img


def pavers(r, dirty):
    h, w = H, W
    yy, xx = np.mgrid[0:h, 0:w]
    bh, bw = 60, 120
    row = yy // bh
    off = (row % 2) * (bw // 2)
    col = (xx + off) // bw
    tone = (r.random((row.max() + 1, col.max() + 2)).astype(np.float32))[row, col]
    base = np.stack([158 + tone * 30, 92 + tone * 18, 70 + tone * 14], -1)
    base += (r.normal(0, 1, (h, w)) * 6)[..., None]
    joint = ((yy % bh) < 4) | (((xx + off) % bw) < 4)
    base[joint] = np.array([186, 180, 166])
    if dirty:
        m = np.clip((fbm(r, w, h) - 0.35) * 2.2, 0, 1)
        base = blend(base, (54, 56, 44), m * 0.7)
        base[joint] = blend(base[joint][None], (40, 52, 34), np.full((1, joint.sum()), 0.85))[0]
    return base


SETS = {
    "driveway": lambda: {"driveway-before": driveway(rng(1), True), "driveway-after": driveway(rng(1), False)},
    "stripe": lambda: {"driveway-stripe": stripe(rng(2))},
    "siding": lambda: {"siding-before": siding(rng(3), True), "siding-after": siding(rng(3), False)},
    "roof": lambda: {"roof-before": shingles(rng(4), True), "roof-after": shingles(rng(4), False)},
    "moss": lambda: {"moss-before": shingles(rng(7), True, moss=True), "moss-after": shingles(rng(7), False)},
    "window": lambda: {"window-before": window(rng(8), True), "window-after": window(rng(8), False)},
    "pavers": lambda: {"pavers-before": pavers(rng(9), True), "pavers-after": pavers(rng(9), False)},
}

if __name__ == "__main__":
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    for name in sys.argv[2:]:
        for fname, arr in SETS[name]().items():
            save(arr, out / f"{fname}.webp")
            print("wrote", out / f"{fname}.webp")
