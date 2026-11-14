import {
  MONSTER_SPELL_EFFECT_KEYS,
  SPELL_MONSTER_EFFECT,
  advantageAgainst,
  monsterCurseMaxTargets,
  monsterEffectList,
} from './monster-spell-effects';

describe('monster-spell-effects (1.26.0)', () => {
  it('mesmas magias e chaves da api (services/monster-spell-effects.ts)', () => {
    expect(SPELL_MONSTER_EFFECT).toEqual({
      264: 'bane',
      164: 'faerie_fire',
      290: 'guiding_bolt',
      361: 'vicious_mockery',
      289: 'enfeebled',
    });
    expect([...MONSTER_SPELL_EFFECT_KEYS]).toEqual([
      'bane',
      'faerie_fire',
      'guiding_bolt',
      'vicious_mockery',
      'enfeebled',
    ]);
  });

  it('vantagem contra o monstro: Fogo das Fadas e Raio Guiador', () => {
    expect(advantageAgainst({ faerie_fire: { from: 'a' }, guiding_bolt: { from: 'b' } })).toEqual([
      'Vantagem (Fogo das Fadas)',
      'Vantagem (Raio Guiador)',
    ]);
    expect(advantageAgainst({ bane: { from: 'a' } })).toEqual([]);
    expect(advantageAgainst(null)).toEqual([]);
  });

  it('limite de monstros: Perdição 3 +1 por círculo, Raio 1, Fogo das Fadas sem limite', () => {
    expect([1, 2, 4].map((slot) => monsterCurseMaxTargets(264, slot))).toEqual([3, 4, 6]);
    expect(monsterCurseMaxTargets(289, 3)).toBe(1);
    expect(monsterCurseMaxTargets(164, 1)).toBeNull();
  });

  it('lista pro mestre, na ordem, com quem lançou', () => {
    expect(monsterEffectList({ enfeebled: { from: 'Elara' }, bane: { from: 'Clara' } })).toEqual([
      { key: 'bane', label: 'Perdição de Clara (−1d4 nos ataques e resistências)' },
      {
        key: 'enfeebled',
        label: 'Raio do Enfraquecimento de Elara (metade do dano com arma de Força)',
      },
    ]);
  });
});
