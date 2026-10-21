# Ícones pixel art

Fonte dos ícones em `src/assets/icons/` (96×96 px, fundo transparente), que substituíram os emojis
do site (versão 1.3.3). Esta pasta fica **fora** de `src/assets/` e de `public/` de propósito:
tudo lá vai pro site publicado, e cada folha tem ~1 MB.

- `icons-1.png` e `icons-2.png` — folhas geradas no ChatGPT: grade 4×4 de células iguais, fundo
  transparente, ícones na ordem da lista `SHEETS` do `slice.py`.
- `slice.py` — recorta cada célula, limpa o halo semitransparente do gerador (alfa < 60 vira 0),
  corta a sobra transparente, centraliza num quadrado e reduz pra 96 px.

Pra regenerar (precisa de Pillow — `pip install pillow`, de preferência num venv):

```bash
python slice.py            # grava em ../../src/assets/icons
```

No template: `<img class="ui-icon" src="assets/icons/NOME.png" alt="" />` (classe global no
`src/styles.scss`, tamanho em `em`, acompanha a fonte em volta).

| Folha 1 | | Folha 2 | |
|---|---|---|---|
| `swords` | jogador, criar personagem, combate | `moon` | descanso longo |
| `d20` | mestre, rolar dados, sua vez | `campfire` | descanso curto |
| `scroll` | meus personagens, Quadro do Mestre | `clover` | sorte |
| `compass` | entrar em aventura | `lute` | Inspiração Bárdica |
| `medal` | minhas aventuras | `shield` | Indomável |
| `map` | criar sessão | `candle` | lembrete no teste |
| `book-open` | sessões criadas, catalogar | `bow` | arma à distância |
| `dragon` | monstros | `level-up` | subir de nível |
| `spellbook` | grimório de magias | `print` | imprimir ficha |
| `wizard-hat` | NPCs | `picture` | imagens de referência |
| `gear` | gerar código | `quill` | (reserva: editar) |
| `padlock` | oculto / secreto | `xp-gem` | distribuir XP |
| `hourglass` | atrasar turno, conjuração longa | `check` | personagem escolhido |
| `heart` | PV | `actions` | botão AÇÕES |
| `skip-turn` | finalizar turno | `sheet` | botão FICHA |
| `coin-pouch` | mercado de itens | `inventory` | botão ITENS |
