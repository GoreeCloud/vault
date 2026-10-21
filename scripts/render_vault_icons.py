#!/usr/bin/env python3
"""Render approved GoreeCloud Vault artwork; developer tool requiring PyGObject+librsvg."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SVG = ROOT / "assets/branding/app-icon.svg"

# Mapping follows actual current asset dimensions (mstile is a legacy 270px asset).
FILES = {
    "apps/browser/src/images/icon16.png": 16,
    "apps/browser/src/images/icon19.png": 19,
    "apps/browser/src/images/icon32.png": 32,
    "apps/browser/src/images/icon38.png": 38,
    "apps/browser/src/images/icon48.png": 48,
    "apps/browser/src/images/icon96.png": 96,
    "apps/browser/src/images/icon128.png": 128,
    "apps/browser/src/images/icon18_safari.png": 18,
    "apps/browser/src/images/icon18_safari@2x.png": 36,
    "apps/web/src/images/icons/favicon-16x16.png": 16,
    "apps/web/src/images/icons/favicon-32x32.png": 32,
    "apps/web/src/images/icons/apple-touch-icon.png": 180,
    "apps/web/src/images/icons/android-chrome-192x192.png": 192,
    "apps/web/src/images/icons/android-chrome-512x512.png": 512,
    "apps/web/src/images/icons/mstile-150x150.png": 270,
}


def render() -> None:
    import gi

    gi.require_version("GdkPixbuf", "2.0")
    from gi.repository import GdkPixbuf

    source = SVG.read_bytes()
    for relative, size in FILES.items():
        loader = GdkPixbuf.PixbufLoader.new_with_type("svg")
        loader.set_size(size, size)
        try:
            loader.write(source)
            loader.close()
            image = loader.get_pixbuf()
            if image.get_width() != size or image.get_height() != size:
                raise ValueError(f"Unexpected raster dimensions for {relative}")
            image.savev(str(ROOT / relative), "png", [], [])
        finally:
            # The loader owns its decoded buffers; don't reuse it between sizes.
            pass
    print(f"Rendered {len(FILES)} canonical GoreeCloud Vault icon derivatives")


if __name__ == "__main__":
    render()
