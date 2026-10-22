import { appliedLines, castRollView, sidesFromNotation } from './spell-cast-stage.model';

describe('sidesFromNotation', () => {
  it('expande os grupos na ordem dos dados', () => {
    expect(sidesFromNotation('2d6 + 1d8', 3)).toEqual([6, 6, 8]);
    expect(sidesFromNotation('8d6', 8)).toEqual([6, 6, 6, 6, 6, 6, 6, 6]);
  });

  it('d20 com vantagem (2 dados, "1d20") repete o último; sem notação usa d20', () => {
    expect(sidesFromNotation('1d20', 2)).toEqual([20, 20]);
    expect(sidesFromNotation('', 1)).toEqual([20]);
  });
});

describe('castRollView', () => {
  it('junta a referência do lançamento com a rolagem registrada', () => {
    expect(
      castRollView(
        { id_roll: 'r1', kind: 'attack', outcome: 'hit', critical: true },
        { rolls: [20], dice_notation: '1d20', modifier: 5, total: 25 },
      ),
    ).toEqual({
      id: 'r1',
      kind: 'attack',
      outcome: 'hit',
      critical: true,
      rolls: [20],
      sides: [20],
      modifier: 5,
      total: 25,
    });
  });
});

describe('appliedLines', () => {
  it('mesmo valor e tipo em alvos seguidos viram uma linha só', () => {
    expect(
      appliedLines([
        { label: 'Goblin', amount: 8, kind: 'damage' },
        { label: 'Orc', amount: 8, kind: 'damage' },
        { label: 'Lobo', amount: 4, kind: 'damage' },
      ]).map((l) => l.text),
    ).toEqual(['8 de dano em Goblin, Orc', '4 de dano em Lobo']);
  });

  it('cura, PV temporários e Evasão (nada aplicado)', () => {
    expect(
      appliedLines([
        { label: 'Thorin', amount: 6, kind: 'heal' },
        { label: 'Ana', amount: 5, kind: 'temp_hp' },
        { label: 'Lira', amount: 0, kind: 'damage' },
      ]).map((l) => l.text),
    ).toEqual(['6 de cura em Thorin', '5 PV temporários em Ana', 'nenhum dano em Lira']);
  });
});
