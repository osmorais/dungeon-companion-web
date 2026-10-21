"""Reduz as molduras originais (geradas no ChatGPT, ~1254 px) para 512 px e limpa o halo
semitransparente do gerador. Uso: python process.py  (grava em ../../src/assets/frames)."""
import os
import sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', '..', 'src', 'assets', 'frames')
SIZE = 512

for name in ('card-frame.png', 'card-frame-sombrio.png'):
    im = Image.open(os.path.join(HERE, name)).convert('RGBA')
    r, g, b, a = im.split()
    a = a.point(lambda v: 0 if v < 60 else 255 if v > 200 else v)
    im = Image.merge('RGBA', (r, g, b, a)).resize((SIZE, SIZE), Image.LANCZOS)
    im.save(os.path.join(OUT, name), optimize=True)
    # Espessura da borda (pra calibrar o border-image-slice): primeira coluna transparente a
    # partir da esquerda, na altura do meio.
    alpha = im.getchannel('A')
    mid = SIZE // 2
    band = next(x for x in range(SIZE) if alpha.getpixel((x, mid)) == 0)
    corner = max(y for y in range(SIZE // 2) if alpha.getpixel((band + 4, y)) > 0)
    print(name, 'faixa', band, 'px; canto até', corner, 'px; centro transparente:',
          alpha.getpixel((mid, mid)) == 0)
