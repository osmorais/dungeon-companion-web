import { Spell, SpellRoll } from '../models/character-options.interface';
import { saveNote, spellRollConfig, spellSaveInfo } from './spell-roll-config';

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
  save_ability: null,
  save_dc: null,
  save_on_success: null,
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
        attackRoll({
          '0': { instances: 1, dice_count: 2, dice_sides: 10, modifier: 0, extra_dice: [] },
        }),
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
        '2': { instances: 3, dice_count: 2, dice_sides: 6, modifier: 0, extra_dice: [] },
        '3': { instances: 4, dice_count: 2, dice_sides: 6, modifier: 0, extra_dice: [] },
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
      save_ability: null,
      save_dc: null,
      save_on_success: null,
      instance_label: 'dardo',
      variant: null,
      by_slot: { '2': { instances: 4, dice_count: 1, dice_sides: 4, modifier: 1, extra_dice: [] } },
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
      { '5': { instances: 1, dice_count: 4, dice_sides: 8, modifier: 0, extra_dice: [] } },
      { variant: 'Punho Cerrado' },
    );
    expect(spellRollConfig(spell(5, roll, 'Mão de Bigby'), 5)!.label).toBe(
      'Magia: Mão de Bigby (Punho Cerrado)',
    );
    expect(spellRollConfig(spell(5, roll, 'Mão de Bigby'), 6)).toBeNull();
  });
});

describe('spellRollConfig — resistência', () => {
  const saveRoll = (extra: Partial<SpellRoll> = {}): SpellRoll => ({
    kind: 'save',
    attack_type: null,
    attack_bonus: null,
    damage_type: 'fogo',
    save_ability: 'DEX',
    save_dc: 14,
    save_on_success: 'half',
    instance_label: null,
    variant: null,
    by_slot: {
      '3': { instances: 1, dice_count: 8, dice_sides: 6, modifier: 0, extra_dice: [] },
      '4': { instances: 1, dice_count: 9, dice_sides: 6, modifier: 0, extra_dice: [] },
    },
    ...extra,
  });

  it('abre direto no dano do círculo escolhido, com a CD e o que acontece se passar', () => {
    const config = spellRollConfig(spell(3, saveRoll(), 'Bola de Fogo'), 4)!;
    expect(config).toEqual({
      mode: 'ability',
      rollType: 'attack',
      label: 'Magia: Bola de Fogo',
      modifier: 0,
      autoHit: true,
      save: { note: 'CD 14 de Destreza', onSuccess: 'half' },
      damage: {
        diceCount: 9,
        diceSides: 6,
        modifier: 0,
        label: 'Dano: Bola de Fogo (fogo)',
        extraDice: undefined,
      },
    });
  });

  it('dados extras entram no dano (Tempestade de Gelo)', () => {
    const roll = saveRoll({
      by_slot: {
        '4': {
          instances: 1,
          dice_count: 2,
          dice_sides: 8,
          modifier: 0,
          extra_dice: [{ count: 4, sides: 6 }],
        },
      },
    });
    expect(spellRollConfig(spell(4, roll), 4)!.damage!.extraDice).toEqual([{ count: 4, sides: 6 }]);
  });

  it('resistência sem dano não abre modal, mas a CD vai pro anúncio', () => {
    const holdPerson = spell(
      2,
      saveRoll({
        damage_type: null,
        save_ability: 'WIS',
        save_dc: 13,
        save_on_success: null,
        by_slot: {},
      }),
    );
    expect(spellRollConfig(holdPerson, 2)).toBeNull();
    expect(spellSaveInfo(holdPerson)).toEqual({ save_dc: 13, save_ability: 'WIS' });
  });

  it('anúncio sem CD pra magia que não é de resistência', () => {
    expect(spellSaveInfo(spell(1))).toBeNull();
    expect(
      spellSaveInfo(
        spell(
          0,
          attackRoll({
            '0': { instances: 1, dice_count: 1, dice_sides: 10, modifier: 0, extra_dice: [] },
          }),
        ),
      ),
    ).toBeNull();
  });

  it('saveNote escreve o atributo por extenso', () => {
    expect(saveNote(15, 'CON')).toBe('CD 15 de Constituição');
    expect(saveNote(12, 'WIS')).toBe('CD 12 de Sabedoria');
  });
});
