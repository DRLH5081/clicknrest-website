#!/usr/bin/env python3
"""
Generates illustrated PLACEHOLDER images for the demo properties.

These are deliberately stylised illustrations (not photographs) so nobody
mistakes them for the real properties. Replace them from the admin
dashboard (Properties > Photos) with your own photography before launch.

Usage: python3 scripts/generate-placeholders.py <output-dir>
"""
import math
import os
import random
import sys

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

W, H = 1600, 1067
SS = 2  # supersampling factor for smooth edges
CW, CH = W * SS, H * SS

FONT_PATHS = [
    "/usr/share/fonts/opentype/inter/Inter-Medium.otf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]


def font(size):
    for p in FONT_PATHS:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def mix(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def shade(c, f):
    if f >= 1:
        return mix(c, (255, 255, 255), f - 1)
    return mix((0, 0, 0), c, f)


def vgradient(img, box, top, bottom):
    x0, y0, x1, y1 = box
    d = ImageDraw.Draw(img)
    hgt = max(1, y1 - y0)
    for i in range(hgt):
        d.line([(x0, y0 + i), (x1, y0 + i)], fill=mix(top, bottom, i / hgt))


def ridge(rng, y_base, amp, freq_count=4, width=CW, step=8):
    phases = [rng.uniform(0, math.tau) for _ in range(freq_count)]
    freqs = [rng.uniform(0.6, 1.4) * (k + 1) for k in range(freq_count)]
    pts = []
    for x in range(0, width + step, step):
        t = x / width * math.tau
        y = sum(math.sin(t * freqs[k] + phases[k]) / (k + 1) for k in range(freq_count))
        pts.append((x, y_base - y * amp))
    return pts + [(width, CH), (0, CH)]


def glow(img, center, radius, color, strength=0.55):
    layer = Image.new("RGBA", img.size, color + (0,))
    d = ImageDraw.Draw(layer)
    cx, cy = center
    for r in range(int(radius * 3), int(radius), -12):
        a = int(255 * strength * (1 - (r - radius) / (radius * 2)) ** 2 * 0.25)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color + (max(0, a),))
    d.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=color + (255,))
    img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(10)))


def pine(d, x, base, h, col):
    w = h * 0.42
    for i in range(3):
        top = base - h + i * h * 0.22
        bot = base - h * 0.28 + i * h * 0.12
        ww = w * (0.55 + i * 0.25)
        d.polygon([(x, top), (x - ww / 2, bot), (x + ww / 2, bot)], fill=col)
    d.rectangle([x - h * 0.025, base - h * 0.2, x + h * 0.025, base], fill=shade(col, 0.6))


def round_tree(d, x, base, h, col):
    d.rectangle([x - h * 0.03, base - h * 0.45, x + h * 0.03, base], fill=shade(col, 0.5))
    r = h * 0.3
    for dx, dy, rr in [(-0.4, 0.1, 0.8), (0.4, 0.05, 0.85), (0, -0.25, 1.0)]:
        cx, cy = x + dx * r, base - h * 0.62 + dy * r
        d.ellipse([cx - r * rr, cy - r * rr, cx + r * rr, cy + r * rr], fill=col)


def window(d, box, lit, frame):
    x0, y0, x1, y1 = box
    d.rectangle(box, fill=frame)
    p = max(3, int((x1 - x0) * 0.08))
    d.rectangle([x0 + p, y0 + p, x1 - p, y1 - p], fill=lit)
    d.line([((x0 + x1) / 2, y0 + p), ((x0 + x1) / 2, y1 - p)], fill=frame, width=p)
    d.line([(x0 + p, (y0 + y1) / 2), (x1 - p, (y0 + y1) / 2)], fill=frame, width=p)


def landscape(theme, rng, size=(CW, CH), horizon=0.58, with_sun=True):
    w, h = size
    img = Image.new("RGBA", size, (0, 0, 0, 255))
    sky_top, sky_bot = hex2rgb(theme["sky"][0]), hex2rgb(theme["sky"][1])
    vgradient(img, (0, 0, w, int(h * horizon) + 4), sky_top, sky_bot)
    if with_sun:
        glow(img, (int(w * theme.get("sun_x", 0.7)), int(h * theme.get("sun_y", 0.3))), int(h * 0.06), hex2rgb(theme["sun"]))
    d = ImageDraw.Draw(img)
    # clouds
    for _ in range(theme.get("clouds", 3)):
        cx, cy = rng.uniform(0, w), rng.uniform(h * 0.08, h * 0.35)
        cw_ = rng.uniform(w * 0.08, w * 0.18)
        cl = Image.new("RGBA", size, (255, 255, 255, 0))
        cd = ImageDraw.Draw(cl)
        for k in range(5):
            ox = cx + (k - 2) * cw_ * 0.22
            oy = cy + rng.uniform(-1, 1) * cw_ * 0.06
            rr = cw_ * rng.uniform(0.14, 0.24)
            cd.ellipse([ox - rr * 1.6, oy - rr, ox + rr * 1.6, oy + rr], fill=(255, 255, 255, 120))
        img.alpha_composite(cl.filter(ImageFilter.GaussianBlur(14 * SS)))
    d = ImageDraw.Draw(img)
    hills = [hex2rgb(c) for c in theme["hills"]]
    n = len(hills)
    d.rectangle([0, int(h * horizon), w, h], fill=hills[-1])
    for i, col in enumerate(hills):
        y = h * (horizon - 0.12 + i * (0.12 / max(1, n - 1)))
        amp = h * theme.get("hill_amp", 0.07) * (1.3 - i * 0.25)
        pts = ridge(rng, y, amp, width=w)
        d.polygon(pts, fill=col)
    if theme.get("city"):
        skyline(d, theme, rng, w, h, horizon)
    if theme.get("water"):
        wy = int(h * horizon)
        wt, wb = hex2rgb(theme["water"][0]), hex2rgb(theme["water"][1])
        vgradient(img, (0, wy, w, h), wt, wb)
        d = ImageDraw.Draw(img)
        for _ in range(140):
            yy = rng.uniform(wy + 6, h)
            ln = rng.uniform(w * 0.02, w * 0.09) * (yy - wy) / (h - wy) + 10
            xx = rng.uniform(0, w)
            d.line([(xx, yy), (xx + ln, yy)], fill=mix(wt, (255, 255, 255), 0.35), width=max(1, int(2 * SS * (yy - wy) / (h - wy))))
        if with_sun:
            sx = int(w * theme.get("sun_x", 0.7))
            for k in range(26):
                yy = wy + 8 + k * (h - wy) / 30
                ww = 30 + k * 8
                d.line([(sx - ww, yy), (sx + ww, yy)], fill=mix(hex2rgb(theme["sun"]), wt, 0.35 + k / 60), width=3 * SS)
    return img


def skyline(d, theme, rng, w, h, horizon):
    """Low London-style skyline along the horizon, with an optional landmark."""
    base = h * (horizon + 0.02)
    far, near = hex2rgb(theme["city"][0]), hex2rgb(theme["city"][1])
    x = -20
    while x < w:
        bw = rng.uniform(w * 0.03, w * 0.07)
        bh = rng.uniform(h * 0.04, h * 0.13)
        d.rectangle([x, base - bh, x + bw, base], fill=far)
        x += bw + rng.uniform(0, w * 0.01)
    lm = theme.get("landmark")
    if lm == "arch":
        # stadium bowl with a tall white arch
        cx, sw = w * 0.62, w * 0.34
        d.rounded_rectangle([cx - sw / 2, base - h * 0.08, cx + sw / 2, base], radius=int(h * 0.04), fill=shade(far, 1.25))
        pts = [(cx - sw * 0.42 + sw * 0.84 * t / 40, base - h * 0.08 - math.sin(math.pi * t / 40) * h * 0.24) for t in range(41)]
        d.line(pts, fill=(250, 250, 250), width=max(3, int(h * 0.009)), joint="curve")
    elif lm == "spire":
        # church on a wooded hill
        cx = w * 0.3
        d.ellipse([cx - w * 0.2, base - h * 0.14, cx + w * 0.2, base + h * 0.14], fill=shade(hex2rgb(theme["hills"][-1]), 0.85))
        d.rectangle([cx - w * 0.03, base - h * 0.2, cx + w * 0.02, base - h * 0.12], fill=shade(far, 1.15))
        d.rectangle([cx + w * 0.02, base - h * 0.23, cx + w * 0.04, base - h * 0.12], fill=shade(far, 1.15))
        d.polygon([(cx + w * 0.02, base - h * 0.23), (cx + w * 0.03, base - h * 0.36), (cx + w * 0.04, base - h * 0.23)], fill=shade(far, 1.15))
    elif lm == "plane":
        px, py, sc = w * 0.28, h * 0.2, h * 0.0012
        col = (245, 245, 245)
        d.polygon([(px - 120 * sc * 100 / 100, py), (px + 120 * sc, py - 10 * sc), (px + 140 * sc, py - 4 * sc), (px - 110 * sc, py + 12 * sc)], fill=col)
        d.polygon([(px - 10 * sc, py), (px + 30 * sc, py - 70 * sc), (px + 50 * sc, py - 70 * sc), (px + 30 * sc, py)], fill=col)
        d.polygon([(px - 100 * sc, py), (px - 120 * sc, py - 40 * sc), (px - 105 * sc, py - 40 * sc), (px - 80 * sc, py)], fill=col)
    for k in range(int(w / (w * 0.05))):
        bx = rng.uniform(0, w)
        bw = rng.uniform(w * 0.04, w * 0.09)
        bh = rng.uniform(h * 0.03, h * 0.08)
        d.rectangle([bx, base - bh + h * 0.02, bx + bw, base + h * 0.02], fill=near)


def ground(img, theme, rng, y_frac, color=None):
    d = ImageDraw.Draw(img)
    col = hex2rgb(color or theme["ground"])
    pts = ridge(rng, CH * y_frac, CH * 0.02)
    d.polygon(pts, fill=col)
    # texture
    for _ in range(600):
        x, y = rng.uniform(0, CW), rng.uniform(CH * y_frac, CH)
        d.line([(x, y), (x + rng.uniform(4, 14), y - rng.uniform(4, 16))], fill=shade(col, rng.uniform(0.85, 1.12)), width=SS)


def house(d, theme, cx, base, scale, rng):
    style = theme["house"]
    wall = hex2rgb(theme["wall"])
    roof = hex2rgb(theme["roof"])
    lit = hex2rgb("#F9D98C")
    frame = shade(wall, 0.55) if style in ("cabin", "lodge") else hex2rgb("#3C3A36")
    hw, hh = 520 * scale, 300 * scale
    if style == "block":
        # modern apartment block with balconies
        bw, floors = 1250 * scale, 5
        fh = 150 * scale
        x0 = cx - bw / 2
        d.rectangle([x0, base - floors * fh - 40 * scale, x0 + bw, base], fill=wall)
        d.rectangle([x0 - 20 * scale, base - floors * fh - 60 * scale, x0 + bw + 20 * scale, base - floors * fh - 30 * scale], fill=roof)
        cols = 6
        for f in range(floors):
            y = base - (f + 1) * fh
            for c in range(cols):
                wx = x0 + 45 * scale + c * (bw - 90 * scale) / cols
                window(d, [wx, y + 20 * scale, wx + 120 * scale, y + 115 * scale], lit if rng.random() > 0.55 else hex2rgb("#9FB3C2"), frame)
                if f > 0 and c % 2 == 1:
                    d.rectangle([wx - 20 * scale, y + 100 * scale, wx + 140 * scale, y + 125 * scale], fill=shade(roof, 1.3))
        d.rectangle([cx - 70 * scale, base - 160 * scale, cx + 70 * scale, base], fill=hex2rgb(theme.get("door", "#2B3A4F")))
        return
    if style == "terrace":
        # row of brick terraced houses with bay windows
        tw = 420 * scale
        for i in range(-2, 3):
            x0 = cx + i * tw - tw / 2
            col = shade(wall, 0.92 + 0.05 * ((i + 2) % 2))
            d.rectangle([x0, base - 520 * scale, x0 + tw - 4, base], fill=col)
            d.polygon([(x0 - 4, base - 520 * scale), (x0 + tw / 2, base - 640 * scale), (x0 + tw, base - 520 * scale)], fill=roof)
            d.rectangle([x0 + 30 * scale, base - 230 * scale, x0 + 210 * scale, base - 40 * scale], fill=shade(col, 1.25))
            window(d, [x0 + 45 * scale, base - 215 * scale, x0 + 195 * scale, base - 60 * scale], lit if i == 0 else hex2rgb("#A8BCC8"), frame)
            window(d, [x0 + 50 * scale, base - 450 * scale, x0 + 170 * scale, base - 320 * scale], hex2rgb("#A8BCC8"), frame)
            window(d, [x0 + 240 * scale, base - 450 * scale, x0 + 360 * scale, base - 320 * scale], lit if rng.random() > 0.5 else hex2rgb("#A8BCC8"), frame)
            d.rectangle([x0 + 260 * scale, base - 210 * scale, x0 + 340 * scale, base], fill=hex2rgb(theme.get("door", "#2B3A4F")))
        return
    if style == "loft":
        # tall townhouse row
        for i in range(-2, 3):
            bw = 300 * scale
            bh = (620 + rng.uniform(-60, 80)) * scale
            x0 = cx + i * bw - bw / 2
            col = shade(wall, 0.85 + 0.08 * ((i + 2) % 3))
            d.rectangle([x0, base - bh, x0 + bw - 6, base], fill=col)
            d.polygon([(x0 - 6, base - bh), (x0 + bw / 2, base - bh - 110 * scale), (x0 + bw, base - bh)], fill=roof)
            for r in range(4):
                for c in range(2):
                    wx = x0 + 50 * scale + c * 120 * scale
                    wy = base - bh + 70 * scale + r * 130 * scale
                    window(d, [wx, wy, wx + 70 * scale, wy + 95 * scale], lit if rng.random() > 0.35 else hex2rgb("#9FB3C2"), frame)
        return
    x0, x1 = cx - hw / 2, cx + hw / 2
    if style == "barn":
        hw *= 1.3
        x0, x1 = cx - hw / 2, cx + hw / 2
    d.rectangle([x0, base - hh, x1, base], fill=wall)
    if style in ("cabin", "marsh"):
        for k in range(int(hh / (24 * scale))):
            y = base - k * 24 * scale
            d.line([(x0, y), (x1, y)], fill=shade(wall, 0.85), width=max(1, int(3 * scale)))
    if style == "barn":
        for k in range(60):
            sx, sy = rng.uniform(x0, x1 - 40 * scale), rng.uniform(base - hh, base - 20 * scale)
            d.rounded_rectangle([sx, sy, sx + 46 * scale, sy + 22 * scale], radius=6 * scale, fill=shade(wall, rng.uniform(0.88, 1.06)))
    pitch = 200 * scale if style != "lodge" else 280 * scale
    d.polygon([(x0 - 30 * scale, base - hh), (cx, base - hh - pitch), (x1 + 30 * scale, base - hh)], fill=roof)
    if style == "cottage":
        d.rectangle([x1 - 120 * scale, base - hh - pitch * 0.85, x1 - 80 * scale, base - hh - pitch * 0.3], fill=shade(wall, 0.9))
    if style == "lodge":
        # big glass gable
        gp = [(cx - 160 * scale, base - hh + 20 * scale), (cx, base - hh - pitch * 0.7), (cx + 160 * scale, base - hh + 20 * scale)]
        d.polygon(gp, fill=lit)
        d.line([(cx, base - hh - pitch * 0.7), (cx, base - hh + 20 * scale)], fill=frame, width=int(8 * scale))
    # windows + door
    ww, wh = 80 * scale, 100 * scale
    for i, fx in enumerate([0.16, 0.38, 0.74]):
        wx = x0 + (x1 - x0) * fx
        window(d, [wx, base - hh + 60 * scale, wx + ww, base - hh + 60 * scale + wh], lit if i != 1 or style == "lodge" else hex2rgb("#A8BCC8"), frame)
    if style == "barn":
        d.rounded_rectangle([cx - 90 * scale, base - 230 * scale, cx + 90 * scale, base], radius=80 * scale, fill=lit)
        d.line([(cx, base - 230 * scale), (cx, base)], fill=frame, width=int(10 * scale))
    else:
        dx = x0 + (x1 - x0) * 0.56
        d.rectangle([dx, base - 170 * scale, dx + 70 * scale, base], fill=hex2rgb(theme.get("door", "#5B6B4E")))
        d.ellipse([dx + 50 * scale, base - 90 * scale, dx + 58 * scale, base - 82 * scale], fill=hex2rgb("#D8B76A"))


def finish(img, label, out):
    img = img.convert("RGB")
    # vignette
    vig = Image.new("L", img.size, 255)
    vd = ImageDraw.Draw(vig)
    for i in range(60):
        v = int(255 - 70 * (1 - i / 60) ** 2)
        vd.rectangle([i * CW / 160, i * CH / 160, CW - i * CW / 160, CH - i * CH / 160], outline=v, width=int(CW / 160) + 1)
    vig = vig.filter(ImageFilter.GaussianBlur(60))
    dark = Image.new("RGB", img.size, (20, 16, 12))
    img = Image.composite(img, dark, vig)
    img = img.resize((W, H), Image.LANCZOS)
    # subtle grain
    noise = Image.effect_noise((W, H), 18).convert("RGB")
    img = Image.blend(img, noise, 0.018)
    img = ImageEnhance.Color(img).enhance(1.18)
    img = ImageEnhance.Contrast(img).enhance(1.06)
    d = ImageDraw.Draw(img, "RGBA")
    f = font(22)
    text = "Placeholder image · " + label
    tw = d.textlength(text, font=f)
    d.rounded_rectangle([48, H - 88, 48 + tw + 32, H - 48], radius=20, fill=(255, 255, 255, 215))
    d.text((64, H - 81), text, font=f, fill=(40, 34, 28))
    img.save(out, "JPEG", quality=86, optimize=True, progressive=True)


# ---------------------------------------------------------------- interiors

def room(theme, rng, kind):
    img = Image.new("RGBA", (CW, CH), (0, 0, 0, 255))
    wall = hex2rgb(theme["interior_wall"])
    floor = hex2rgb(theme["floor"])
    accent = hex2rgb(theme["accent"])
    fy = int(CH * 0.68)
    vgradient(img, (0, 0, CW, fy), shade(wall, 1.05), shade(wall, 0.92))
    vgradient(img, (0, fy, CW, CH), shade(floor, 1.0), shade(floor, 0.8))
    d = ImageDraw.Draw(img)
    for k in range(14):  # floorboards
        x = k * CW / 13
        d.line([(CW / 2 + (x - CW / 2) * 0.55, fy), (x - CW * 0.1 + k * 20, CH)], fill=shade(floor, 0.88), width=2 * SS)
    # window with landscape
    wx0, wy0, wx1, wy1 = int(CW * 0.52), int(CH * 0.12), int(CW * 0.9), int(CH * 0.56)
    view = landscape(theme, random.Random(rng.random()), size=(wx1 - wx0, wy1 - wy0), horizon=0.62)
    img.alpha_composite(view, (wx0, wy0))
    d = ImageDraw.Draw(img)
    fr = hex2rgb(theme.get("frame", "#F3EEE6"))
    d.rectangle([wx0, wy0, wx1, wy1], outline=fr, width=22 * SS // 2)
    d.line([((wx0 + wx1) / 2, wy0), ((wx0 + wx1) / 2, wy1)], fill=fr, width=10 * SS)
    d.rectangle([wx0 - 30, wy1, wx1 + 30, wy1 + 26], fill=shade(fr, 0.95))
    # light patch from window
    lp = Image.new("RGBA", (CW, CH), (255, 240, 210, 0))
    ImageDraw.Draw(lp).polygon([(wx0, fy + 20), (wx1, fy + 20), (wx1 - 200, CH), (wx0 - 500, CH)], fill=(255, 240, 210, 50))
    img.alpha_composite(lp.filter(ImageFilter.GaussianBlur(30)))
    d = ImageDraw.Draw(img)
    if kind == "living":
        # rug
        d.ellipse([CW * 0.12, CH * 0.78, CW * 0.72, CH * 0.98], fill=shade(accent, 1.45))
        # sofa
        sx0, sx1, sy = CW * 0.08, CW * 0.5, CH * 0.5
        sofa = hex2rgb(theme["sofa"])
        d.rounded_rectangle([sx0, sy, sx1, sy + CH * 0.12], radius=40, fill=shade(sofa, 0.92))
        d.rounded_rectangle([sx0 - 20, sy + CH * 0.09, sx1 + 20, sy + CH * 0.22], radius=40, fill=sofa)
        d.rounded_rectangle([sx0 - 50, sy + CH * 0.06, sx0 + 50, sy + CH * 0.22], radius=34, fill=shade(sofa, 0.85))
        d.rounded_rectangle([sx1 - 50, sy + CH * 0.06, sx1 + 50, sy + CH * 0.22], radius=34, fill=shade(sofa, 0.85))
        for k, c in enumerate([accent, shade(accent, 1.4), hex2rgb("#EDE4D3")]):
            px = sx0 + 80 + k * 210
            d.rounded_rectangle([px, sy + 30, px + 170, sy + 150], radius=30, fill=c)
        # coffee table
        d.rounded_rectangle([CW * 0.22, CH * 0.8, CW * 0.48, CH * 0.84], radius=20, fill=hex2rgb("#8A6A4A"))
        d.rectangle([CW * 0.24, CH * 0.84, CW * 0.25, CH * 0.9], fill=hex2rgb("#6E543A"))
        d.rectangle([CW * 0.45, CH * 0.84, CW * 0.46, CH * 0.9], fill=hex2rgb("#6E543A"))
        # framed art
        d.rectangle([CW * 0.18, CH * 0.14, CW * 0.38, CH * 0.38], fill=hex2rgb("#3B342C"))
        art = landscape(theme, random.Random(rng.random()), size=(int(CW * 0.18), int(CH * 0.2)), horizon=0.55)
        img.alpha_composite(art, (int(CW * 0.19), int(CH * 0.16)))
        d = ImageDraw.Draw(img)
        # floor lamp + plant
        d.line([(CW * 0.04, CH * 0.28), (CW * 0.04, CH * 0.74)], fill=hex2rgb("#3B342C"), width=8 * SS)
        d.polygon([(CW * 0.01, CH * 0.3), (CW * 0.07, CH * 0.3), (CW * 0.06, CH * 0.22), (CW * 0.02, CH * 0.22)], fill=hex2rgb("#F1E3C4"))
        d.rounded_rectangle([CW * 0.9, CH * 0.62, CW * 0.97, CH * 0.74], radius=16, fill=hex2rgb("#C9B79C"))
        for k in range(9):
            ang = -math.pi / 2 + (k - 4) * 0.28
            ex, ey = CW * 0.935 + math.cos(ang) * 190, CH * 0.62 + math.sin(ang) * 260
            d.line([(CW * 0.935, CH * 0.62), (ex, ey)], fill=hex2rgb("#4E6B47"), width=14 * SS)
            d.ellipse([ex - 34, ey - 22, ex + 34, ey + 22], fill=hex2rgb("#5E7F55"))
    elif kind == "bedroom":
        bed = hex2rgb("#F7F3EC")
        hb = hex2rgb(theme["sofa"])
        bx0, bx1 = CW * 0.08, CW * 0.48
        d.rounded_rectangle([bx0 - 30, CH * 0.36, bx1 + 30, CH * 0.72], radius=40, fill=hb)
        d.rounded_rectangle([bx0 - 60, CH * 0.6, bx1 + 60, CH * 0.92], radius=30, fill=bed)
        d.rounded_rectangle([bx0 - 60, CH * 0.74, bx1 + 60, CH * 0.92], radius=30, fill=shade(accent, 1.35))
        for k in range(2):
            px = bx0 + 30 + k * (bx1 - bx0) / 2
            d.rounded_rectangle([px, CH * 0.5, px + (bx1 - bx0) / 2 - 60, CH * 0.64], radius=40, fill=hex2rgb("#FFFFFF"))
        for tx in (bx0 - 260, bx1 + 90):
            d.rounded_rectangle([tx, CH * 0.6, tx + 170, CH * 0.76], radius=12, fill=hex2rgb("#9C7B58"))
            d.line([(tx + 85, CH * 0.5), (tx + 85, CH * 0.6)], fill=hex2rgb("#3B342C"), width=5 * SS)
            d.polygon([(tx + 30, CH * 0.5), (tx + 140, CH * 0.5), (tx + 115, CH * 0.43), (tx + 55, CH * 0.43)], fill=hex2rgb("#F1E3C4"))
            glow(img, (int(tx + 85), int(CH * 0.47)), 8, (255, 230, 170), 0.3)
            d = ImageDraw.Draw(img)
    else:  # kitchen
        cab = hex2rgb(theme["cabinet"])
        top = hex2rgb("#EFEBE4")
        d.rectangle([0, CH * 0.44, CW * 0.48, CH * 0.68], fill=cab)
        d.rectangle([0, CH * 0.42, CW * 0.5, CH * 0.45], fill=top)
        for k in range(5):
            x = k * CW * 0.096
            d.rectangle([x + 10, CH * 0.47, x + CW * 0.09, CH * 0.66], outline=shade(cab, 0.85), width=4 * SS)
            d.line([(x + CW * 0.045 - 30, CH * 0.5), (x + CW * 0.045 + 30, CH * 0.5)], fill=hex2rgb("#C9A86A"), width=5 * SS)
        d.rectangle([0, CH * 0.06, CW * 0.44, CH * 0.26], fill=cab)
        for k in range(4):
            x = k * CW * 0.11
            d.rectangle([x + 10, CH * 0.08, x + CW * 0.1, CH * 0.24], outline=shade(cab, 0.85), width=4 * SS)
        # tiles
        for r in range(6):
            for c in range(22):
                x, y = c * CW * 0.022, CH * 0.27 + r * CH * 0.025
                if x < CW * 0.48:
                    d.rectangle([x, y, x + CW * 0.021, y + CH * 0.024], fill=shade(hex2rgb("#F5F1EA"), 0.97 + 0.03 * ((r + c) % 2)))
        # island
        d.rectangle([CW * 0.2, CH * 0.7, CW * 0.8, CH * 0.95], fill=shade(cab, 0.9))
        d.rectangle([CW * 0.18, CH * 0.67, CW * 0.82, CH * 0.71], fill=top)
        # bowl of lemons
        d.ellipse([CW * 0.45, CH * 0.62, CW * 0.55, CH * 0.69], fill=hex2rgb("#3F4A54"))
        for k in range(4):
            lx = CW * 0.46 + k * 50
            d.ellipse([lx, CH * 0.6, lx + 60, CH * 0.645], fill=hex2rgb("#E8C547"))
        # pendants
        for px in (0.35, 0.5, 0.65):
            d.line([(CW * px, 0), (CW * px, CH * 0.36)], fill=hex2rgb("#2D2A26"), width=3 * SS)
            d.pieslice([CW * px - 70, CH * 0.33, CW * px + 70, CH * 0.43], 180, 360, fill=hex2rgb("#2D2A26"))
            glow(img, (int(CW * px), int(CH * 0.385)), 12, (255, 226, 160), 0.4)
            d = ImageDraw.Draw(img)
        # stools
        for sx in (0.3, 0.5, 0.7):
            d.line([(CW * sx, CH * 0.82), (CW * sx - 40, CH)], fill=hex2rgb("#6E543A"), width=8 * SS)
            d.line([(CW * sx, CH * 0.82), (CW * sx + 40, CH)], fill=hex2rgb("#6E543A"), width=8 * SS)
            d.ellipse([CW * sx - 70, CH * 0.8, CW * sx + 70, CH * 0.84], fill=hex2rgb("#8A6A4A"))
    return img


# ---------------------------------------------------------------- scenes

URBAN = dict(
    sky=("#9DB9D3", "#EEE4D6"), sun="#FFF2DA", sun_x=0.75, sun_y=0.24, clouds=4,
    hills=("#A7B3B5", "#8F9E9A"), ground="#8E9C7E", hill_amp=0.02, city=("#9AA5B1", "#7D8794"),
    house="block", wall="#C9B9A6", roof="#3A4250", door="#0F1F33",
    interior_wall="#EEEAE3", floor="#B89470", accent="#0F1F33", sofa="#C9C3B8", cabinet="#E7E2D9", trees="round", frame="#F5F2EC",
)

AREA_THEMES = {
    "wembley": dict(URBAN, landmark="arch", wall="#D6CCBE", accent="#1F3A5F"),
    "cockfosters": dict(URBAN, hills=("#9EB39A", "#7F9C77"), ground="#6E8E5E", hill_amp=0.04, wall="#B7714F", house="block", accent="#3E5B45", sofa="#B9AE9C"),
    "harrow": dict(URBAN, landmark="spire", hills=("#A8B8A0", "#8AA383"), ground="#7E9A6A", wall="#A9603F", house="terrace", accent="#C8962E", sofa="#D8D0C2"),
    "hounslow": dict(URBAN, landmark="plane", sky=("#A9C3DA", "#F0E6D8"), wall="#E2DCD2", accent="#6B4E2E", sofa="#4A5568", cabinet="#3A4250"),
}

# Ten apartments: (area, number, house style)
APARTMENTS = [
    ("wembley", 1, "block"), ("wembley", 2, "block"),
    ("cockfosters", 1, "terrace"), ("cockfosters", 2, "block"),
    ("harrow", 1, "terrace"), ("harrow", 2, "block"), ("harrow", 3, "terrace"), ("harrow", 4, "block"),
    ("hounslow", 1, "block"), ("hounslow", 2, "block"),
]

THEMES = {}
for area, n, style in APARTMENTS:
    t = dict(AREA_THEMES[area], house=style)
    THEMES[f"{area}-apartment-{n}"] = t


def exterior(theme, rng):
    img = landscape(theme, rng, horizon=0.6 if theme.get("water") else 0.62)
    gy = 0.74 if theme.get("water") else 0.7
    ground(img, theme, rng, gy)
    d = ImageDraw.Draw(img)
    tcol = shade(hex2rgb(theme["ground"]), 0.6)
    if theme["trees"] == "pine":
        for k in range(12):
            x = rng.uniform(0, CW)
            if abs(x - CW * 0.5) > 520:
                pine(d, x, CH * gy + rng.uniform(10, 60), rng.uniform(380, 640), shade(tcol, rng.uniform(0.8, 1.1)))
    elif theme["trees"] == "round":
        for x in (CW * 0.08, CW * 0.18, CW * 0.86, CW * 0.95):
            round_tree(d, x, CH * gy + 40, rng.uniform(420, 560), shade(tcol, rng.uniform(0.9, 1.15)))
    house(d, theme, CW * 0.5, CH * gy + 40, 1.6, rng)
    # path
    d.polygon([(CW * 0.5, CH * gy + 40), (CW * 0.53, CH * gy + 40), (CW * 0.62, CH), (CW * 0.42, CH)], fill=shade(hex2rgb(theme["ground"]), 1.2))
    return img


def view(theme, rng):
    t = dict(theme)
    img = landscape(t, rng, horizon=0.55)
    if not t.get("water"):
        ground(img, t, rng, 0.8)
        d = ImageDraw.Draw(img)
        tcol = shade(hex2rgb(t["ground"]), 0.6)
        for k in range(18):
            x = rng.uniform(0, CW)
            if t["trees"] == "round":
                round_tree(d, x, CH * 0.8 + rng.uniform(0, 30), rng.uniform(160, 260), shade(tcol, rng.uniform(0.9, 1.2)))
            else:
                pine(d, x, CH * 0.8 + rng.uniform(0, 30), rng.uniform(160, 300), shade(tcol, rng.uniform(0.8, 1.1)))
    else:
        d = ImageDraw.Draw(img)
        # small sailing boat
        bx, by = CW * 0.3, CH * 0.68
        d.polygon([(bx - 90, by), (bx + 90, by), (bx + 60, by + 30), (bx - 60, by + 30)], fill=hex2rgb("#5A3E2B"))
        d.polygon([(bx, by - 200), (bx, by - 6), (bx + 110, by - 6)], fill=hex2rgb("#FAF6EE"))
        d.polygon([(bx - 6, by - 170), (bx - 6, by - 6), (bx - 80, by - 6)], fill=hex2rgb("#E9DFCD"))
    return img


def main(out_dir):
    os.makedirs(out_dir, exist_ok=True)
    for slug, theme in THEMES.items():
        rng = random.Random(slug)
        shots = [
            ("exterior", exterior, "Exterior"),
            ("living", lambda t, r: room(t, r, "living"), "Living room"),
            ("bedroom", lambda t, r: room(t, r, "bedroom"), "Bedroom"),
            ("kitchen", lambda t, r: room(t, r, "kitchen"), "Kitchen"),
            ("view", view, "Surroundings"),
        ]
        for key, fn, label in shots:
            path = os.path.join(out_dir, f"{slug}-{key}.jpg")
            finish(fn(theme, rng), label, path)
            print("wrote", path)
    # homepage hero + experiences
    hero = dict(AREA_THEMES["wembley"], sun_x=0.3, sun_y=0.3, sky=("#E9B98F", "#F7E2C6"), sun="#FFF1D8")
    finish(view(hero, random.Random("hero")), "Homepage hero", os.path.join(out_dir, "home-hero.jpg"))
    finish(view(AREA_THEMES["wembley"], random.Random("events")), "Experience", os.path.join(out_dir, "exp-coast.jpg"))
    finish(view(AREA_THEMES["cockfosters"], random.Random("park")), "Experience", os.path.join(out_dir, "exp-walks.jpg"))
    finish(view(AREA_THEMES["hounslow"], random.Random("travel")), "Experience", os.path.join(out_dir, "exp-food.jpg"))
    finish(exterior(dict(AREA_THEMES["harrow"]), random.Random("about")), "About", os.path.join(out_dir, "about.jpg"))

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "seed-images")
