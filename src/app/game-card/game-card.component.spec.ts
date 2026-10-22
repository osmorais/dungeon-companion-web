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
});
