import { TestBed } from '@angular/core/testing';
import { GameCardComponent } from './game-card.component';

describe('GameCardComponent', () => {
  it('LER TUDO expande a descrição e RECOLHER volta; o clique não abre/fecha a carta de trás', () => {
    const card = TestBed.runInInjectionContext(() => new GameCardComponent());
    const event = new Event('click');
    const stop = vi.spyOn(event, 'stopPropagation');
    expect(card.expanded()).toBe(false);
    card.toggleExpanded(event);
    expect(card.expanded()).toBe(true);
    expect(stop).toHaveBeenCalled();
    card.toggleExpanded(new Event('click'));
    expect(card.expanded()).toBe(false);
  });

  it('carta pequena: sem números mostra a descrição (monstro); com números, não (magia, arma)', () => {
    const base = {
      title: 'X',
      badge: '?',
      art: null,
      fallbackIcon: '',
      artBackground: null,
      ribbon: '',
      text: 'Descrição longa.',
      tags: [],
    };
    const render = (stats: { label: string; value: string }[]) => {
      const fixture = TestBed.createComponent(GameCardComponent);
      fixture.componentInstance.card = { ...base, stats };
      fixture.componentInstance.size = 'mini';
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    };
    const monster = render([]);
    expect(monster.querySelector('.gc-desc')?.textContent).toContain('Descrição longa.');
    expect(monster.querySelector('.gc-expand')).toBeNull();
    expect(render([{ label: 'TEMPO', value: '1 ação' }]).querySelector('.gc-desc')).toBeNull();
  });
});
