#!/usr/bin/env python3
"""Cinematic lower-thirds and logo overlays (Persian + English)."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import HEIGHT, OVERLAYS, SCENES, WIDTH  # noqa: E402

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


def make_scene_overlay(scene: dict) -> Image.Image:
    canvas = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    draw.rectangle((0, 0, WIDTH, 72), fill=(6, 14, 26, 140))
    draw.rectangle((0, 72, WIDTH, 74), fill=GOLD_DIM)

    en_sm = load_font(FONT_EN, 28)
    fa_sm = load_font(FONT_FA, 32)
    draw_ltr(draw, (48, 36), "FARASAKOU", en_sm, GOLD, "lm")
    draw_rtl(draw, (WIDTH - 48, 36), "فراسکو عسلویه", fa_sm, WHITE, "rm")
    draw_ltr(
        draw,
        (WIDTH // 2, 36),
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
        (WIDTH // 2 - 560, HEIGHT // 2 - 240, WIDTH // 2 + 560, HEIGHT // 2 + 240),
        fill=(6, 14, 26, 150),
    )
    canvas.alpha_composite(vignette.filter(ImageFilter.GaussianBlur(48)))

    draw = ImageDraw.Draw(canvas)
    title = load_font(FONT_EN, 92)
    sub = load_font(FONT_EN_REG, 26)
    fa = load_font(FONT_FA, 42)
    draw_ltr(draw, (WIDTH // 2, HEIGHT // 2 - 24), "FARASAKOU", title, GOLD, "mm")
    draw.rectangle(
        (WIDTH // 2 - 220, HEIGHT // 2 + 28, WIDTH // 2 + 220, HEIGHT // 2 + 31),
        fill=GOLD,
    )
    draw_rtl(
        draw,
        (WIDTH // 2, HEIGHT // 2 + 64),
        "اتصال زنده در ساحل خلیج فارس",
        fa,
        WHITE,
        "mm",
    )
    draw_ltr(
        draw,
        (WIDTH // 2, HEIGHT // 2 + 112),
        "ASSALUYEH  •  INDUSTRIAL DOCUMENTARY",
        sub,
        SILVER,
        "mm",
    )
    return canvas


def make_end_card() -> Image.Image:
    canvas = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, WIDTH, HEIGHT), fill=(6, 10, 18, 90))
    title = load_font(FONT_EN, 64)
    fa = load_font(FONT_FA, 40)
    sub = load_font(FONT_EN, 28)
    draw_ltr(draw, (WIDTH // 2, HEIGHT // 2 - 40), "FARASAKOU", title, GOLD, "mm")
    draw_ltr(draw, (WIDTH // 2, HEIGHT // 2 + 28), "Safe Hot Tap, No Shutdown", sub, WHITE, "mm")
    draw_rtl(
        draw,
        (WIDTH // 2, HEIGHT // 2 + 88),
        "اتصال ایمن، بدون توقف تولید",
        fa,
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
