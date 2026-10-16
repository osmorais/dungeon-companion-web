import { Spell, SpellRoll } from '../models/character-options.interface';
import { spellRollConfig } from './spell-roll-config';

function spell(spellLevel: number, roll?: SpellRoll, name = 'Magia'): Spell {
  return {
    id_spell: 1,
    name,
    description: null,
    casting_time: null,
    range_distance: null,
    duration: null,
    is_verbal: true,
    is_somatic: true,
    is_material: false,
    spellLevel,
    school: null,
    roll,
  };
}

const attackRoll = (bySlot: SpellRoll['by_slot'], extra: Partial<SpellRoll> = {}): SpellRoll => ({
  kind: 'attack',
  attack_type: 'ranged',
  attack_bonus: 6,
  damage_type: 'fogo',
  instance_label: null,
  variant: null,
  by_slot: bySlot,
  ...extra,
});

describe('spellRollConfig', () => {
  it('magia sem mecânica não abre rolagem', () => {
    expect(spellRollConfig(spell(1), 1)).toBeNull();
  });

  it('truque de ataque usa a chave "0" e o bônus de ataque de magia', () => {
    const config = spellRollConfig(
      spell(
        0,
        attackRoll({ '0': { instances: 1, dice_count: 2, dice_sides: 10, modifier: 0 } }),
        'Raio de Fogo',
      ),
      0,
    );
    expect(config).toEqual({
      mode: 'ability',
      rollType: 'attack',
      label: 'Magia: Raio de Fogo',
      modifier: 6,
      damage: { diceCount: 2, diceSides: 10, modifier: 0, label: 'Dano: Raio de Fogo (fogo)' },
      instances: undefined,
    });
  });

  it('usa os dados do círculo escolhido e repete por raio', () => {
    const roll = attackRoll(
      {
        '2': { instances: 3, dice_count: 2, dice_sides: 6, modifier: 0 },
        '3': { instances: 4, dice_count: 2, dice_sides: 6, modifier: 0 },
      },
      { instance_label: 'raio' },
    );
    const config = spellRollConfig(spell(2, roll, 'Raio Ardente'), 3)!;
    expect(config.instances).toEqual({ count: 4, label: 'raio' });
    expect(config.damage).toMatchObject({ diceCount: 2, diceSides: 6 });
  });

  it('acerto automático junta os dardos num dano só, sem d20', () => {
    const roll: SpellRoll = {
      kind: 'auto',
      attack_type: null,
      attack_bonus: null,
      damage_type: 'energia',
      instance_label: 'dardo',
      variant: null,
      by_slot: { '2': { instances: 4, dice_count: 1, dice_sides: 4, modifier: 1 } },
    };
    const config = spellRollConfig(spell(1, roll, 'Mísseis Mágicos'), 2)!;
    expect(config.autoHit).toBe(true);
    expect(config.damage).toEqual({
      diceCount: 4,
      diceSides: 4,
      modifier: 4,
      label: 'Dano: Mísseis Mágicos (energia) — 4 dardos',
    });
  });

  it('variante entra no nome e círculo sem dados não abre rolagem', () => {
    const roll = attackRoll(
      { '5': { instances: 1, dice_count: 4, dice_sides: 8, modifier: 0 } },
      { variant: 'Punho Cerrado' },
    );
    expect(spellRollConfig(spell(5, roll, 'Mão de Bigby'), 5)!.label).toBe(
      'Magia: Mão de Bigby (Punho Cerrado)',
    );
    expect(spellRollConfig(spell(5, roll, 'Mão de Bigby'), 6)).toBeNull();
  });
});
