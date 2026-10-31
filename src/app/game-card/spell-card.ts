import { Spell, SpellRoll } from '../models/character-options.interface';
import { GameCardData, GameCardSeal, GameCardState } from './game-card.model';

/** Escolas com ilustração em assets/cards/spell-school-<slug>.webp (design/spell-cards/). */
export const SPELL_SCHOOLS = [
  'abjuracao',
  'adivinhacao',
  'conjuracao',
  'encantamento',
  'evocacao',
  'ilusao',
  'necromancia',
  'transmutacao',
] as const;

/** "Evocação" → "evocacao"; escola desconhecida ou vazia → null. */
export function schoolSlug(school: string | null | undefined): string | null {
  if (!school) return null;
  const slug = school
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  return (SPELL_SCHOOLS as readonly string[]).includes(slug) ? slug : null;
}

export function spellComponentsLabel(spell: Spell): string {
  const parts = [spell.is_verbal && 'V', spell.is_somatic && 'S', spell.is_material && 'M'];
  return parts.filter(Boolean).join(', ') || '—';
}

export function spellCircleLabel(level: number): string {
  return level === 0 ? 'TRUQUE' : `${level}º CÍRCULO`;
}

/** Alcance na carta: no banco, 0 = pessoal e 1 = toque; o resto é em metros. */
export function spellRangeLabel(distance: number | null): string {
  if (distance === null) return '—';
  if (distance === 0) return 'Pessoal';
  if (distance === 1) return 'Toque';
  return `${distance} m`;
}

type SlotRoll = SpellRoll['by_slot'][string];

/** "3× 1d4+1", "2d8 + 4d6" — o mesmo formato da API (`formatSpellDice`). */
export function formatSpellDice(entry: SlotRoll, rider = false): string {
  let text = `${entry.dice_count}d${entry.dice_sides}`;
  if (entry.modifier) text += entry.modifier > 0 ? `+${entry.modifier}` : `${entry.modifier}`;
  for (const extra of entry.extra_dice) text += ` + ${extra.count}d${extra.sides}`;
  if (entry.instances > 1) text = `${entry.instances}× ${text}`;
  return rider ? `+${text}` : text;
}

const healLabel = (kind: 'heal' | 'hp' | 'temp_hp') => (kind === 'temp_hp' ? 'PV TEMP.' : 'CURA');

/**
 * Selo de dano/cura da carta: na ficha, o valor do personagem no círculo da magia (truque já
 * escalado pelo nível, cura com o modificador somado), lido do `roll`; fora dela (ou sem
 * mecânica), o valor base do livro (`card_damage`). Sem dano nem cura: sem selo.
 */
export function spellSeal(spell: Spell): GameCardSeal | null {
  const roll = spell.roll;
  const slot = roll?.by_slot[String(spell.spellLevel)];
  if (roll && slot) {
    const value = formatSpellDice(slot, roll.kind === 'rider');
    if (roll.heal) return { value, label: healLabel(roll.heal), kind: 'heal' };
    return { value, label: (roll.damage_type ?? 'dano').toUpperCase(), kind: 'damage' };
  }
  const base = spell.card_damage;
  if (!base) return null;
  if (base.kind !== 'damage')
    return { value: base.dice, label: healLabel(base.kind), kind: 'heal' };
  return { value: base.dice, label: (base.type ?? 'dano').toUpperCase(), kind: 'damage' };
}

export function spellToCard(spell: Spell): GameCardData {
  const slug = schoolSlug(spell.school);
  return {
    title: spell.name,
    badge: spell.spellLevel === 0 ? 'T' : String(spell.spellLevel),
    art: slug ? `assets/cards/spell-school-${slug}.webp` : null,
    fallbackIcon: 'assets/icons/spellbook.png',
    artBackground: null,
    ribbon: `${(spell.school ?? 'MAGIA').toUpperCase()} · ${spellCircleLabel(spell.spellLevel)}`,
    stats: [
      { label: 'TEMPO', value: spell.casting_time ?? '—' },
      { label: 'ALCANCE', value: spellRangeLabel(spell.range_distance) },
      { label: 'DURAÇÃO', value: spell.duration ?? '—' },
      { label: 'COMP.', value: spellComponentsLabel(spell) },
    ],
    text: spell.description,
    tags: spell.spellLevel > 0 && spell.is_prepared ? ['PREPARADA'] : [],
    seal: spellSeal(spell),
  };
}

/**
 * Cor da carta: `ready` (truque, magia preparada ou de quem não prepara — dá pra lançar),
 * `preparable` (não preparada, mas há vaga e não está em combate) ou `locked` (sem vaga ou
 * travada em combate). Usada no grimório da sessão e na ficha.
 */
export function spellCardState(
  spell: Spell,
  prepares: boolean,
  canPrepareMore: boolean,
  inCombat: boolean,
): Exclude<GameCardState, null | 'threat'> {
  if (spell.spellLevel === 0 || !prepares || spell.is_prepared) return 'ready';
  return !inCombat && canPrepareMore ? 'preparable' : 'locked';
}
