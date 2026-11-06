"""Converte as artes das raças (PNG 1254x1254, fundo escuro) pro site.
Uso: python process.py [pasta-dos-originais]  (precisa de Pillow).

Os PNGs originais ficam no repositório de docs: ~/projects/docs/dungeon-companion/artes/races/,
com o nome "<id_race><nome>.png" (1anao.png … 8tiefling.png). O número no começo é o id da
tabela `race` no banco; grava src/assets/races/race-<id>.webp em 512x512.
O Humano (id 9) ainda não tem arte — a tela mostra a inicial no lugar.
"""
import os
import re
import sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser(
    '~/projects/docs/dungeon-companion/artes/races'
)
OUT = os.path.join(HERE, '..', '..', 'src', 'assets', 'races')
SIZE = 512

os.makedirs(OUT, exist_ok=True)
for name in sorted(os.listdir(SRC)):
    m = re.match(r'^(\d+)\D.*\.png$', name, re.IGNORECASE)
    if not m:
        continue
    img = Image.open(os.path.join(SRC, name)).convert('RGB')
    img = img.resize((SIZE, SIZE), Image.LANCZOS)
    dest = os.path.join(OUT, f'race-{int(m.group(1))}.webp')
    img.save(dest, 'WEBP', quality=88, method=6)
    print(name, '->', os.path.relpath(dest), os.path.getsize(dest) // 1024, 'kB')
