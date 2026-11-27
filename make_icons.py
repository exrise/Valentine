# Делает icon-180/192/512.png из одной картинки: python3 tools_make_icons.py путь/к/gemini.png
# Без аргумента рисует простую заглушку-сердечко.
import sys
from PIL import Image, ImageDraw
if len(sys.argv) > 1:
    src = Image.open(sys.argv[1]).convert("RGB")
    w, h = src.size; m = min(w, h)
    src = src.crop(((w-m)//2, (h-m)//2, (w+m)//2, (h+m)//2))
else:
    S = 1024
    src = Image.new("RGB", (S, S), "#ff8fa8")
    d = ImageDraw.Draw(src)
    d.ellipse((190, 240, 530, 580), fill="white"); d.ellipse((494, 240, 834, 580), fill="white")
    d.polygon([(205, 480), (819, 480), (512, 830)], fill="white")
for n in (180, 192, 512):
    src.resize((n, n), Image.LANCZOS).save(f"images/icon-{n}.png")
