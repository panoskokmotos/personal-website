#!/usr/bin/env python3
"""Generate OG image for panoskokmotos.com — 1200x630px"""

import sys
import os
import math
import urllib.request
from pathlib import Path

from posthog_utils import get_developer_id, initialize_posthog

try:
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
except ImportError:
    sys.exit("Pillow is required to generate the OG image. Install it with:\n"
             "    pip install Pillow")

# Repo-relative — runs on any machine (was hard-coded to the author's Mac).
BASE = str(Path(__file__).resolve().parent)
FONT_DIR = os.path.join(BASE, "_og_fonts")


def download_fonts():
    """Download Inter from Google Fonts if not already cached."""
    os.makedirs(FONT_DIR, exist_ok=True)
    fonts = {
        "Inter-Bold.ttf":    "https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Bold.ttf",
        "Inter-SemiBold.ttf":"https://github.com/rsms/inter/raw/master/docs/font-files/Inter-SemiBold.ttf",
        "Inter-Regular.ttf": "https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Regular.ttf",
        "Inter-Medium.ttf":  "https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Medium.ttf",
    }
    for name, url in fonts.items():
        dest = os.path.join(FONT_DIR, name)
        if not os.path.exists(dest):
            print(f"Downloading {name}…")
            try:
                urllib.request.urlretrieve(url, dest)
            except Exception as e:
                print(f"  Failed: {e}")


def load_font(size, weight="regular"):
    """Load Inter font by weight, fallback to system fonts."""
    weight_map = {
        "bold":     ["Inter-Bold.ttf", "Inter-ExtraBold.ttf"],
        "semibold": ["Inter-SemiBold.ttf", "Inter-Bold.ttf"],
        "medium":   ["Inter-Medium.ttf", "Inter-SemiBold.ttf"],
        "regular":  ["Inter-Regular.ttf", "Inter-Medium.ttf"],
    }
    candidates = weight_map.get(weight, weight_map["regular"])

    # Try downloaded Inter fonts first
    for name in candidates:
        path = os.path.join(FONT_DIR, name)
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                pass

    # macOS system fonts
    system = {
        "bold": [
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
            "/Library/Fonts/Arial Bold.ttf",
        ],
        "regular": [
            "/System/Library/Fonts/Supplemental/Arial.ttf",
            "/Library/Fonts/Arial.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
        ],
    }
    key = "bold" if weight in ("bold", "semibold") else "regular"
    for path in system.get(key, []):
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                pass
    return ImageFont.load_default()


def circle_crop(img, size):
    """Crop image to a circle of given diameter, return RGBA."""
    img = img.convert("RGBA").resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, size, size], fill=255)
    result = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    result.paste(img, (0, 0), mask)
    return result


def make_og_image():
    download_fonts()

    W, H = 1200, 630
    img = Image.new("RGBA", (W, H), (13, 21, 48, 255))

    # ── Radial blue glow (left-center) ───────────────────────────────────────
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gcx, gcy, gr = 380, 300, 420
    for i in range(60, 0, -1):
        r = int(gr * i / 60)
        alpha = int(22 * (i / 60) ** 2)
        gd.ellipse([gcx - r, gcy - r, gcx + r, gcy + r], fill=(59, 110, 248, alpha))
    img = Image.alpha_composite(img, glow)

    # ── Right-side dark vignette (x=700→1200) ────────────────────────────────
    grad = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    grd = ImageDraw.Draw(grad)
    for px in range(W - 700):
        t = px / (W - 700)
        alpha = int(180 * (t ** 0.7))
        col = int(8 + (5 - 8) * t)
        grd.line([(700 + px, 0), (700 + px, H)], fill=(col, col + 5, col + 23, alpha))
    img = Image.alpha_composite(img, grad)

    # ── Dot grid texture ─────────────────────────────────────────────────────
    dots = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dd = ImageDraw.Draw(dots)
    for x in range(10, W, 30):
        for y in range(10, H, 30):
            dd.ellipse([x - 1, y - 1, x + 1, y + 1], fill=(255, 255, 255, 7))
    img = Image.alpha_composite(img, dots)

    draw = ImageDraw.Draw(img)

    # ── Top accent bar ────────────────────────────────────────────────────────
    draw.rectangle([0, 0, W, 4], fill=(59, 110, 248, 255))

    # ── Photo circle (cx=930, cy=315, r=190) ─────────────────────────────────
    pcx, pcy, pr = 930, 315, 190

    # Soft outer glow
    glow2 = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd2 = ImageDraw.Draw(glow2)
    for r in range(pr + 30, pr - 5, -2):
        frac = (pr + 30 - r) / 35
        al = int(60 * math.exp(-frac * 2.5))
        gd2.ellipse([pcx - r, pcy - r, pcx + r, pcy + r],
                    outline=(59, 110, 248, al), width=2)
    img = Image.alpha_composite(img, glow2)
    draw = ImageDraw.Draw(img)

    # Try to load and composite headshot
    headshot_path = os.path.join(BASE, "assets", "headshot.webp")
    headshot_loaded = False
    if os.path.exists(headshot_path):
        try:
            hs = Image.open(headshot_path)
            diameter = pr * 2
            hs_circle = circle_crop(hs, diameter)
            # Paste at circle center
            img.paste(hs_circle, (pcx - pr, pcy - pr), hs_circle)
            headshot_loaded = True
            draw = ImageDraw.Draw(img)
        except Exception as e:
            print(f"Could not load headshot: {e}")

    if not headshot_loaded:
        draw.ellipse([pcx - pr, pcy - pr, pcx + pr, pcy + pr], fill=(10, 18, 40, 255))

    # Ring overlay on photo
    draw.ellipse([pcx - pr, pcy - pr, pcx + pr, pcy + pr],
                 outline=(59, 110, 248, 200), width=3)
    # Thin inner ring
    draw.ellipse([pcx - pr + 6, pcy - pr + 6, pcx + pr - 6, pcy + pr - 6],
                 outline=(255, 255, 255, 18), width=1)

    # ── Fonts ─────────────────────────────────────────────────────────────────
    font_url    = load_font(13, "medium")
    font_name   = load_font(68, "bold")
    font_title  = load_font(23, "regular")
    font_badge  = load_font(13, "medium")
    font_stats  = load_font(15, "regular")
    font_bot    = load_font(13, "regular")

    # ── URL label ─────────────────────────────────────────────────────────────
    url_chars = list("panoskokmotos.com")
    url_text = "  ".join(url_chars).upper()
    draw.text((72, 44), url_text, font=font_url, fill=(255, 255, 255, 55))

    # ── Name ──────────────────────────────────────────────────────────────────
    draw.text((72, 172), "Panos Kokmotos", font=font_name, fill=(255, 255, 255, 242))

    # ── Subtitle ──────────────────────────────────────────────────────────────
    draw.text((72, 258), "Co-Founder & COO, Givelink", font=font_title,
              fill=(255, 255, 255, 160))

    # ── Pill badges ───────────────────────────────────────────────────────────
    badges = ["Forbes 30 Under 30", "WEF Global Shaper", "Entrepreneurship Talks"]
    pad_x, pad_y = 16, 7
    bx, by = 72, 308

    pill_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pl = ImageDraw.Draw(pill_layer)
    pill_text_positions = []

    for text in badges:
        bb = font_badge.getbbox(text)
        tw, th = bb[2] - bb[0], bb[3] - bb[1]
        pw, ph = tw + pad_x * 2, th + pad_y * 2
        pl.rounded_rectangle([bx, by, bx + pw, by + ph], radius=999,
                              fill=(20, 38, 90, 220))
        pl.rounded_rectangle([bx, by, bx + pw, by + ph], radius=999,
                              outline=(59, 110, 248, 160), width=1)
        pill_text_positions.append((bx + pad_x - bb[0], by + pad_y - bb[1], text))
        bx += pw + 12

    img = Image.alpha_composite(img, pill_layer)
    draw = ImageDraw.Draw(img)

    for tx, ty, text in pill_text_positions:
        draw.text((tx, ty), text, font=font_badge, fill=(110, 158, 255, 255))

    # ── Divider ───────────────────────────────────────────────────────────────
    draw.rectangle([72, 368, 730, 369], fill=(255, 255, 255, 18))

    # ── Stats ─────────────────────────────────────────────────────────────────
    stats = "100K+ lives impacted  ·  $220K+ donated  ·  100+ nonprofits"
    draw.text((72, 386), stats, font=font_stats, fill=(255, 255, 255, 110))

    # ── Bottom bar ────────────────────────────────────────────────────────────
    # Subtle separator line
    draw.rectangle([0, 588, W, 589], fill=(255, 255, 255, 8))
    draw.rectangle([0, 589, W, H], fill=(6, 11, 28, 255))

    left_bot = "Building for social impact  ·  San Francisco & Athens"
    right_bot = "Forbes 30 Under 30  ·  WEF Global Shaper  ·  Givelink"

    draw.text((72, 602), left_bot, font=font_bot, fill=(255, 255, 255, 120))

    rb = font_bot.getbbox(right_bot)
    rw = rb[2] - rb[0]
    draw.text((W - 72 - rw, 602), right_bot, font=font_bot, fill=(255, 255, 255, 70))

    # ── Save ──────────────────────────────────────────────────────────────────
    out = os.path.join(BASE, "og-image.png")
    img.convert("RGB").save(out, "PNG", optimize=True)
    size = os.path.getsize(out)
    print(f"✓ OG image saved: {out}")
    print(f"  Size: {size:,} bytes ({size / 1024:.1f} KB) · 1200×630px")
    if headshot_loaded:
        print("  ✓ Headshot composited from assets/headshot.webp")
    else:
        print("  ⚠ Using placeholder circle (headshot not found)")

    return {"headshot_loaded": headshot_loaded, "file_size_bytes": size}


if __name__ == "__main__":
    stats = make_og_image()

    posthog = initialize_posthog()
    if posthog:
        dev_id = get_developer_id()
        posthog.capture(distinct_id=dev_id, event="og_image_generated", properties={
            "headshot_loaded": stats["headshot_loaded"],
            "file_size_bytes": stats["file_size_bytes"],
        })
        posthog.shutdown()
