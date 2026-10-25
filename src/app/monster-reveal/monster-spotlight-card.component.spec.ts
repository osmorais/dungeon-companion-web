import { TestBed } from '@angular/core/testing';
import { MonsterSpotlightCardComponent } from './monster-spotlight-card.component';
import { RevealedMonster } from '../models/game-session.interface';

describe('MonsterSpotlightCardComponent', () => {
  function render(monster: RevealedMonster) {
    const fixture = TestBed.createComponent(MonsterSpotlightCardComponent);
    fixture.componentRef.setInput('monster', monster);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  const GOBLIN: RevealedMonster = {
    id_monster_session: 'm1',
    name: 'Goblin',
    image_url: null,
    monster_type: 'humanoide',
    size: 'Pequeno',
    lore: 'Pequenos, ruidosos e traiçoeiros.',
  };

  it('mostra a carta pequena do monstro, com a imagem padrão e a faixa', () => {
    const { el } = render(GOBLIN);
    expect(el.querySelector('.gc-title')!.textContent).toContain('Goblin');
    expect(el.querySelector('.gc-ribbon')!.textContent).toBe('HUMANOIDE · PEQUENO');
    expect(el.querySelector('.gc-art-img')!.getAttribute('src')).toBe('assets/monster.png');
    expect(el.querySelector('.gc--full')).toBeNull();
    expect(el.querySelector('app-card-viewer')).toBeNull();
  });

  it('tocar abre a carta em tela cheia com a descrição; VOLTAR fecha', () => {
    const { fixture, el } = render(GOBLIN);
    el.querySelector<HTMLButtonElement>('.msc-card')!.click();
    fixture.detectChanges();
    expect(el.querySelector('app-card-viewer .gc-desc')!.textContent).toContain('traiçoeiros');
    el.querySelector<HTMLButtonElement>('.cv-back')!.click();
    fixture.detectChanges();
    expect(el.querySelector('app-card-viewer')).toBeNull();
  });

  it('monstro antigo, sem carta no bestiário: faixa MONSTRO e imagem do mestre', () => {
    const { el } = render({
      id_monster_session: 'm2',
      name: 'Orc',
      image_url: 'https://cdn/orc.png',
    });
    expect(el.querySelector('.gc-ribbon')!.textContent).toBe('MONSTRO');
    expect(el.querySelector('.gc-art-img')!.getAttribute('src')).toBe('https://cdn/orc.png');
  });
});
