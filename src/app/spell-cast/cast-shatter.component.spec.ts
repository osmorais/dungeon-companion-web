import { TestBed } from '@angular/core/testing';
import {
  CastShatterComponent,
  SHATTER_CRACK_MS,
  SHATTER_DELAY_MS,
  SHATTER_FLY_MS,
  SHARDS,
} from './cast-shatter.component';

describe('CastShatterComponent', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('espera o carimbo, trinca, quebra (cacos voando) e avisa que acabou — uma vez só', () => {
    const sh = TestBed.runInInjectionContext(() => new CastShatterComponent());
    const broke = vi.fn();
    const finished = vi.fn();
    sh.broke.subscribe(broke);
    sh.finished.subscribe(finished);
    sh.ngOnChanges();
    expect(sh.phase()).toBe('idle'); // inativo
    sh.active = true;
    sh.ngOnChanges();
    sh.ngOnChanges(); // não recomeça
    vi.advanceTimersByTime(SHATTER_DELAY_MS);
    expect(sh.phase()).toBe('crack');
    vi.advanceTimersByTime(SHATTER_CRACK_MS);
    expect(sh.phase()).toBe('fly');
    expect(broke).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(SHATTER_FLY_MS + 200);
    expect(finished).toHaveBeenCalledTimes(1);
  });

  it('cada caco é um triângulo válido pro clip-path (pontos separados por vírgula)', () => {
    for (const s of SHARDS) {
      const points = s.poly.split(',').map((p) => p.trim());
      expect(points).toHaveLength(3);
      for (const p of points) expect(p).toMatch(/^\d+(\.\d+)?% \d+(\.\d+)?%$/);
    }
  });
});
