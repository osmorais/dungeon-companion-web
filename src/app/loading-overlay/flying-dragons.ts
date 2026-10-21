/** Um dragão atravessando a tela durante o carregamento (LoadingOverlayComponent). */
export interface FlyingDragon {
  id: number;
  /** Altura em % da tela (5–65, pra não colar no topo nem sair por baixo). */
  top: number;
  /** `true` = da direita pra esquerda (sprite espelhado). */
  reverse: boolean;
  /** Duração da travessia em segundos (3,5–6). */
  duration: number;
  /** Atraso antes de entrar, em segundos (espalharia os primeiros se houvesse mais de um). */
  delay: number;
  /** Tamanho em px (140–220): menores parecem mais longe. */
  size: number;
}

/** Quantos dragões voam ao mesmo tempo (um só, a pedido do usuário). */
export const DRAGON_COUNT = 1;

/** Sorteia posição, sentido, velocidade e tamanho. `rand` é injetável pra teste. */
export function randomDragon(
  id: number,
  delay = 0,
  rand: () => number = Math.random,
): FlyingDragon {
  return {
    id,
    top: Math.round(5 + rand() * 60),
    reverse: rand() < 0.5,
    duration: Math.round((3.5 + rand() * 2.5) * 10) / 10,
    delay,
    size: Math.round(140 + rand() * 80),
  };
}
