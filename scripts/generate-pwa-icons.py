from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/assets/icons/omoi-no-hougaku-app-icon.png"
OUT = ROOT / "public/assets/icons/generated"
BG = (245, 242, 234, 255)

if not SOURCE.exists():
    raise SystemExit(f"Source icon not found: {SOURCE}")

OUT.mkdir(parents=True, exist_ok=True)

with Image.open(SOURCE) as source_image:
    source = source_image.convert("RGBA")

def fit_square(image, size, scale=1.0, background=(0, 0, 0, 0)):
    canvas = Image.new("RGBA", (size, size), background)
    target = max(1, round(size * scale))
    fitted = image.copy()
    fitted.thumbnail((target, target), Image.Resampling.LANCZOS)
    x = (size - fitted.width) // 2
    y = (size - fitted.height) // 2
    canvas.alpha_composite(fitted, (x, y))
    return canvas

def save_png(name, size, scale=1.0, background=(0, 0, 0, 0)):
    image = fit_square(source, size, scale, background)
    image.save(OUT / name, "PNG", optimize=True)

save_png("icon-192.png", 192)
save_png("icon-512.png", 512)
save_png("icon-maskable-512.png", 512, scale=0.80, background=BG)
save_png("apple-touch-icon.png", 180, background=BG)
save_png("favicon-32.png", 32)

print(f"Generated PWA icons from {SOURCE.relative_to(ROOT)}")
