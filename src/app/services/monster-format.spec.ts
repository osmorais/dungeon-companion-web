import {
  challengeRatingText,
  isHighThreat,
  monsterSpeedText,
  normalizeSearch,
} from './monster-format';

describe('monster-format', () => {
  it('deslocamento: "chave: valor", e pairar vira só a palavra', () => {
    expect(monsterSpeedText({ terrestre: '6 m', voo: '15 m', pairar: true })).toBe(
      'terrestre: 6 m, voo: 15 m, pairar',
    );
    expect(monsterSpeedText({ walk: '30 ft.' })).toBe('walk: 30 ft.');
    expect(monsterSpeedText(undefined)).toBe('');
  });

  it('ND em fração como no livro', () => {
    expect(challengeRatingText(0.125)).toBe('1/8');
    expect(challengeRatingText(0.25)).toBe('1/4');
    expect(challengeRatingText(0.5)).toBe('1/2');
    expect(challengeRatingText(0)).toBe('0');
    expect(challengeRatingText(17)).toBe('17');
    expect(challengeRatingText('0.250')).toBe('1/4');
    expect(challengeRatingText(undefined)).toBe('—');
  });

  it('busca ignora acento e maiúsculas', () => {
    expect(normalizeSearch('  Dragão Vermelho ')).toBe('dragao vermelho');
  });

  it('ND 5 ou mais é ameaça; abaixo disso não', () => {
    expect(isHighThreat(0.25)).toBe(false);
    expect(isHighThreat(4)).toBe(false);
    expect(isHighThreat(5)).toBe(true);
    expect(isHighThreat(17)).toBe(true);
  });
});
