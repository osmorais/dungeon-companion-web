import { TestBed } from '@angular/core/testing';
import { DamageImpactComponent } from './damage-impact.component';
import { DamageImpactService } from '../services/damage-impact.service';

describe('DamageImpactComponent', () => {
  function render() {
    const fixture = TestBed.createComponent(DamageImpactComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('não mostra nada sem dano', () => {
    const el: HTMLElement = render().nativeElement;
    expect(el.querySelector('.damage-impact')).toBeNull();
  });

  it.each([1, 2, 3] as const)(
    'intensidade %i: %i golpe(s) e flash(es) + o valor do dano',
    (intensity) => {
      const service = TestBed.inject(DamageImpactService);
      const fixture = render();
      service.current.set({ key: 1, total: 17, intensity, effect: null });
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.damage-impact')!.classList).toContain(
        `damage-impact--${intensity}`,
      );
      expect(el.querySelectorAll('.damage-impact__slash').length).toBe(intensity);
      expect(el.querySelectorAll('.damage-impact__flash').length).toBe(intensity);
      expect(el.querySelector('.damage-impact__value')!.textContent).toBe('17');
    },
  );

  it('magia: efeito do elemento no lugar dos golpes', () => {
    const service = TestBed.inject(DamageImpactService);
    const fixture = render();
    service.current.set({
      key: 1,
      total: 28,
      intensity: 2,
      effect: { kind: 'spell', element: 'fire' },
    });
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.damage-impact__slash')).toBeNull();
    expect(el.querySelector('.spell-impact')!.classList).toContain('spell-impact--fire');
  });

  it('é decorativo pra leitor de tela', () => {
    const service = TestBed.inject(DamageImpactService);
    const fixture = render();
    service.current.set({ key: 1, total: 3, intensity: 1, effect: null });
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('.damage-impact')!
        .getAttribute('aria-hidden'),
    ).toBe('true');
  });
});
