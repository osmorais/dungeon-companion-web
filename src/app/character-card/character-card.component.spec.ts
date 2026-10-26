import { TestBed } from '@angular/core/testing';
import { CharacterCardComponent, CharacterCardData } from './character-card.component';
import { monsterToCard } from '../game-card/monster-card';

describe('CharacterCardComponent', () => {
  function render(card: CharacterCardData) {
    const fixture = TestBed.createComponent(CharacterCardComponent);
    fixture.componentRef.setInput('card', card);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('monstro com carta (1.13.0): mostra a carta dele no lugar do card', () => {
    const el = render({
      name: 'Goblin',
      imageUrl: 'g.png',
      avatarPreset: null,
      monsterCard: monsterToCard({ name: 'Goblin', imageUrl: 'g.png', monsterType: 'humanoide' }),
    });
    expect(el.querySelector('.turn-card')).toBeNull();
    expect(el.querySelector('app-game-card .gc-title')?.textContent).toContain('Goblin');
    expect(el.querySelector('.gc-art-img')?.getAttribute('src')).toBe('g.png');
  });

  it('monstro sem carta (escondido pro jogador): imagem e nome, como antes', () => {
    const el = render({ name: 'Monstro misterioso', imageUrl: null, avatarPreset: null });
    expect(el.querySelector('app-game-card')).toBeNull();
    expect(el.querySelector('.turn-card-name')?.textContent).toContain('Monstro misterioso');
  });
});
