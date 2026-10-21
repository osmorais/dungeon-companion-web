import sys
from PIL import Image

import os
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = HERE
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', '..', 'src', 'assets', 'icons')
SHEETS = {
    'icons-1.png': ['swords', 'd20', 'scroll', 'compass', 'medal', 'map', 'book-open', 'dragon',
                    'spellbook', 'wizard-hat', 'gear', 'padlock', 'hourglass', 'heart', 'skip-turn', 'coin-pouch'],
    'icons-2.png': ['moon', 'campfire', 'clover', 'lute', 'shield', 'candle', 'bow', 'level-up',
                    'print', 'picture', 'quill', 'xp-gem', 'check', 'actions', 'sheet', 'inventory'],
}
SIZE = 96

for sheet, names in SHEETS.items():
    im = Image.open(f'{SRC}/{sheet}').convert('RGBA')
    w, h = im.size
    for i, name in enumerate(names):
        col, row = i % 4, i // 4
        box = (round(col * w / 4), round(row * h / 4), round((col + 1) * w / 4), round((row + 1) * h / 4))
        cell = im.crop(box)
        # Limpa a sujeira semitransparente das bordas (halo do gerador)
        r, g, b, a = cell.split()
        a = a.point(lambda v: 0 if v < 60 else 255 if v > 200 else v)
        cell = Image.merge('RGBA', (r, g, b, a))
        bbox = a.getbbox()
        cell = cell.crop(bbox)
        side = max(cell.size)
        square = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        square.paste(cell, ((side - cell.size[0]) // 2, (side - cell.size[1]) // 2))
        square.resize((SIZE, SIZE), Image.LANCZOS).save(f'{OUT}/{name}.png', optimize=True)
        print(name, bbox)
