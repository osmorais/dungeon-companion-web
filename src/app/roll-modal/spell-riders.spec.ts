import { Spell, SpellRoll } from '../models/character-options.interface';
import { isOnHitSpell, riderChoicesFor } from './spell-riders';

function riderSpell(
  id: number,
  name: string,
  spellLevel: number,
  trigger: 'next_hit' | 'each_hit',
  attack: 'melee_weapon' | 'weapon' | 'any',
  bySlot: Record<string, number>,
  save: SpellRoll['save_ability'] = null,
): Spell {
  return {
    id_spell: id,
    name,
    description: null,
    casting_time: null,
    range_distance: null,
    duration: null,
    is_verbal: true,
    is_somatic: false,
    is_material: false,
    spellLevel,
    school: null,
    roll: {
      kind: 'rider',
      attack_type: null,
      attack_bonus: null,
      damage_type: 'psíquico',
      save_ability: save,
      save_dc: save ? 13 : null,
      save_on_success: null,
      heal: null,
      maximize: false,
      rider_trigger: trigger,
      rider_attack: attack,
      instance_label: null,
      variant: null,
      by_slot: Object.fromEntries(
        Object.entries(bySlot).map(([slot, count]) => [
          slot,
          { instances: 1, dice_count: count, dice_sides: 6, modifier: 0, extra_dice: [] },
        ]),
      ),
    },
  };
}

describe('riderChoicesFor', () => {
  const wrathful = riderSpell(
    119,
    'Destruição Colérica',
    1,
    'next_hit',
    'melee_weapon',
    { '1': 1, '2': 1, '3': 1 },
    'WIS',
  );
  const blinding = riderSpell(
    118,
    'Destruição Cegante',
    3,
    'next_hit',
    'weapon',
    { '3': 3 },
    'CON',
  );
  const hex = riderSpell(49, 'Bruxaria', 1, 'each_hit', 'any', { '1': 1, '2': 1 });
  const mark = riderSpell(213, 'Marca do Caçador', 1, 'each_hit', 'weapon', { '1': 1 });
  const spells = [wrathful, blinding, hex, mark];
  const slots: Record<string, number> = { level_1: 1, level_2: 0, level_3: 2 };
  const all = () => true;

  it('arma corpo a corpo: Destruições com espaço disponível (uma opção por círculo) e as contínuas', () => {
    const choices = riderChoicesFor(spells, 'melee_weapon', all, (k) => slots[k] ?? 0);
    expect(choices.oneShot.map((o) => o.key)).toEqual(['119:1', '119:3', '118:3']);
    expect(choices.oneShot[0]).toMatchObject({
      spellName: 'Destruição Colérica',
      slotKey: 'level_1',
      levelLabel: '1º círculo',
      dice: { count: 1, sides: 6 },
      saveNote: 'CD 13 de Sabedoria',
      save: { save_dc: 13, save_ability: 'WIS' },
    });
    expect(choices.persistent.map((t) => t.spellName)).toEqual(['Bruxaria', 'Marca do Caçador']);
  });

  it('arma à distância: sem as Destruições só corpo a corpo', () => {
    const choices = riderChoicesFor(spells, 'ranged_weapon', all, (k) => slots[k] ?? 0);
    expect(choices.oneShot.map((o) => o.key)).toEqual(['118:3']);
  });

  it('ataque mágico: só a Bruxaria (vale pra qualquer ataque)', () => {
    const choices = riderChoicesFor(spells, 'spell', all, (k) => slots[k] ?? 0);
    expect(choices.oneShot).toEqual([]);
    expect(choices.persistent.map((t) => t.spellName)).toEqual(['Bruxaria']);
  });

  it('magia não preparada fica de fora', () => {
    const choices = riderChoicesFor(
      spells,
      'melee_weapon',
      (s) => s.id_spell !== 119,
      (k) => slots[k] ?? 0,
    );
    expect(choices.oneShot.map((o) => o.key)).toEqual(['118:3']);
  });

  it('isOnHitSpell: só as Destruições (próximo acerto)', () => {
    expect(isOnHitSpell(wrathful)).toBe(true);
    expect(isOnHitSpell(hex)).toBe(false);
  });
});
