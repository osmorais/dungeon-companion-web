"""Reduz as molduras originais (geradas no ChatGPT, ~1254 px) para 512 px e limpa o halo
semitransparente do gerador. Uso: python process.py  (grava em ../../src/assets/frames)."""
import os
import sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', '..', 'src', 'assets', 'frames')
SIZE = 512

# (arquivo, corta a margem transparente em volta antes de reduzir?) — as molduras dos avisos
# vieram com sobra transparente fora da moldura; as dos cards encostam na borda da imagem.
FRAMES = [
    ('card-frame.png', False),
    ('card-frame-sombrio.png', False),
    ('toast-frame.png', True),
    ('toast-frame-sombrio.png', True),
]

for name, crop in FRAMES:
    im = Image.open(os.path.join(HERE, name)).convert('RGBA')
    r, g, b, a = im.split()
    a = a.point(lambda v: 0 if v < 60 else 255 if v > 200 else v)
    im = Image.merge('RGBA', (r, g, b, a))
    if crop:
        im = im.crop(a.getbbox())
    im = im.resize((SIZE, SIZE), Image.LANCZOS)
    im.save(os.path.join(OUT, name), optimize=True)
    # Calibração do 9-slice: onde a faixa termina por dentro (no meio da borda esquerda) e até
    # onde vai o enfeite do canto (na diagonal).
    alpha = im.getchannel('A')
    band = max(x for x in range(SIZE // 4) if alpha.getpixel((x, SIZE // 2)) > 40)
    corner = max(d for d in range(SIZE // 3) if alpha.getpixel((d, d)) > 40)
    print(f'{name}: faixa termina em {band}px, canto até {corner}px (de {SIZE})')
