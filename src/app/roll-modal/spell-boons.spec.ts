import { isSelfOnlyBoon, isSpellBoon, spellBoonMaxTargets } from './spell-boons';

describe('spell-boons (Bênção / Orientação / Resistência)', () => {
  it('mesmos ids da api (combat-features.ts)', () => {
    expect(
      [42, 247, 305, 25, 146, 145, 261, 351].every((id) => isSpellBoon({ id_spell: id })),
    ).toBe(true);
    expect(isSpellBoon({ id_spell: 49 })).toBe(false);
  });

  it('Bênção: 3 alvos no 1º círculo, +1 por círculo acima; truques: 1', () => {
    expect([1, 2, 3, 9].map((slot) => spellBoonMaxTargets({ id_spell: 42 }, slot))).toEqual([
      3, 4, 5, 11,
    ]);
    expect(spellBoonMaxTargets({ id_spell: 247 }, 0)).toBe(1);
    expect(spellBoonMaxTargets({ id_spell: 305 }, 0)).toBe(1);
    expect(spellBoonMaxTargets({ id_spell: 49 }, 1)).toBe(0);
  });

  it('magias de CA: um alvo em qualquer círculo; Escudo Arcano só em si', () => {
    expect([25, 146, 145, 261, 351].map((id) => spellBoonMaxTargets({ id_spell: id }, 5))).toEqual([
      1, 1, 1, 1, 1,
    ]);
    expect(isSelfOnlyBoon({ id_spell: 145 })).toBe(true);
    expect(isSelfOnlyBoon({ id_spell: 146 })).toBe(false);
  });
});
