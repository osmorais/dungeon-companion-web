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

  it('carta do monstro (variant) leva a classe da moldura própria; as outras não', () => {
    const render = (variant?: 'monster') => {
      const fixture = TestBed.createComponent(GameCardComponent);
      fixture.componentInstance.card = {
        title: 'Goblin',
        badge: '?',
        art: null,
        fallbackIcon: '',
        artBackground: null,
        ribbon: '',
        stats: [],
        text: null,
        tags: [],
        ...(variant ? { variant } : {}),
      };
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    };
    expect(render('monster').querySelector('.gc--monster')).not.toBeNull();
    expect(render().querySelector('.gc--monster')).toBeNull();
  });

  it('monstro perigoso (threat) leva o brilho e o selo PERIGOSO; os outros estados não', () => {
    const render = (state: 'threat' | 'ready' | null) => {
      const fixture = TestBed.createComponent(GameCardComponent);
      fixture.componentInstance.card = {
        title: 'Ogro',
        badge: '2',
        art: null,
        fallbackIcon: '',
        artBackground: null,
        ribbon: '',
        stats: [],
        text: null,
        tags: [],
        variant: 'monster',
      };
      fixture.componentInstance.state = state;
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    };
    const threat = render('threat');
    expect(threat.querySelector('.gc--threat')).not.toBeNull();
    expect(threat.querySelector('.gc-danger')?.textContent?.trim()).toBe('PERIGOSO');
    expect(render('ready').querySelector('.gc-danger')).toBeNull();
    expect(render(null).querySelector('.gc-danger')).toBeNull();
  });
});
