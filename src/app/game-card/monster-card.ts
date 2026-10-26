import { GameCardData } from './game-card.model';
import { MonsterActionCardInfo } from '../models/game-session.interface';

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
    variant: 'monster',
  };
}

const ACTION_RIBBON: Record<MonsterActionCardInfo['kind'], string> = {
  attack: 'ATAQUE DE MONSTRO',
  save: 'EFEITO COM RESISTÊNCIA',
  damage: 'DANO DE MONSTRO',
};

/**
 * Carta da ação do monstro na tela de lançamento (1.13.0): o nome da ação, a imagem do monstro na
 * arte e, no pergaminho, os números (ataque, dano, CD) — os mesmos que os dados mostram. O
 * medalhão leva o bônus de ataque ou a CD.
 */
export function monsterActionToCard(
  action: MonsterActionCardInfo,
  imageUrl: string | null,
): GameCardData {
  const stat = (label: string) => action.stats.find((s) => s.label === label)?.value ?? '';
  const badge =
    action.kind === 'attack'
      ? stat('ATAQUE')
      : action.kind === 'save'
        ? stat('CD').split(' ')[0]
        : '!';
  return {
    title: action.name,
    badge: badge || '!',
    art: imageUrl || DEFAULT_MONSTER_IMAGE,
    fallbackIcon: DEFAULT_MONSTER_IMAGE,
    artBackground: null,
    artFit: 'cover',
    ribbon: ACTION_RIBBON[action.kind],
    stats: action.stats,
    text: null,
    tags: [],
  };
}
