import { TestBed } from '@angular/core/testing';
import { CastTriumphComponent, TRIUMPH_MS } from './cast-triumph.component';

describe('CastTriumphComponent', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('toca uma vez quando fica ativo e avisa no fim', () => {
    const tr = TestBed.runInInjectionContext(() => new CastTriumphComponent());
    const finished = vi.fn();
    tr.finished.subscribe(finished);
    tr.ngOnChanges();
    expect(tr.playing()).toBe(false);
    tr.active = true;
    tr.ngOnChanges();
    tr.ngOnChanges();
    expect(tr.playing()).toBe(true);
    vi.advanceTimersByTime(TRIUMPH_MS);
    expect(finished).toHaveBeenCalledTimes(1);
  });
});
