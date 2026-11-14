import {
  ELEMENTAL_WEAPON_TYPES,
  isSpellWeaponSpell,
  needsElementChoice,
  spellWeaponRequest,
} from './spell-weapon';

describe('spell-weapon (Arma Mágica / Arma Elemental)', () => {
  it('mesmos ids e elementos da api (combat-features.ts)', () => {
    expect(isSpellWeaponSpell({ id_spell: 24 })).toBe(true);
    expect(isSpellWeaponSpell({ id_spell: 22 })).toBe(true);
    expect(isSpellWeaponSpell({ id_spell: 49 })).toBe(false);
    expect([...ELEMENTAL_WEAPON_TYPES]).toEqual([
      'ácido',
      'elétrico',
      'frio',
      'fogo',
      'trovejante',
    ]);
  });

  it('só a Arma Elemental pede elemento', () => {
    expect(needsElementChoice({ id_spell: 22 })).toBe(true);
    expect(needsElementChoice({ id_spell: 24 })).toBe(false);
  });

  it('pedido ao lançar: círculo do espaço gasto e elemento só na Elemental', () => {
    expect(spellWeaponRequest({ id_spell: 24 }, 4, 'fogo')).toEqual({
      spell_weapon: { id_spell: 24, slot_level: 4, element: null },
    });
    expect(spellWeaponRequest({ id_spell: 22 }, 5, 'trovejante')).toEqual({
      spell_weapon: { id_spell: 22, slot_level: 5, element: 'trovejante' },
    });
    expect(spellWeaponRequest({ id_spell: 49 }, 1, 'fogo')).toBeNull();
  });
});
