# Cursores do tema

Fonte dos cursores em `src/assets/cursors/`. Esta pasta fica **fora** de `src/assets/` de
propósito: tudo em `src/assets/` vai pro site publicado, e a folha original tem ~1,3 MB.

- `cursors-sheet-chatgpt.png` — folha gerada no ChatGPT (5 cursores em linha, fundo magenta
  `#FF00FF`): espada, manopla apontando, escudo (desabilitado), mão aberta, punho.
- `process.py` — recorta cada cursor e reconstrói a grade de pixel art (célula de ~10,6 px na
  folha → 1 px no cursor), pegando a cor predominante do miolo de cada célula; célula magenta vira
  transparente. As coordenadas de cada sprite na folha estão fixas no script (`SEGS`).
- `clean.py` — remove pixels soltos com tom de magenta (resto do fundo misturado no contorno).

Pra regenerar (precisa de Pillow — `pip install pillow`, de preferência num venv):

```bash
python process.py cursors-sheet-chatgpt.png ../../src/assets/cursors
python clean.py ../../src/assets/cursors
```

Se trocar a folha por uma nova, conferir `SEGS` (posições) e `CELL` (tamanho do pixel) no
`process.py`, e o ponto de clique de cada cursor nas variáveis `--cd/--cp/--cx/--cg/--cgg` do
`src/styles.scss`.

| Arquivo | Uso | Tamanho | Ponto do clique (x y) |
|---|---|---|---|
| `cursor-default.png` | padrão (`--cd`) | 22×23 | 1 1 (ponta da espada) |
| `cursor-pointer.png` | clicável (`--cp`) | 15×28 | 3 1 (ponta do dedo) |
| `cursor-disabled.png` | desabilitado (`--cx`) | 18×21 | 8 1 (topo do escudo) |
| `cursor-grab.png` | arrastável (`--cg`) | 23×27 | 11 13 (centro) |
| `cursor-grabbing.png` | arrastando (`--cgg`) | 18×24 | 9 12 (centro) |
