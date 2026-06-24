from pathlib import Path
from math import cos, sin, pi

from PIL import Image, ImageDraw, ImageFont, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "store-assets"
ICON_SRC = ROOT / "icons" / "icon-128.png"

BG = (18, 25, 33)
BG_2 = (30, 44, 58)
BLUE = (64, 149, 225)
CYAN = (95, 203, 255)
GREEN = (107, 221, 154)
WHITE = (246, 249, 252)
MUTED = (180, 193, 207)
DARK = (10, 14, 19)
CARD = (38, 49, 62)
HIDDEN = (83, 95, 110)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial Bold.ttf" if bold else "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Helvetica.ttc",
        "/System/Library/Fonts/Supplemental/DejaVu Sans Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/DejaVu Sans.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size=size)
    return ImageFont.load_default(size=size)


def rounded_rectangle(draw: ImageDraw.ImageDraw, xy, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def vertical_gradient(size, top, bottom):
    w, h = size
    img = Image.new("RGB", size, top)
    px = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        color = tuple(round(top[i] * (1 - t) + bottom[i] * t) for i in range(3))
        for x in range(w):
            px[x, y] = color
    return img


def draw_soft_circle(img, center, radius, color, opacity=100):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x, y = center
    d.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(*color, opacity))
    layer = layer.filter(ImageFilter.GaussianBlur(radius / 2))
    img.alpha_composite(layer)


def draw_search_rows(draw, x, y, w, scale=1.0):
    row_h = int(48 * scale)
    gap = int(10 * scale)
    for i in range(4):
        yy = y + i * (row_h + gap)
        fill = CARD if i != 2 else (42, 56, 70)
        rounded_rectangle(draw, (x, yy, x + w, yy + row_h), int(8 * scale), fill)
        draw.rectangle((x + int(16 * scale), yy + int(12 * scale), x + int(96 * scale), yy + int(36 * scale)), fill=(70, 86, 102))
        draw.rounded_rectangle((x + int(112 * scale), yy + int(12 * scale), x + int(315 * scale), yy + int(22 * scale)), radius=int(5 * scale), fill=(104, 119, 136))
        draw.rounded_rectangle((x + int(112 * scale), yy + int(29 * scale), x + int(245 * scale), yy + int(38 * scale)), radius=int(4 * scale), fill=(69, 82, 98))
        button_fill = GREEN if i < 2 else HIDDEN
        rounded_rectangle(draw, (x + w - int(88 * scale), yy + int(11 * scale), x + w - int(16 * scale), yy + int(37 * scale)), int(6 * scale), button_fill)
        label = "Hide" if i < 2 else "Hidden"
        label_font = font(max(10, int(13 * scale)), True)
        bbox = draw.textbbox((0, 0), label, font=label_font)
        tx = x + w - int(52 * scale) - (bbox[2] - bbox[0]) / 2
        draw.text((tx, yy + int(16 * scale)), label, font=label_font, fill=DARK if i < 2 else (213, 221, 229))


def load_icon(size: int) -> Image.Image:
    icon = Image.open(ICON_SRC).convert("RGBA")
    icon.thumbnail((size, size), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(icon, ((size - icon.width) // 2, (size - icon.height) // 2))
    return canvas


def draw_brand_mark(base: Image.Image, center, size: int):
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = center
    r = size // 2
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(31, 42, 53, 238), outline=(*BLUE, 225), width=max(2, size // 28))
    for i in range(18):
        a = i / 18 * 2 * pi
        inner = r - size * 0.13
        outer = r - size * 0.08
        d.line(
            (
                cx + cos(a) * inner,
                cy + sin(a) * inner,
                cx + cos(a) * outer,
                cy + sin(a) * outer,
            ),
            fill=(*CYAN, 105),
            width=max(1, size // 65),
        )
    icon = load_icon(int(size * 0.74))
    layer.alpha_composite(icon, (cx - icon.width // 2, cy - icon.height // 2))
    base.alpha_composite(layer)


def draw_store_icon():
    img = vertical_gradient((128, 128), BG_2, BG).convert("RGBA")
    draw_soft_circle(img, (94, 30), 58, BLUE, 88)
    draw_soft_circle(img, (28, 103), 45, GREEN, 62)
    draw_brand_mark(img, (64, 64), 110)
    d = ImageDraw.Draw(img)
    d.line((32, 96, 96, 32), fill=(*GREEN, 245), width=7)
    d.line((35, 97, 97, 35), fill=(16, 22, 29, 170), width=2)
    img.convert("RGB").save(OUT / "store-icon-128.png", optimize=True)


def draw_small_tile():
    img = vertical_gradient((440, 280), BG_2, BG).convert("RGBA")
    draw_soft_circle(img, (360, 40), 145, BLUE, 78)
    draw_soft_circle(img, (88, 244), 120, GREEN, 48)
    d = ImageDraw.Draw(img)
    draw_search_rows(d, 230, 70, 178, 0.62)
    draw_brand_mark(img, (95, 112), 120)
    d = ImageDraw.Draw(img)
    d.text((34, 188), "Steam Hider", font=font(32, True), fill=WHITE)
    d.text((36, 228), "Cleaner Steam search controls", font=font(17), fill=MUTED)
    img.convert("RGB").save(OUT / "small-promo-tile-440x280.png", optimize=True)


def draw_marquee_tile():
    img = vertical_gradient((1400, 560), BG_2, BG).convert("RGBA")
    draw_soft_circle(img, (1180, 80), 300, BLUE, 78)
    draw_soft_circle(img, (210, 520), 270, GREEN, 46)
    d = ImageDraw.Draw(img)
    rounded_rectangle(d, (710, 88, 1280, 462), 16, (25, 34, 43), outline=(61, 75, 90), width=2)
    rounded_rectangle(d, (738, 118, 1252, 166), 9, (39, 52, 66))
    d.text((764, 132), "Steam Search", font=font(22, True), fill=WHITE)
    d.rounded_rectangle((1120, 128, 1230, 153), radius=7, fill=(52, 67, 83))
    d.text((1150, 132), "Filter", font=font(15, True), fill=MUTED)
    draw_search_rows(d, 738, 196, 514, 1.0)
    draw_brand_mark(img, (244, 226), 196)
    d = ImageDraw.Draw(img)
    d.text((120, 366), "Steam Hider", font=font(72, True), fill=WHITE)
    d.text((124, 456), "Fast hide controls for Steam search", font=font(30), fill=MUTED)
    d.rounded_rectangle((120, 72, 316, 112), radius=10, fill=(*GREEN, 255))
    d.text((146, 81), "Chrome extension", font=font(20, True), fill=DARK)
    img.convert("RGB").save(OUT / "marquee-promo-tile-1400x560.png", optimize=True)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    draw_store_icon()
    draw_small_tile()
    draw_marquee_tile()
