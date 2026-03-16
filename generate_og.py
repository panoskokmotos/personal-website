#!/usr/bin/env python3
"""
OG Image Generator for panoskokmotos.com
1200x630px dark navy background with headshot photo avatar
"""

from PIL import Image, ImageDraw, ImageFilter, ImageFont
import math
import os

# ── Constants ───────────────────────────────────────────────────────────────
W, H = 1200, 630
BG_COLOR        = (10, 18, 34)        # #0a1222
BLUE_ACCENT     = (59, 130, 246)      # #3b82f6
BLUE_LIGHT      = (147, 180, 255)     # #93b4ff
BLUE_GLOW       = (96, 165, 250)      # #60a5fa
MUTED           = (100, 116, 139)     # #64748b
WHITE           = (255, 255, 255)
PILL_BG         = (15, 28, 55)        # slightly lighter navy
PILL_BORDER     = (30, 58, 95)

OUT_PATH        = "/Users/panoskokmotos/Documents/GitHub/1st-Project/og-image.png"
HEADSHOT_PATH   = "/Users/panoskokmotos/Documents/GitHub/1st-Project/assets/headshot.jpg"

# ── Helpers ──────────────────────────────────────────────────────────────────

def make_circular_avatar(img_path: str, size: int) -> Image.Image:
    """Load image, crop to square centre, resize, apply circular mask."""
    src = Image.open(img_path).convert("RGBA")
    # Square crop from centre
    sw, sh = src.size
    side = min(sw, sh)
    left = (sw - side) // 2
    top  = (sh - side) // 2
    src  = src.crop((left, top, left + side, top + side))
    src  = src.resize((size, size), Image.LANCZOS)

    # Circular mask
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    src.putalpha(mask)
    return src


def draw_glow_rings(draw: ImageDraw.ImageDraw, cx: int, cy: int,
                    inner_r: int, color_rgba, num_rings: int = 4,
                    ring_gap: int = 14, max_alpha: int = 180):
    """Draw concentric ellipses to simulate a glow effect."""
    for i in range(num_rings):
        r     = inner_r + (i + 1) * ring_gap
        alpha = int(max_alpha * (1 - i / num_rings) ** 1.5)
        rgba  = (*color_rgba[:3], alpha)
        # Draw thick ring as filled circle minus inner circle (layered transparency)
        ring_img  = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ring_draw = ImageDraw.Draw(ring_img)
        ring_draw.ellipse(
            (cx - r, cy - r, cx + r, cy + r),
            fill=None,
            outline=rgba,
            width=max(1, 4 - i),
        )
        draw._image.alpha_composite(ring_img)


def get_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    """Try common system fonts, fall back to default."""
    candidates_bold = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/SFNSDisplay-Bold.otf",
        "/Library/Fonts/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Trebuchet MS Bold.ttf",
    ]
    candidates_regular = [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/SFNSText.otf",
        "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Trebuchet MS.ttf",
    ]
    candidates = candidates_bold if bold else candidates_regular
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def draw_rounded_rect(draw: ImageDraw.ImageDraw, xy, radius: int,
                      fill=None, outline=None, width: int = 1):
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius,
                            fill=fill, outline=outline, width=width)


# ── Main ─────────────────────────────────────────────────────────────────────

def generate():
    canvas = Image.new("RGBA", (W, H), BG_COLOR + (255,))
    draw   = ImageDraw.Draw(canvas)

    # ── Subtle grid / dot pattern background ─────────────────────────────────
    dot_color = (255, 255, 255, 18)
    for gx in range(0, W, 40):
        for gy in range(0, H, 40):
            dot_img  = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            dot_draw = ImageDraw.Draw(dot_img)
            dot_draw.ellipse((gx - 1, gy - 1, gx + 1, gy + 1), fill=dot_color)
            canvas.alpha_composite(dot_img)

    # ── Ambient blue glow top-right ───────────────────────────────────────────
    glow_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    glow_draw  = ImageDraw.Draw(glow_layer)
    for r in range(280, 0, -4):
        alpha = int(55 * (1 - r / 280) ** 2)
        glow_draw.ellipse(
            (W - 500 - r, -r, W - 500 + r, r),
            fill=(*BLUE_ACCENT[:3], alpha),
        )
    canvas.alpha_composite(glow_layer)

    # ── LEFT COLUMN ───────────────────────────────────────────────────────────
    lx = 72   # left margin
    ty = 110  # top of text block

    # Name
    font_name = get_font(58, bold=True)
    draw.text((lx, ty), "Panos Kokmotos", font=font_name, fill=WHITE)

    # Blue underline beneath name
    name_bbox = draw.textbbox((lx, ty), "Panos Kokmotos", font=font_name)
    underline_y = name_bbox[3] + 6
    draw.rectangle([lx, underline_y, lx + 260, underline_y + 4],
                   fill=BLUE_ACCENT)

    # Tagline
    font_tag = get_font(22, bold=False)
    tag_y = underline_y + 20
    draw.text((lx, tag_y), "Advocate · Changemaker · Builder",
              font=font_tag, fill=BLUE_LIGHT)

    # Sub-details
    font_sub  = get_font(17, bold=False)
    details   = [
        "MSc Candidate, University of Amsterdam",
        "Founder · Product Leader · Social Entrepreneur",
    ]
    sub_y = tag_y + 44
    for line in details:
        draw.text((lx, sub_y), line, font=font_sub, fill=MUTED)
        sub_y += 28

    # Website pill
    pill_text  = "panoskokmotos.com"
    font_pill  = get_font(16, bold=False)
    pw = draw.textlength(pill_text, font=font_pill)
    pill_x0, pill_y0 = lx, sub_y + 20
    pill_x1, pill_y1 = pill_x0 + pw + 28, pill_y0 + 34
    draw_rounded_rect(draw, (pill_x0, pill_y0, pill_x1, pill_y1),
                      radius=17, fill=PILL_BG, outline=BLUE_ACCENT, width=2)
    # dot indicator
    dot_cx = pill_x0 + 14
    dot_cy = (pill_y0 + pill_y1) // 2
    draw.ellipse((dot_cx - 4, dot_cy - 4, dot_cx + 4, dot_cy + 4),
                 fill=BLUE_ACCENT)
    draw.text((pill_x0 + 24, pill_y0 + 8), pill_text,
              font=font_pill, fill=BLUE_LIGHT)

    # ── BOTTOM BADGES ─────────────────────────────────────────────────────────
    badges = [
        ("🎓", "MSc @ UvA"),
        ("🚀", "Founder × 2"),
        ("🌍", "Social Impact"),
    ]
    font_badge = get_font(15, bold=False)
    bx = lx
    by = H - 90
    badge_gap = 20
    for icon, label in badges:
        text   = f"{icon}  {label}"
        tw     = draw.textlength(text, font=font_badge)
        bx1    = bx + tw + 32
        draw_rounded_rect(draw, (bx, by, bx1, by + 40),
                          radius=20, fill=PILL_BG, outline=PILL_BORDER, width=1)
        draw.text((bx + 14, by + 10), text, font=font_badge, fill=BLUE_LIGHT)
        bx = bx1 + badge_gap

    # ── RIGHT COLUMN — headshot ───────────────────────────────────────────────
    AVATAR_R  = 168          # radius of the circular crop
    AVATAR_D  = AVATAR_R * 2
    cx = W - 220             # centre x
    cy = H // 2              # centre y

    # Glow rings behind avatar (draw onto canvas directly via composite)
    for i in range(5):
        ring_r  = AVATAR_R + 20 + i * 16
        alpha   = int(160 * (1 - i / 5) ** 2)
        ring_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ring_draw  = ImageDraw.Draw(ring_layer)
        ring_draw.ellipse(
            (cx - ring_r, cy - ring_r, cx + ring_r, cy + ring_r),
            fill=None,
            outline=(*BLUE_GLOW, alpha),
            width=max(1, 5 - i),
        )
        canvas.alpha_composite(ring_layer)

    # Blue border ring (solid, just inside glow)
    border_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    border_draw  = ImageDraw.Draw(border_layer)
    border_r     = AVATAR_R + 8
    border_draw.ellipse(
        (cx - border_r, cy - border_r, cx + border_r, cy + border_r),
        fill=None, outline=(*BLUE_ACCENT, 255), width=4,
    )
    canvas.alpha_composite(border_layer)

    # Circular avatar
    avatar = make_circular_avatar(HEADSHOT_PATH, AVATAR_D)
    avatar_x = cx - AVATAR_R
    avatar_y = cy - AVATAR_R
    canvas.alpha_composite(avatar, dest=(avatar_x, avatar_y))

    # ── Save ──────────────────────────────────────────────────────────────────
    canvas = canvas.convert("RGB")
    canvas.save(OUT_PATH, "PNG", optimize=True)
    print(f"Saved: {OUT_PATH}  ({W}x{H}px)")


if __name__ == "__main__":
    generate()
