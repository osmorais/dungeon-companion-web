import { TestBed } from '@angular/core/testing';
import { MonsterRevealNoticeComponent } from './monster-reveal-notice.component';
import { MonsterRevealInfo } from '../game-card/monster-card';

describe('MonsterRevealNoticeComponent', () => {
  function render(info: MonsterRevealInfo, durationMs = 15000) {
    const fixture = TestBed.createComponent(MonsterRevealNoticeComponent);
    fixture.componentRef.setInput('info', info);
    fixture.componentRef.setInput('durationMs', durationMs);
    let closed = 0;
    fixture.componentInstance.closed.subscribe(() => closed++);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return { el, closed: () => closed };
  }

  const GOBLIN: MonsterRevealInfo = {
    name: 'Goblin',
    imageUrl: null,
    monsterType: 'humanoide',
    size: 'Pequeno',
    lore: 'Pequenos, ruidosos e traiçoeiros.',
  };

  it('carta grande com verso, imagem padrão, faixa e a descrição no pergaminho', () => {
    const { el } = render(GOBLIN);
    expect(el.querySelector('.mrn-face--back')).not.toBeNull();
    expect(el.querySelector('app-game-card .gc--full')).not.toBeNull();
    expect(el.querySelector<HTMLImageElement>('.gc-art-img')!.getAttribute('src')).toBe(
      'assets/monster.png',
    );
    expect(el.querySelector('.gc-ribbon')!.textContent).toBe('HUMANOIDE · PEQUENO');
    expect(el.querySelector('.gc-desc')!.textContent).toContain('Pequenos, ruidosos');
    expect(el.querySelector('.mrn-title')!.textContent).toContain('Goblin');
    expect(el.querySelector('.gc-badge')!.textContent).toBe('?');
  });

  it('imagem enviada pelo mestre no lugar da padrão', () => {
    const { el } = render({ ...GOBLIN, imageUrl: 'https://cdn/gob.png' });
    expect(el.querySelector('.gc-art-img')!.getAttribute('src')).toBe('https://cdn/gob.png');
  });

  it('fecha pelo ✕ e tocando fora, mas não tocando no painel', () => {
    const { el, closed } = render(GOBLIN);
    el.querySelector<HTMLElement>('.mrn-panel')!.click();
    expect(closed()).toBe(0);
    el.querySelector<HTMLButtonElement>('.mrn-close')!.click();
    el.querySelector<HTMLElement>('.mrn-overlay')!.click();
    expect(closed()).toBe(2);
  });

  it('barra de tempo com a duração da sessão', () => {
    const { el } = render(GOBLIN, 15000);
    expect(el.querySelector<HTMLElement>('.mrn-timer-fill')!.style.animationDuration).toBe(
      '15000ms',
    );
  });
});
