"""Recorta as folhas de armas (geradas no ChatGPT) em uma imagem por arma, pro site.
Uso: python process.py [pasta-dos-originais]  (precisa de Pillow).

Os PNGs originais ficam no repositório de docs:
~/projects/docs/dungeon-companion/artes/weapon-cards/ (ver procedimentos/artes-cartas.md).
Cada folha é uma grade; a célula N é a arma da lista SHEETS (id do catálogo `weapon` no banco,
ou 'unarmed'). O gerador não respeita a grade à risca (arma passando da célula, ponta da vizinha
entrando), então cada arma sai das peças (regiões opacas ligadas) cujo centro cai dentro da
célula, procuradas numa área 30% maior. Limpa o halo semitransparente, centraliza num quadrado e
grava src/assets/cards/weapon-<id>.webp.
"""
import os
import sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser(
    '~/projects/docs/dungeon-companion/artes/weapon-cards'
)
OUT = os.path.join(HERE, '..', '..', 'src', 'assets', 'cards')
SIZE = 384
MARGIN = 0.08

# (arquivo, colunas, linhas, ids na ordem de leitura)
SHEETS = [
    ('weapon-1.png', 4, 4, list(range(1, 17))),
    ('weapon-2.png', 4, 4, list(range(17, 33))),
    ('weapon-3.png', 3, 2, [33, 34, 35, 36, 37, 'unarmed']),
]

EXPAND = 0.3
# Peça menor que isso (fração da maior peça da célula) é sujeira e sai.
MIN_PIECE = 0.03


def pieces_inside(region, cell_box):
    """Máscara (L) das peças opacas cujo centro cai em `cell_box`, ignorando as minúsculas."""
    alpha = region.getchannel('A')
    w, h = region.size
    px = alpha.load()
    seen = bytearray(w * h)
    pieces = []
    for y in range(h):
        for x in range(w):
            if px[x, y] == 0 or seen[y * w + x]:
                continue
            stack, pts = [(x, y)], []
            seen[y * w + x] = 1
            while stack:
                cx, cy = stack.pop()
                pts.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h and px[nx, ny] and not seen[ny * w + nx]:
                        seen[ny * w + nx] = 1
                        stack.append((nx, ny))
            mx = sum(p[0] for p in pts) / len(pts)
            my = sum(p[1] for p in pts) / len(pts)
            pieces.append((pts, mx, my))
    bx0, by0, bx1, by1 = cell_box
    inside = [p for p in pieces if bx0 <= p[1] < bx1 and by0 <= p[2] < by1]
    largest = max((len(p[0]) for p in inside), default=0)
    mask = Image.new('L', region.size, 0)
    mp = mask.load()
    for pts, _, _ in inside:
        if len(pts) >= largest * MIN_PIECE:
            for x, y in pts:
                mp[x, y] = 255
    return mask


os.makedirs(OUT, exist_ok=True)

for name, cols, rows, ids in SHEETS:
    sheet = Image.open(os.path.join(SRC, name)).convert('RGBA')
    r, g, b, a = sheet.split()
    a = a.point(lambda v: 0 if v < 60 else 255 if v > 200 else v)
    sheet = Image.merge('RGBA', (r, g, b, a))
    cw, ch = sheet.width / cols, sheet.height / rows
    for index, weapon_id in enumerate(ids):
        col, row = index % cols, index // cols
        x0, y0, x1, y1 = col * cw, row * ch, (col + 1) * cw, (row + 1) * ch
        pad_x, pad_y = cw * EXPAND, ch * EXPAND
        box = (
            max(0, round(x0 - pad_x)),
            max(0, round(y0 - pad_y)),
            min(sheet.width, round(x1 + pad_x)),
            min(sheet.height, round(y1 + pad_y)),
        )
        region = sheet.crop(box)
        keep = pieces_inside(region, (x0 - box[0], y0 - box[1], x1 - box[0], y1 - box[1]))
        region.putalpha(Image.composite(region.getchannel('A'), Image.new('L', region.size, 0), keep))
        bbox = region.getchannel('A').getbbox()
        cell = region.crop(bbox) if bbox else region
        side = round(max(cell.size) * (1 + 2 * MARGIN))
        square = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        square.paste(cell, ((side - cell.width) // 2, (side - cell.height) // 2))
        square = square.resize((SIZE, SIZE), Image.LANCZOS)
        out = os.path.join(OUT, f'weapon-{weapon_id}.webp')
        square.save(out, 'WEBP', quality=88, method=6)
        print(f'{os.path.basename(out)}: {os.path.getsize(out) // 1024} KB')
