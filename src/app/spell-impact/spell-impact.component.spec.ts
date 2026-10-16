import { TestBed } from '@angular/core/testing';
import { SpellImpactComponent } from './spell-impact.component';
import { DamageImpact } from '../services/damage-impact.service';

describe('SpellImpactComponent', () => {
  function render(impact: DamageImpact) {
    const fixture = TestBed.createComponent(SpellImpactComponent);
    fixture.componentRef.setInput('impact', impact);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it.each([1, 2, 3] as const)(
    'magia intensidade %i: projétil, explosão e partículas',
    (intensity) => {
      const el = render({
        key: 1,
        total: 21,
        intensity,
        effect: { kind: 'spell', element: 'cold' },
      });
      const root = el.querySelector('.spell-impact')!;
      expect(root.classList).toContain('spell-impact--cold');
      expect(root.classList).toContain(`spell-impact--i${intensity}`);
      expect(root.getAttribute('aria-hidden')).toBe('true');
      expect(el.querySelector('.spell-impact__projectile')).not.toBeNull();
      expect(el.querySelectorAll('.spell-impact__particle').length).toBe(intensity * 4 + 4);
      expect(el.querySelector('.spell-impact__value')!.textContent).toBe('21');
    },
  );

  it('cura: névoa, brilhos e "+N"', () => {
    const el = render({ key: 1, total: 9, intensity: 2, effect: { kind: 'heal', tempHp: false } });
    const root = el.querySelector('.heal-impact')!;
    expect(root.classList).not.toContain('heal-impact--temp');
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelectorAll('.heal-impact__mist').length).toBeGreaterThan(0);
    expect(el.querySelectorAll('.heal-impact__sparkle').length).toBeGreaterThan(0);
    expect(el.querySelector('.heal-impact__value')!.textContent).toBe('+9');
    expect(el.querySelector('.spell-impact')).toBeNull();
  });

  it('PV temporários: variante azul-clara', () => {
    const el = render({ key: 1, total: 6, intensity: 1, effect: { kind: 'heal', tempHp: true } });
    expect(el.querySelector('.heal-impact')!.classList).toContain('heal-impact--temp');
  });
});
