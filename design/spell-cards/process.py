"""Prepara as artes das cartas de magia (geradas no ChatGPT) pro site: limpa o halo
semitransparente do gerador, reduz e grava em WebP em ../../src/assets/cards.
Uso: python process.py [pasta-dos-originais]  (precisa de Pillow).

Os PNGs originais (~25 MB) ficam no repositório de docs, não aqui:
~/projects/docs/dungeon-companion/artes/spell-cards/ (ver procedimentos/artes-cartas.md).

- frame-<tema>.png -> card-frame-<tema>.webp: SEM cortar a margem transparente — as áreas da
  carta (medalhão, nome, arte, faixa, pergaminho) são posições em % da imagem inteira, iguais nos
  dois temas (ver src/app/game-card/game-card.component.scss).
- school-<escola>.png -> spell-school-<escola>.webp: ilustração da janela de arte (4:3).
"""
import glob
import os
import sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser(
    '~/projects/docs/dungeon-companion/artes/spell-cards'
)
OUT = os.path.join(HERE, '..', '..', 'src', 'assets', 'cards')
FRAME_WIDTH = 760
ART_SIZE = (800, 600)

os.makedirs(OUT, exist_ok=True)

for path in sorted(glob.glob(os.path.join(SRC, 'frame-*.png'))):
    theme = os.path.basename(path)[len('frame-'):-len('.png')]
    im = Image.open(path).convert('RGBA')
    r, g, b, a = im.split()
    a = a.point(lambda v: 0 if v < 60 else 255 if v > 200 else v)
    im = Image.merge('RGBA', (r, g, b, a))
    height = round(im.height * FRAME_WIDTH / im.width)
    im = im.resize((FRAME_WIDTH, height), Image.LANCZOS)
    out = os.path.join(OUT, f'card-frame-{theme}.webp')
    im.save(out, 'WEBP', quality=90, method=6)
    print(f'{out}: {im.size}, {os.path.getsize(out) // 1024} KB')

for path in sorted(glob.glob(os.path.join(SRC, 'school-*.png'))):
    school = os.path.basename(path)[len('school-'):-len('.png')]
    im = Image.open(path).convert('RGB').resize(ART_SIZE, Image.LANCZOS)
    out = os.path.join(OUT, f'spell-school-{school}.webp')
    im.save(out, 'WEBP', quality=82, method=6)
    print(f'{out}: {im.size}, {os.path.getsize(out) // 1024} KB')
