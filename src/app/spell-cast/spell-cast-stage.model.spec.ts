import { castRollView, sidesFromNotation } from './spell-cast-stage.model';

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
