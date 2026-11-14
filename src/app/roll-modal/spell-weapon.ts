import { Spell } from '../models/character-options.interface';

/**
 * Arma Mágica e Arma Elemental: ao lançar, o bônus fica guardado no personagem
 * (`active_effects.spell_weapon`, calculado pela API pelo círculo) e entra sozinho em todo ataque
 * com arma até acabar (fim do combate, descanso longo ou "Encerrar").
 *
 * Cópia de `SPELL_WEAPON_SPELLS` e `ELEMENTAL_WEAPON_TYPES` da api
 * (`services/character-sheet/combat-features.ts`) — ao mudar um lado, mudar o outro e os testes.
 */
export const MAGIC_WEAPON_ID = 24;
export const ELEMENTAL_WEAPON_ID = 22;
export const ELEMENTAL_WEAPON_TYPES = ['ácido', 'elétrico', 'frio', 'fogo', 'trovejante'] as const;
export type ElementalWeaponType = (typeof ELEMENTAL_WEAPON_TYPES)[number];

export function isSpellWeaponSpell(spell: Pick<Spell, 'id_spell'>): boolean {
  return spell.id_spell === MAGIC_WEAPON_ID || spell.id_spell === ELEMENTAL_WEAPON_ID;
}

/** Arma Elemental pede o elemento antes de lançar. */
export function needsElementChoice(spell: Pick<Spell, 'id_spell'>): boolean {
  return spell.id_spell === ELEMENTAL_WEAPON_ID;
}

/** Corpo do `PATCH active-effects` ao lançar; `null` se a magia não encanta a arma. */
export function spellWeaponRequest(
  spell: Pick<Spell, 'id_spell'>,
  slotLevel: number,
  element: ElementalWeaponType,
): { spell_weapon: { id_spell: number; slot_level: number; element: string | null } } | null {
  if (!isSpellWeaponSpell(spell)) return null;
  return {
    spell_weapon: {
      id_spell: spell.id_spell,
      slot_level: slotLevel,
      element: needsElementChoice(spell) ? element : null,
    },
  };
}
