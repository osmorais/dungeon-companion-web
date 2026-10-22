import { WeaponRow } from '../models/character-options.interface';
import { CombatFeatures } from '../models/character-response.interface';
import { WeaponCardInfo } from '../models/game-session.interface';
import { GameCardData } from './game-card.model';

/**
 * Armas simples do Livro do Jogador (o resto é marcial). O banco não guarda a categoria — as
 * proficiências são só textos ("Armas Simples") —, então ela fica aqui, pelo nome do catálogo.
 */
const SIMPLE_WEAPONS = new Set(
  [
    'Adaga',
    'Azagaia',
    'Bordão',
    'Clava Grande',
    'Foice Curta',
    'Lança',
    'Maça',
    'Machadinha',
    'Martelo Leve',
    'Porrete',
    'Arco Curto',
    'Besta Leve',
    'Dardo',
    'Funda',
  ].map(normalize),
);

/** Ids do catálogo `weapon` com arte em assets/cards/weapon-<id>.webp (design/weapon-cards/). */
const WEAPON_ART_IDS = 37;

/** Fundo da janela de arte por tipo de dano. */
const DAMAGE_BACKGROUND: Record<string, string> = {
  cortante: 'radial-gradient(circle at 50% 45%, #8a2f22 0%, #3a100b 70%, #1c0705 100%)',
  perfurante: 'radial-gradient(circle at 50% 45%, #2f5a78 0%, #10263a 70%, #07121c 100%)',
  concussao: 'radial-gradient(circle at 50% 45%, #7a6430 0%, #362a10 70%, #1a1407 100%)',
};
const NEUTRAL_BACKGROUND =
  'radial-gradient(circle at 50% 45%, #5e4a3a 0%, #2a1e15 70%, #140e0a 100%)';

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function isSimpleWeapon(name: string): boolean {
  return SIMPLE_WEAPONS.has(normalize(name));
}

export function damageBackground(damageType: string | null | undefined): string {
  return (damageType && DAMAGE_BACKGROUND[normalize(damageType)]) || NEUTRAL_BACKGROUND;
}

function signed(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

/** "1d8" + 3 → "1d8+3"; sem dado → "—". */
function damageLabel(die: string | null, modifier: number): string {
  if (!die) return '—';
  return modifier === 0 ? die : `${die}${signed(modifier)}`;
}

function capitalize(value: string | null): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : '—';
}

export function weaponToCard(weapon: WeaponRow): GameCardData {
  const hasArt = weapon.id_weapon >= 1 && weapon.id_weapon <= WEAPON_ART_IDS;
  return {
    title: weapon.name,
    badge: signed(weapon.attack_bonus),
    art: hasArt ? `assets/cards/weapon-${weapon.id_weapon}.webp` : null,
    fallbackIcon: weapon.isRanged ? 'assets/icons/bow.png' : 'assets/icons/swords.png',
    artBackground: damageBackground(weapon.damage_type),
    artFit: 'contain',
    ribbon: `${isSimpleWeapon(weapon.name) ? 'SIMPLES' : 'MARCIAL'} · ${weapon.isRanged ? 'DISTÂNCIA' : 'CORPO A CORPO'}`,
    stats: [
      { label: 'DANO', value: damageLabel(weapon.damage_die, weapon.damage_modifier) },
      { label: 'TIPO', value: capitalize(weapon.damage_type) },
      { label: 'PROPRIEDADES', value: weapon.properties || '—' },
      { label: 'PESO', value: weapon.weight ? `${weapon.weight} kg` : '—' },
    ],
    text: null,
    tags: [],
  };
}

/** Ataque desarmado (Monge: dado de Artes Marciais) como carta. */
export function unarmedToCard(unarmed: NonNullable<CombatFeatures['unarmed']>): GameCardData {
  const die = `${unarmed.dice.count}d${unarmed.dice.sides}`;
  return {
    title: unarmed.name,
    badge: signed(unarmed.attack_bonus),
    art: 'assets/cards/weapon-unarmed.webp',
    fallbackIcon: 'assets/icons/swords.png',
    artBackground: damageBackground('concussão'),
    artFit: 'contain',
    ribbon: 'DESARMADO · CORPO A CORPO',
    stats: [
      { label: 'DANO', value: damageLabel(die, unarmed.damage_modifier) },
      { label: 'TIPO', value: 'Concussão' },
      { label: 'PROPRIEDADES', value: '—' },
      { label: 'PESO', value: '—' },
    ],
    text: null,
    tags: [],
  };
}

/** Arma (da ficha) → dados da carta pro aviso de ataque da mesa. */
export function weaponCardInfo(weapon: WeaponRow): WeaponCardInfo {
  return {
    id_weapon: weapon.id_weapon,
    name: weapon.name,
    attack_bonus: weapon.attack_bonus,
    damage_modifier: weapon.damage_modifier,
    damage_die: weapon.damage_die,
    damage_type: weapon.damage_type,
    properties: weapon.properties,
    weight: weapon.weight ?? null,
    is_ranged: weapon.isRanged,
  };
}

/** Ataque desarmado → dados da carta pro aviso (`id_weapon` null). */
export function unarmedCardInfo(unarmed: NonNullable<CombatFeatures['unarmed']>): WeaponCardInfo {
  return {
    id_weapon: null,
    name: unarmed.name,
    attack_bonus: unarmed.attack_bonus,
    damage_modifier: unarmed.damage_modifier,
    damage_die: `${unarmed.dice.count}d${unarmed.dice.sides}`,
    damage_type: 'concussão',
    properties: null,
    weight: null,
    is_ranged: false,
  };
}

/** Carta da arma do aviso (mesa), a partir do que veio no evento. */
export function weaponInfoToCard(info: WeaponCardInfo): GameCardData {
  if (info.id_weapon === null) {
    const match = info.damage_die?.match(/^(\d+)d(\d+)$/i);
    return unarmedToCard({
      name: info.name,
      attack_bonus: info.attack_bonus,
      damage_modifier: info.damage_modifier,
      dice: match ? { count: Number(match[1]), sides: Number(match[2]) } : { count: 1, sides: 1 },
    });
  }
  return weaponToCard({
    id_weapon: info.id_weapon,
    name: info.name,
    attack_bonus: info.attack_bonus,
    damage_modifier: info.damage_modifier,
    damage_die: info.damage_die,
    damage_type: info.damage_type,
    properties: info.properties,
    weight: info.weight ?? 0,
    price_value: 0,
    isRanged: info.is_ranged,
  });
}
