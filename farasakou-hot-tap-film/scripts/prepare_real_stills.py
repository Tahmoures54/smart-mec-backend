#!/usr/bin/env python3
"""Prepare 16:9 stills from official Farasakou / public site photos."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC_DIRS = [
    Path("/tmp/farasakou_web/imgs"),
    Path("/tmp/farasakou_web/imgs2"),
]
STILLS = ROOT / "assets" / "stills"
BRAND = ROOT / "assets" / "brand"
W, H = 1920, 1080


def find_src(*names: str) -> Path:
    for name in names:
        for folder in SRC_DIRS:
            path = folder / name
            if path.exists():
                return path
    raise FileNotFoundError(names)


def cover(im: Image.Image, w: int = W, h: int = H, bias: float = 0.5) -> Image.Image:
    im = im.convert("RGB")
    sw, sh = im.size
    target, src = w / h, sw / sh
    if src > target:
        nw = int(sh * target)
        left = int((sw - nw) * bias)
        im = im.crop((left, 0, left + nw, sh))
    else:
        nh = int(sw / target)
        top = int((sh - nh) * bias)
        im = im.crop((0, top, sw, top + nh))
    return im.resize((w, h), Image.Resampling.LANCZOS)


def save(im: Image.Image, name: str) -> None:
    path = STILLS / name
    im.save(path, "JPEG", quality=92, optimize=True)
    print("wrote", path, im.size)


def title_card(logo: Image.Image) -> Image.Image:
    canvas = Image.new("RGB", (W, H), (8, 16, 28))
    logo = logo.convert("RGBA")
    target_w = 980
    ratio = target_w / logo.width
    logo = logo.resize((target_w, int(logo.height * ratio)), Image.Resampling.LANCZOS)
    x = (W - logo.width) // 2
    y = (H - logo.height) // 2 - 40
    canvas.paste(logo, (x, y), logo)
    return canvas


def main() -> None:
    STILLS.mkdir(parents=True, exist_ok=True)
    BRAND.mkdir(parents=True, exist_ok=True)

    white = Image.open(find_src("logo.png", "logo_w.png", "apc_logo-W.png"))
    color = Image.open(find_src("logo_or.png", "apc_logo-OR.png"))
    white.save(BRAND / "farasakou_logo_white.png")
    color.save(BRAND / "farasakou_logo_color.png")

    save(cover(Image.open(find_src("DJI_0268.jpg", "apc_DJI_0268-copy.jpg")), bias=0.45), "real_harbor_dji.jpg")
    save(cover(Image.open(find_src("photo_2023.jpg", "apc_photo_2023-10-25_12-08-41.jpg")), bias=0.4), "real_night_jetty.jpg")
    save(cover(Image.open(find_src("eight.jpg", "apc_8.jpg")), bias=0.55), "real_night_loading.jpg")
    save(cover(Image.open(find_src("DSC04769.jpg")), bias=0.35), "real_spheres.jpg")
    save(cover(Image.open(find_src("DSC04874.jpg")), bias=0.4), "real_site_zagros.jpg")
    save(cover(Image.open(find_src("01.jpg", "apc_01.jpg")), bias=0.48), "real_tanks_farm.jpg")
    save(cover(Image.open(find_src("DSC04983.jpg")), bias=0.55), "real_zagros_window.jpg")
    save(cover(Image.open(find_src("com_news184-3.jpg", "ir_news184-3.jpg")), bias=0.5), "real_port_plan.jpg")
    save(cover(Image.open(find_src("com_news184-5.jpg")), bias=0.35), "real_dredge.jpg")
    save(cover(Image.open(find_src("DSC05128.jpg")), bias=0.45), "real_meeting_room.jpg")
    save(cover(Image.open(find_src("DSC04999.jpg")), bias=0.5), "real_ship_bridge.jpg")
    save(cover(Image.open(find_src("IMG_0906.jpg")), bias=0.45), "real_booth.jpg")
    save(cover(Image.open(find_src("DSC05159.jpg")), bias=0.5), "real_meeting_mural.jpg")
    save(title_card(white), "real_title_logo.jpg")


if __name__ == "__main__":
    main()
