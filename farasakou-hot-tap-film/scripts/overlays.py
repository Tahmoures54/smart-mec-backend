#!/usr/bin/env python3
"""Cinematic lower-thirds and logo overlays (Persian + English)."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import HEIGHT, OVERLAYS, ROOT, SCENES, WIDTH  # noqa: E402

LOGO_WHITE = ROOT / "assets" / "brand" / "farasakou_logo_white.png"

GOLD = (201, 162, 39, 255)
GOLD_DIM = (201, 162, 39, 180)
WHITE = (245, 241, 232, 255)
SILVER = (214, 220, 228, 230)

FONT_EN = "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf"
FONT_EN_REG = "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf"
FONT_FA = "/usr/share/fonts/truetype/noto/NotoNaskhArabic-Bold.ttf"


def load_font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size=size)


def draw_ltr(draw: ImageDraw.ImageDraw, xy, text, font, fill, anchor="lt"):
    draw.text(xy, text, font=font, fill=fill, anchor=anchor)


def draw_rtl(draw: ImageDraw.ImageDraw, xy, text, font, fill, anchor="rt"):
    draw.text(
        xy,
        text,
        font=font,
        fill=fill,
        anchor=anchor,
        direction="rtl",
        language="fa",
        align="right",
    )


def gradient_bar(w: int, h: int) -> Image.Image:
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px = img.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        a = int(20 + (200 * t))
        for x in range(w):
            px[x, y] = (6, 14, 26, a)
    return img


def paste_official_logo(canvas: Image.Image, width: int, xy: tuple[int, int]) -> None:
    logo = Image.open(LOGO_WHITE).convert("RGBA")
    ratio = width / logo.width
    logo = logo.resize((width, max(1, int(logo.height * ratio))), Image.Resampling.LANCZOS)
    canvas.alpha_composite(logo, xy)


def make_scene_overlay(scene: dict) -> Image.Image:
    canvas = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    draw.rectangle((0, 0, WIDTH, 88), fill=(6, 14, 26, 150))
    draw.rectangle((0, 88, WIDTH, 90), fill=GOLD_DIM)
    paste_official_logo(canvas, 200, (32, 8))
    draw = ImageDraw.Draw(canvas)
    draw_rtl(draw, (WIDTH - 48, 44), "فراسکو عسلویه", load_font(FONT_FA, 30), WHITE, "rm")
    draw_ltr(
        draw,
        (WIDTH // 2 + 40, 44),
        "LIVE HOT TAP  •  36-IN  •  NO SHUTDOWN",
        load_font(FONT_EN_REG, 16),
        SILVER,
        "mm",
    )

    bar_h = 168
    bar = gradient_bar(WIDTH, bar_h)
    canvas.alpha_composite(bar, (0, HEIGHT - bar_h))
    draw = ImageDraw.Draw(canvas)
    y0 = HEIGHT - bar_h
    draw.rectangle((0, y0, WIDTH, y0 + 3), fill=GOLD)

    en = load_font(FONT_EN, 36)
    fa = load_font(FONT_FA, 40)
    scene_tag = load_font(FONT_EN_REG, 18)

    draw_ltr(draw, (56, y0 + 28), f"SCENE {scene['id']:02d}  /  08", scene_tag, GOLD)
    draw_ltr(draw, (56, y0 + 78), scene["title_en"], en, WHITE, "lm")
    draw_rtl(draw, (WIDTH - 56, y0 + 82), scene["title_fa"], fa, WHITE, "rm")
    draw_ltr(
        draw,
        (56, HEIGHT - 28),
        "HSE  •  ZERO LEAK  •  ZERO FIRE  •  IN-SERVICE",
        load_font(FONT_EN_REG, 15),
        GOLD_DIM,
        "lm",
    )
    return canvas


def make_center_logo() -> Image.Image:
    canvas = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    vignette = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    g = ImageDraw.Draw(vignette)
    g.ellipse(
        (WIDTH // 2 - 620, HEIGHT // 2 - 280, WIDTH // 2 + 620, HEIGHT // 2 + 280),
        fill=(6, 14, 26, 170),
    )
    canvas.alpha_composite(vignette.filter(ImageFilter.GaussianBlur(48)))
    logo = Image.open(LOGO_WHITE).convert("RGBA")
    target_w = 760
    logo = logo.resize((target_w, int(logo.height * target_w / logo.width)), Image.Resampling.LANCZOS)
    canvas.alpha_composite(logo, ((WIDTH - logo.width) // 2, HEIGHT // 2 - logo.height // 2 - 36))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle(
        (WIDTH // 2 - 220, HEIGHT // 2 + 78, WIDTH // 2 + 220, HEIGHT // 2 + 81),
        fill=GOLD,
    )
    draw_rtl(
        draw,
        (WIDTH // 2, HEIGHT // 2 + 118),
        "اتصال زنده در ساحل خلیج فارس",
        load_font(FONT_FA, 40),
        WHITE,
        "mm",
    )
    draw_ltr(
        draw,
        (WIDTH // 2, HEIGHT // 2 + 166),
        "ASSALUYEH  •  INDUSTRIAL DOCUMENTARY",
        load_font(FONT_EN_REG, 24),
        SILVER,
        "mm",
    )
    return canvas


def make_end_card() -> Image.Image:
    canvas = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, WIDTH, HEIGHT), fill=(6, 10, 18, 110))
    logo = Image.open(LOGO_WHITE).convert("RGBA")
    target_w = 720
    logo = logo.resize((target_w, int(logo.height * target_w / logo.width)), Image.Resampling.LANCZOS)
    canvas.alpha_composite(logo, ((WIDTH - logo.width) // 2, HEIGHT // 2 - logo.height // 2 - 50))
    draw = ImageDraw.Draw(canvas)
    draw_ltr(
        draw,
        (WIDTH // 2, HEIGHT // 2 + 92),
        "Safe Hot Tap, No Shutdown",
        load_font(FONT_EN, 28),
        WHITE,
        "mm",
    )
    draw_rtl(
        draw,
        (WIDTH // 2, HEIGHT // 2 + 148),
        "اتصال ایمن، بدون توقف تولید",
        load_font(FONT_FA, 38),
        WHITE,
        "mm",
    )
    return canvas


def main() -> None:
    OVERLAYS.mkdir(parents=True, exist_ok=True)
    for scene in SCENES:
        img = make_scene_overlay(scene)
        path = OVERLAYS / f"scene_{scene['id']:02d}.png"
        img.save(path, "PNG")
        print("wrote", path)
    make_center_logo().save(OVERLAYS / "logo_center.png", "PNG")
    make_end_card().save(OVERLAYS / "end_card.png", "PNG")
    print("overlays ready")


if __name__ == "__main__":
    main()
