import { DEFAULT_MONSTER_IMAGE, monsterActionToCard, monsterToCard } from './monster-card';

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
      variant: 'monster',
    });
  });

  it('sem imagem, tipo nem lore: imagem padrão, faixa MONSTRO e sem descrição', () => {
    const card = monsterToCard({ name: 'Goblin', imageUrl: null, monsterType: null, lore: '' });
    expect(card.art).toBe(DEFAULT_MONSTER_IMAGE);
    expect(card.ribbon).toBe('MONSTRO');
    expect(card.text).toBeNull();
  });
});

describe('monsterActionToCard (carta da ação na tela de lançamento)', () => {
  const stats = [
    { label: 'ATAQUE', value: '+4' },
    { label: 'DANO', value: '1d6+2 cortante' },
  ];

  it('ataque: bônus no medalhão, imagem do monstro na arte, números no pergaminho', () => {
    const card = monsterActionToCard({ name: 'Cimitarra', kind: 'attack', stats }, 'g.png');
    expect(card).toMatchObject({
      title: 'Cimitarra',
      badge: '+4',
      art: 'g.png',
      ribbon: 'ATAQUE DE MONSTRO',
      stats,
      text: null,
    });
  });

  it('resistência: a CD no medalhão; sem imagem, a padrão', () => {
    const card = monsterActionToCard(
      { name: 'Sopro', kind: 'save', stats: [{ label: 'CD', value: '13 DES' }] },
      null,
    );
    expect(card.badge).toBe('13');
    expect(card.ribbon).toBe('EFEITO COM RESISTÊNCIA');
    expect(card.art).toBe(DEFAULT_MONSTER_IMAGE);
    // A carta da ação usa a moldura comum (medalhão com a CD), não a do monstro.
    expect(card.variant).toBeUndefined();
  });
});
