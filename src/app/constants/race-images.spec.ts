import { raceImage } from './race-images';

describe('raceImage', () => {
  it('raças 1–9 têm arte em assets/races/race-<id>.webp (id pode vir como texto)', () => {
    expect(raceImage(1)).toBe('assets/races/race-1.webp');
    expect(raceImage(8)).toBe('assets/races/race-8.webp');
    expect(raceImage(9)).toBe('assets/races/race-9.webp');
    expect(raceImage('4')).toBe('assets/races/race-4.webp');
  });

  it('id desconhecido ou vazio: sem arte (a tela mostra a inicial)', () => {
    expect(raceImage(10)).toBeNull();
    expect(raceImage(0)).toBeNull();
    expect(raceImage(null)).toBeNull();
    expect(raceImage(undefined)).toBeNull();
  });
});
