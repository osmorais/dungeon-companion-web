import { DEFAULT_MONSTER_IMAGE, monsterToCard } from './monster-card';

describe('monsterToCard (carta do aviso de revelação)', () => {
  it('imagem do mestre, tipo e tamanho na faixa, lore no pergaminho, sem números', () => {
    expect(
      monsterToCard({
        name: 'Gorak, o Goblin',
        imageUrl: 'https://cdn/goblin.png',
        monsterType: 'humanoide',
        size: 'Pequeno',
        lore: ' Pequenos e traiçoeiros. ',
      }),
    ).toEqual({
      title: 'Gorak, o Goblin',
      badge: '?',
      art: 'https://cdn/goblin.png',
      fallbackIcon: DEFAULT_MONSTER_IMAGE,
      artBackground: null,
      artFit: 'cover',
      ribbon: 'HUMANOIDE · PEQUENO',
      stats: [],
      text: 'Pequenos e traiçoeiros.',
      tags: [],
    });
  });

  it('sem imagem, tipo nem lore: imagem padrão, faixa MONSTRO e sem descrição', () => {
    const card = monsterToCard({ name: 'Goblin', imageUrl: null, monsterType: null, lore: '' });
    expect(card.art).toBe(DEFAULT_MONSTER_IMAGE);
    expect(card.ribbon).toBe('MONSTRO');
    expect(card.text).toBeNull();
  });
});
