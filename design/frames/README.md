# Molduras dos cards de personagem

Fonte das molduras em `src/assets/frames/` (512×512, fundo e centro transparentes). Esta pasta
fica fora de `src/assets/` e `public/` de propósito: tudo lá vai pro site, e as originais têm
~600 KB cada.

- `card-frame.png` (tema Fantasia) e `card-frame-sombrio.png` (tema Sombrio) — geradas no
  ChatGPT (~1254 px): borda de espessura uniforme, enfeite em cada canto, rebites repetidos nas
  bordas e centro vazio.
- `process.py` — limpa o halo semitransparente do gerador (alfa < 60 vira 0) e reduz pra 512 px.

```bash
python process.py   # precisa de Pillow; grava em ../../src/assets/frames
```

No site: classe global `.framed-card` (`src/styles.scss`) com `border-image: var(--card-frame)
72 / 22px round` — corte de 72 px da imagem de 512 (cobre o enfeite do canto), borda de 22 px
na tela, rebites repetidos. A imagem vem do tema (`--card-frame`). Trocar a moldura mantendo
esse formato não exige mexer no CSS; se o enfeite do canto ficar maior, aumentar o 72.
