import {
  DEFAULT_MONSTER_IMAGE,
  MONSTER_ART_SLUGS,
  bestiaryMonsterCard,
  catalogMonsterCard,
  catalogMonsterCardState,
  defaultMonsterImage,
  monsterActionToCard,
  monsterImage,
  monsterToCard,
} from './monster-card';
import { MonsterCatalogEntry } from '../models/monster-catalog.interface';

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

  it('resistência: o atributo no medalhão (a CD não vai pra mesa); sem imagem, a padrão', () => {
    const card = monsterActionToCard(
      { name: 'Sopro', kind: 'save', stats: [{ label: 'RESISTÊNCIA', value: 'DES' }] },
      null,
    );
    expect(card.badge).toBe('DES');
    // aviso de antes da 1.19.0 (com a CD no pergaminho) continua abrindo
    expect(
      monsterActionToCard(
        { name: 'Sopro', kind: 'save', stats: [{ label: 'CD', value: '13 DES' }] },
        null,
      ).badge,
    ).toBe('13');
    expect(card.ribbon).toBe('EFEITO COM RESISTÊNCIA');
    expect(card.art).toBe(DEFAULT_MONSTER_IMAGE);
    // A carta da ação usa a moldura comum (medalhão com a CD), não a do monstro.
    expect(card.variant).toBeUndefined();
  });
});

describe('catalogMonsterCard (bestiário: lista e detalhe)', () => {
  const entry = (overrides: Partial<MonsterCatalogEntry> = {}): MonsterCatalogEntry => ({
    id_monster_catalog: 'm1',
    monster_api_slug: 'ogro',
    custom_name: null,
    hp_max: 59,
    ac: 11,
    created_at: '2026-01-01T00:00:00.000Z',
    image_url: null,
    data_snapshot: {
      index: 'ogro',
      name: 'Ogro',
      size: 'Grande',
      type: 'gigante',
      alignment: '',
      armor_class: [{ type: 'natural', value: 11 }],
      hit_points: 59,
      hit_dice: '7d10',
      speed: { terrestre: '12 m' },
      strength: 19,
      dexterity: 8,
      constitution: 16,
      intelligence: 5,
      wisdom: 7,
      charisma: 7,
      challenge_rating: 2,
      xp: 450,
    },
    ...overrides,
  });

  it('nome customizado, ND no medalhão, arte do slug e resumo com os números do catálogo', () => {
    const card = catalogMonsterCard(entry({ custom_name: 'Brutus', hp_max: 70, ac: 13 }));
    expect(card).toMatchObject({
      title: 'Brutus',
      badge: '2',
      art: 'assets/monsters/ogro.webp',
      ribbon: 'GIGANTE · GRANDE',
      text: 'Grande gigante.\nCA 13 · PV 70 · ND 2.',
      variant: 'monster',
    });
  });

  it('brilho de ameaça só a partir do ND 5', () => {
    expect(catalogMonsterCardState(entry())).toBeNull();
    const forte = entry();
    forte.data_snapshot = { ...forte.data_snapshot, challenge_rating: 5 };
    expect(catalogMonsterCardState(forte)).toBe('threat');
  });
});

describe('bestiaryMonsterCard (tela de catalogar)', () => {
  const ogro = {
    index: 'ogro',
    name: 'Ogro',
    challenge_rating: 2,
    size: 'Grande',
    type: 'gigante',
    alignment: 'caótico e mau',
    hp_max: 59,
    ac: 11,
    legendary: false,
    flies: false,
  };

  it('a mesma carta do bestiário, com a arte do slug e os números do livro', () => {
    expect(bestiaryMonsterCard(ogro)).toMatchObject({
      title: 'Ogro',
      badge: '2',
      art: 'assets/monsters/ogro.webp',
      ribbon: 'GIGANTE · GRANDE',
      text: 'Grande gigante, caótico e mau.\nCA 11 · PV 59 · ND 2.',
    });
  });

  it('nome customizado no título; em branco fica o do livro', () => {
    expect(bestiaryMonsterCard(ogro, ' Brutus ').title).toBe('Brutus');
    expect(bestiaryMonsterCard(ogro, '   ').title).toBe('Ogro');
  });
});

describe('arte padrão do monstro (1.23.0)', () => {
  it('slug com arte → a arte; sem arte, sem slug ou slug antigo → a genérica', () => {
    expect(defaultMonsterImage('goblin')).toBe('assets/monsters/goblin.webp');
    expect(defaultMonsterImage('dragao-vermelho-jovem')).toBe(DEFAULT_MONSTER_IMAGE);
    expect(defaultMonsterImage('goblin-boss')).toBe(DEFAULT_MONSTER_IMAGE);
    expect(defaultMonsterImage(null)).toBe(DEFAULT_MONSTER_IMAGE);
    expect(defaultMonsterImage(undefined)).toBe(DEFAULT_MONSTER_IMAGE);
  });

  it('a imagem que o mestre subiu ganha da arte', () => {
    expect(monsterImage('https://x/minha.png', 'goblin')).toBe('https://x/minha.png');
    expect(monsterImage(null, 'goblin')).toBe('assets/monsters/goblin.webp');
    expect(monsterImage('', 'kobold')).toBe('assets/monsters/kobold.webp');
  });

  it('as 24 artes das levas 1 e 2', () => {
    expect(MONSTER_ART_SLUGS.size).toBe(24);
  });

  it('bestiário sem arte continua com a genérica', () => {
    const card = bestiaryMonsterCard({
      index: 'troll',
      name: 'Troll',
      challenge_rating: 5,
      size: 'Grande',
      type: 'gigante',
      alignment: null,
      hp_max: 84,
      ac: 15,
      legendary: false,
      flies: false,
    });
    expect(card.art).toBe(DEFAULT_MONSTER_IMAGE);
  });
});
