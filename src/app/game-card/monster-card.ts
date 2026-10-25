import { GameCardData } from './game-card.model';

/** Imagem de monstro quando o mestre não enviou uma (a mesma das listas e da ficha). */
export const DEFAULT_MONSTER_IMAGE = 'assets/monster.png';

/** O que o aviso de revelação sabe do monstro (evento `monster_revealed`). */
export interface MonsterRevealInfo {
  name: string;
  imageUrl: string | null;
  monsterType?: string | null;
  size?: string | null;
  lore?: string | null;
}

/**
 * Carta do monstro no aviso de revelação (1.11.0): a mesma moldura das magias e armas, com a imagem
 * do mestre (ou a padrão), tipo e tamanho na faixa e a descrição no pergaminho. Sem números de
 * combate (o aviso vai pra mesa inteira) — o medalhão fica com "?".
 */
export function monsterToCard(info: MonsterRevealInfo): GameCardData {
  const ribbon = [info.monsterType, info.size]
    .filter((p): p is string => !!p?.trim())
    .map((p) => p.trim().toUpperCase())
    .join(' · ');
  return {
    title: info.name,
    badge: '?',
    art: info.imageUrl || DEFAULT_MONSTER_IMAGE,
    fallbackIcon: DEFAULT_MONSTER_IMAGE,
    artBackground: null,
    artFit: 'cover',
    ribbon: ribbon || 'MONSTRO',
    stats: [],
    text: info.lore?.trim() || null,
    tags: [],
  };
}
