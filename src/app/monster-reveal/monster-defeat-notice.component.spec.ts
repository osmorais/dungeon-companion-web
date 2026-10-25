import { TestBed } from '@angular/core/testing';
import {
  DEFEAT_BOOM_AT_MS,
  DEFEAT_CRACK_AT_MS,
  MonsterDefeatNoticeComponent,
} from './monster-defeat-notice.component';
import { MonsterRevealInfo } from '../game-card/monster-card';
import { SHARDS } from '../spell-cast/cast-shatter.component';

describe('MonsterDefeatNoticeComponent', () => {
  afterEach(() => vi.useRealTimers());

  const ORC: MonsterRevealInfo = {
    name: 'Orc',
    imageUrl: null,
    monsterType: 'humanoide',
    size: 'Médio',
  };

  function render(info: MonsterRevealInfo = ORC) {
    const fixture = TestBed.createComponent(MonsterDefeatNoticeComponent);
    fixture.componentRef.setInput('info', info);
    fixture.componentRef.setInput('durationMs', 8000);
    let closed = 0;
    fixture.componentInstance.closed.subscribe(() => closed++);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement, closed: () => closed };
  }

  it('a carta aparece inteira, racha e explode em pedaços; o nome entra depois', () => {
    vi.useFakeTimers();
    const { fixture, el } = render();
    expect(el.querySelector('.mdn-card .gc-ribbon')!.textContent).toBe('HUMANOIDE · MÉDIO');
    expect(el.querySelector('.mdn-label')).toBeNull();

    vi.advanceTimersByTime(DEFEAT_CRACK_AT_MS);
    fixture.detectChanges();
    expect(el.querySelector('.mdn-card--cracking .mdn-cracks')).not.toBeNull();

    vi.advanceTimersByTime(DEFEAT_BOOM_AT_MS - DEFEAT_CRACK_AT_MS);
    fixture.detectChanges();
    expect(el.querySelector('.mdn-card')).toBeNull();
    expect(el.querySelectorAll('.mdn-piece app-game-card').length).toBe(SHARDS.length);
    expect(el.querySelectorAll('.mdn-ember').length).toBeGreaterThan(0);
    expect(el.querySelector('.mdn-name')!.textContent).toBe('Orc');
    expect(el.querySelector('.mdn-label')!.textContent).toBe('FOI DERROTADO!');
  });

  it('os pedaços voam pra fora do centro (cada um pro seu lado)', () => {
    const comp = TestBed.createComponent(MonsterDefeatNoticeComponent).componentInstance;
    const left = comp.pieces.filter((p) => p.dx < 0).length;
    const right = comp.pieces.filter((p) => p.dx > 0).length;
    expect(left).toBeGreaterThan(0);
    expect(right).toBeGreaterThan(0);
  });

  it('fecha pelo ✕ e tocando fora, mas não tocando no painel', () => {
    const { el, closed } = render();
    el.querySelector<HTMLElement>('.mdn-panel')!.click();
    expect(closed()).toBe(0);
    el.querySelector<HTMLButtonElement>('.mdn-close')!.click();
    el.querySelector<HTMLElement>('.mdn-overlay')!.click();
    expect(closed()).toBe(2);
  });

  it('imagem do mestre na carta e barra de tempo com a duração da sessão', () => {
    const { el } = render({ ...ORC, imageUrl: 'https://cdn/orc.png' });
    expect(el.querySelector('.gc-art-img')!.getAttribute('src')).toBe('https://cdn/orc.png');
    expect(el.querySelector<HTMLElement>('.mdn-timer-fill')!.style.animationDuration).toBe(
      '8000ms',
    );
  });
});
