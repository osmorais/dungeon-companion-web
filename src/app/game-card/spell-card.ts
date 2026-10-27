import { Spell } from '../models/character-options.interface';
import { GameCardData, GameCardState } from './game-card.model';

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
      { label: 'ALCANCE', value: spell.range_distance != null ? `${spell.range_distance} m` : '—' },
      { label: 'DURAÇÃO', value: spell.duration ?? '—' },
      { label: 'COMP.', value: spellComponentsLabel(spell) },
    ],
    text: spell.description,
    tags: spell.spellLevel > 0 && spell.is_prepared ? ['PREPARADA'] : [],
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
