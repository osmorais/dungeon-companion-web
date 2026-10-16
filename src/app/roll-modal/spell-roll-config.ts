import { Spell, SpellRoll } from '../models/character-options.interface';
import { AbilityRollConfig } from './roll-modal.component';

const SAVE_ABILITY_NAME: Record<NonNullable<SpellRoll['save_ability']>, string> = {
  STR: 'Força',
  DEX: 'Destreza',
  CON: 'Constituição',
  INT: 'Inteligência',
  WIS: 'Sabedoria',
  CHA: 'Carisma',
};

/** Ex: "CD 14 de Destreza" — usado no modal e no toast de magia lançada. */
export function saveNote(dc: number, ability: NonNullable<SpellRoll['save_ability']>): string {
  return `CD ${dc} de ${SAVE_ABILITY_NAME[ability]}`;
}

/** CD e atributo pra mandar no anúncio da magia (`null` se não for de resistência). */
export function spellSaveInfo(
  spell: Spell,
): { save_dc: number; save_ability: NonNullable<SpellRoll['save_ability']> } | null {
  const roll = spell.roll;
  if (roll?.kind !== 'save' || roll.save_dc === null || !roll.save_ability) return null;
  return { save_dc: roll.save_dc, save_ability: roll.save_ability };
}

/**
 * Monta a rolagem do modal ao lançar uma magia no círculo escolhido (truque: `slotLevel` 0).
 * `null` se a magia não tem mecânica cadastrada — aí o lançamento só gasta o espaço e anuncia.
 *
 * - Ataque mágico: igual ataque com arma (d20 + ataque de magia → acertou? → dano). Com vários
 *   raios/feixes, o modal repete o ataque pra cada um.
 * - Acerto automático (Mísseis Mágicos): rola o dano de todos os dardos de uma vez, cada dado
 *   aparece separado pra o jogador distribuir entre os alvos.
 * - Cura: abre direto na rolagem de cura (dado + modificador), registrada como `heal` no log.
 * - Resistência: sem d20 do conjurador — abre direto no dano, com a CD/atributo e o dano de quem
 *   passa na resistência. Resistência sem dano não abre modal (só a CD no anúncio).
 */
export function spellRollConfig(spell: Spell, slotLevel: number): AbilityRollConfig | null {
  const roll = spell.roll;
  if (!roll) return null;
  const entry = roll.by_slot[spell.spellLevel === 0 ? '0' : String(slotLevel)];
  if (!entry) return null;

  const name = roll.variant ? `${spell.name} (${roll.variant})` : spell.name;
  const damageLabel = `Dano: ${name} (${roll.damage_type})`;

  if (roll.kind === 'heal') {
    const tempHp = roll.heal === 'temp_hp';
    return {
      mode: 'ability',
      rollType: 'attack',
      label: `Magia: ${name}`,
      modifier: 0,
      autoHit: true,
      healing: { tempHp },
      damage: {
        diceCount: entry.dice_count,
        diceSides: entry.dice_sides,
        modifier: entry.modifier,
        label: tempHp ? `PV temporários: ${name}` : `Cura: ${name}`,
        maximize: roll.maximize || undefined,
      },
    };
  }

  if (roll.kind === 'save') {
    if (roll.save_dc === null || !roll.save_ability || !roll.save_on_success) return null;
    return {
      mode: 'ability',
      rollType: 'attack',
      label: `Magia: ${name}`,
      modifier: 0,
      autoHit: true,
      save: {
        note: saveNote(roll.save_dc, roll.save_ability),
        onSuccess: roll.save_on_success,
      },
      damage: {
        diceCount: entry.dice_count,
        diceSides: entry.dice_sides,
        modifier: entry.modifier,
        label: damageLabel,
        extraDice: entry.extra_dice.length ? entry.extra_dice : undefined,
      },
    };
  }

  if (roll.kind === 'auto') {
    const label =
      entry.instances > 1
        ? `${damageLabel} — ${entry.instances} ${roll.instance_label ?? 'rolagem'}s`
        : damageLabel;
    return {
      mode: 'ability',
      rollType: 'attack',
      label: `Magia: ${name}`,
      modifier: 0,
      autoHit: true,
      damage: {
        diceCount: entry.dice_count * entry.instances,
        diceSides: entry.dice_sides,
        modifier: entry.modifier * entry.instances,
        label,
      },
    };
  }

  return {
    mode: 'ability',
    rollType: 'attack',
    label: `Magia: ${name}`,
    modifier: roll.attack_bonus ?? 0,
    damage: {
      diceCount: entry.dice_count,
      diceSides: entry.dice_sides,
      modifier: entry.modifier,
      label: damageLabel,
    },
    instances:
      entry.instances > 1
        ? { count: entry.instances, label: roll.instance_label ?? 'ataque' }
        : undefined,
  };
}
