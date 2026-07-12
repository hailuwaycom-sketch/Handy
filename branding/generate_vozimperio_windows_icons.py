"""Regenera los iconos de VozImperio para Tauri/Windows desde el logo exacto.

Reconstruido tras la perdida del original. Fuente: branding/fuente-valida/
vozimperio-logo-exacto.svg (contiene un PNG incrustado en base64).
Extrae ese PNG y genera el set de iconos que espera src-tauri/icons/.
"""
import base64
import io
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent  # .../Handy
SVG = ROOT / "branding" / "fuente-valida" / "vozimperio-logo-exacto.svg"
ICONS = ROOT / "source" / "src-tauri" / "icons"


def load_logo() -> Image.Image:
    svg = SVG.read_text(encoding="utf-8", errors="ignore")
    m = re.search(r"data:image/png;base64,([A-Za-z0-9+/=\s]+)", svg)
    if not m:
        raise SystemExit("No se encontro PNG base64 incrustado en el SVG")
    data = base64.b64decode(re.sub(r"\s+", "", m.group(1)))
    img = Image.open(io.BytesIO(data)).convert("RGBA")
    # Cuadrar en lienzo transparente (el logo es ~402x406)
    side = max(img.size)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - img.width) // 2, (side - img.height) // 2), img)
    return canvas


def sq(img: Image.Image, size: int) -> Image.Image:
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    ICONS.mkdir(parents=True, exist_ok=True)
    logo = load_logo()
    print(f"Logo cargado: {logo.size}")

    sq(logo, 32).save(ICONS / "32x32.png")
    sq(logo, 64).save(ICONS / "64x64.png")
    sq(logo, 128).save(ICONS / "128x128.png")
    sq(logo, 256).save(ICONS / "128x128@2x.png")
    logo.save(ICONS / "icon.png")
    logo.save(ICONS / "logo.png")
    sq(logo, 256).save(
        ICONS / "icon.ico",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )
    print("Iconos generados en", ICONS)


if __name__ == "__main__":
    main()
