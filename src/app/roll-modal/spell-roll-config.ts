import { Spell } from '../models/character-options.interface';
import { AbilityRollConfig } from './roll-modal.component';

/**
 * Monta a rolagem do modal ao lançar uma magia no círculo escolhido (truque: `slotLevel` 0).
 * `null` se a magia não tem mecânica cadastrada — aí o lançamento só gasta o espaço e anuncia.
 *
 * - Ataque mágico: igual ataque com arma (d20 + ataque de magia → acertou? → dano). Com vários
 *   raios/feixes, o modal repete o ataque pra cada um.
 * - Acerto automático (Mísseis Mágicos): rola o dano de todos os dardos de uma vez, cada dado
 *   aparece separado pra o jogador distribuir entre os alvos.
 */
export function spellRollConfig(spell: Spell, slotLevel: number): AbilityRollConfig | null {
  const roll = spell.roll;
  if (!roll) return null;
  const entry = roll.by_slot[spell.spellLevel === 0 ? '0' : String(slotLevel)];
  if (!entry) return null;

  const name = roll.variant ? `${spell.name} (${roll.variant})` : spell.name;
  const damageLabel = `Dano: ${name} (${roll.damage_type})`;

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
