/**
 * Conteúdo de uma carta (magia agora; arma em seguida). A carta só desenha — quem monta os dados é
 * o conversor de cada tipo (`spellToCard`, depois `weaponToCard`).
 */
export interface GameCardStat {
  label: string;
  value: string;
}

export interface GameCardData {
  /** Nome na faixa de cima. */
  title: string;
  /** Medalhão do canto: círculo da magia ("T", "3") ou bônus de ataque da arma ("+5"). */
  badge: string;
  /** Ilustração da janela de arte; `null` usa `fallbackIcon` sobre `artBackground`. */
  art: string | null;
  fallbackIcon: string;
  /** Fundo da janela de arte (armas: degradê pela cor do tipo de dano). Valor de `background`. */
  artBackground: string | null;
  /** `cover` (padrão: ilustração de cena, magias) ou `contain` (objeto solto, armas). */
  artFit?: 'cover' | 'contain';
  /** Faixa embaixo da arte: escola e círculo / categoria da arma. */
  ribbon: string;
  /** Números do pergaminho. A carta mini mostra só os dois primeiros. */
  stats: GameCardStat[];
  /** Descrição (só na carta em tela cheia). */
  text: string | null;
  /** Etiquetas no canto da arte (ex.: "PREPARADA"). */
  tags: string[];
  /** Carta do monstro (1.13.2): moldura própria do tema (`--monster-card-face`). */
  variant?: 'monster';
}

/** Cor da carta no grimório: pronta pra usar, dá pra preparar, ou bloqueada (apagada). */
/** `threat`: monstro perigoso no bestiário (ND 5+) — brilho próprio, separado do `ready` das magias. */
export type GameCardState = 'ready' | 'preparable' | 'locked' | 'threat' | null;
