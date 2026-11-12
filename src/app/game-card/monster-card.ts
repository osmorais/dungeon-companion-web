import { GameCardData, GameCardState } from './game-card.model';
import { MonsterActionCardInfo } from '../models/game-session.interface';
import { BestiaryMonsterSummary, MonsterCatalogEntry } from '../models/monster-catalog.interface';
import { catalogMonsterName, challengeRatingText, isHighThreat } from '../services/monster-format';

/** Imagem de monstro quando o mestre não enviou uma e o monstro não tem arte própria. */
export const DEFAULT_MONSTER_IMAGE = 'assets/monster.png';

/**
 * Monstros do bestiário com arte própria (1.23.0), em `assets/monsters/<slug>.webp` — as levas 1
 * e 2 de `procedimentos/artes-monstros.md` nos docs. Monstro novo com arte: pôr o arquivo e o slug.
 */
export const MONSTER_ART_SLUGS: ReadonlySet<string> = new Set([
  // Leva 1 — encontros de nível 1 a 3
  'goblin',
  'kobold',
  'orc',
  'esqueleto',
  'zumbi',
  'lobo',
  'bandido',
  'cultista',
  'rato-gigante',
  'aranha-gigante',
  'ogro',
  'gnoll',
  // Leva 2 — líderes, feras e masmorra
  'hobgoblin',
  'bugbear',
  'chefe-goblin',
  'capitao-dos-bandidos',
  'lobo-atroz',
  'worg',
  'carnical',
  'sombra',
  'urso-coruja',
  'mimico',
  'cubo-gelatinoso',
  'harpia',
]);

/** Imagem padrão do monstro: a arte do slug, se houver; senão a genérica. */
export function defaultMonsterImage(slug?: string | null): string {
  return slug && MONSTER_ART_SLUGS.has(slug)
    ? `assets/monsters/${slug}.webp`
    : DEFAULT_MONSTER_IMAGE;
}

/** A imagem que o mestre subiu ganha; sem ela, a padrão do monstro. */
export function monsterImage(imageUrl: string | null | undefined, slug?: string | null): string {
  return imageUrl || defaultMonsterImage(slug);
}

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

/**
 * Carta do monstro no bestiário (1.13.4, lista e detalhe): a mesma da revelação (faixa tipo ·
 * tamanho, moldura do monstro), com o ND no medalhão (lá é "?", monstro desconhecido) e um resumo
 * no pergaminho (não há lore por entrada do bestiário). No tema sombrio o medalhão vira o emblema
 * do monstro, sem número (--monster-card-badge no styles.scss); o ND continua no resumo.
 */
export function catalogMonsterCard(monster: MonsterCatalogEntry): GameCardData {
  const s = monster.data_snapshot;
  return summaryCard({
    name: catalogMonsterName(monster),
    imageUrl: monsterImage(monster.image_url, monster.monster_api_slug),
    type: s.type,
    size: s.size,
    alignment: s.alignment,
    ac: monster.ac,
    hp: monster.hp_max,
    challengeRating: s.challenge_rating,
  });
}

/** A mesma carta pra um monstro do livro ainda não catalogado (tela de catalogar, 1.13.4). */
export function bestiaryMonsterCard(
  monster: BestiaryMonsterSummary,
  customName?: string | null,
): GameCardData {
  return summaryCard({
    name: customName?.trim() || monster.name,
    imageUrl: defaultMonsterImage(monster.index),
    type: monster.type,
    size: monster.size,
    alignment: monster.alignment,
    ac: monster.ac,
    hp: monster.hp_max,
    challengeRating: monster.challenge_rating,
  });
}

function summaryCard(info: {
  name: string;
  imageUrl: string | null;
  type: string;
  size: string;
  alignment: string | null;
  ac: number;
  hp: number;
  challengeRating: number;
}): GameCardData {
  const cr = challengeRatingText(info.challengeRating);
  const meta = [info.size, info.type].filter((p): p is string => !!p?.trim()).join(' ');
  const alignment = info.alignment ? `, ${info.alignment}` : '';
  return {
    ...monsterToCard({
      name: info.name,
      imageUrl: info.imageUrl,
      monsterType: info.type,
      size: info.size,
      lore: `${meta}${alignment}.\nCA ${info.ac} · PV ${info.hp} · ND ${cr}.`,
    }),
    badge: cr,
  };
}

/** Brilho vermelho na carta dos monstros de ND alto (ND 5+, `THREAT_CHALLENGE_RATING`). */
export function monsterCardState(challengeRating: number): GameCardState {
  return isHighThreat(challengeRating) ? 'threat' : null;
}

export function catalogMonsterCardState(monster: MonsterCatalogEntry): GameCardState {
  return monsterCardState(monster.data_snapshot.challenge_rating);
}

const ACTION_RIBBON: Record<MonsterActionCardInfo['kind'], string> = {
  attack: 'ATAQUE DE MONSTRO',
  save: 'EFEITO COM RESISTÊNCIA',
  damage: 'DANO DE MONSTRO',
};

/**
 * Carta da ação do monstro na tela de lançamento (1.13.0): o nome da ação, a imagem do monstro na
 * arte e, no pergaminho, os números (ataque, dano, atributo da resistência). A mesa vê a carta,
 * então a CD não entra (1.19.0). O medalhão leva o bônus de ataque ou o atributo da resistência.
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
        ? stat('RESISTÊNCIA') || stat('CD').split(' ')[0] // 'CD': aviso de antes da 1.19.0
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
