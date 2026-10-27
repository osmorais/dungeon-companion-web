import { BestiaryMonsterSummary } from '../models/monster-catalog.interface';
import {
  CR_TIERS,
  EMPTY_MONSTER_FILTERS,
  activeFilterCount,
  filterMonsters,
  monsterFilterOptions,
} from './monster-filters';

const monster = (m: Partial<BestiaryMonsterSummary>): BestiaryMonsterSummary => ({
  index: 'x',
  name: 'X',
  challenge_rating: 1,
  size: 'Médio',
  type: 'humanoide',
  alignment: null,
  hp_max: 10,
  ac: 12,
  legendary: false,
  flies: false,
  ...m,
});

const LIST = [
  monster({ index: 'aarakocra', name: 'Aarakocra', challenge_rating: 0.25, flies: true }),
  monster({
    index: 'dragao-vermelho-anciao',
    name: 'Dragão Vermelho Ancião',
    challenge_rating: 24,
    size: 'Imenso',
    type: 'dragão',
    legendary: true,
    flies: true,
  }),
  monster({ index: 'ogro', name: 'Ogro', challenge_rating: 2, size: 'Grande', type: 'gigante' }),
  monster({ index: 'rato', name: 'Rato', challenge_rating: 0, size: 'Miúdo', type: 'besta' }),
];
const ids = (list: BestiaryMonsterSummary[]) => list.map((m) => m.index);
const f = (patch: Partial<typeof EMPTY_MONSTER_FILTERS>) => ({
  ...EMPTY_MONSTER_FILTERS,
  ...patch,
});

describe('filtros das listas de monstros (catalogar e bestiário)', () => {
  it('ordem: por nome, ou como veio (mais recente)', () => {
    const shuffled = [LIST[2], LIST[0], LIST[3], LIST[1]];
    expect(ids(filterMonsters(shuffled, EMPTY_MONSTER_FILTERS))).toEqual(ids(LIST));
    expect(ids(filterMonsters(shuffled, f({ sort: 'recent' })))).toEqual(ids(shuffled));
  });

  it('a busca acha também o outro nome (o original de um monstro renomeado)', () => {
    const renamed = { ...LIST[2], name: 'Brutus', altName: 'Ogro' };
    expect(ids(filterMonsters([renamed], f({ search: 'ogro' })))).toEqual(['ogro']);
    expect(ids(filterMonsters([renamed], f({ search: 'brut' })))).toEqual(['ogro']);
  });

  it('busca pelo nome ignora acento e maiúsculas', () => {
    expect(ids(filterMonsters(LIST, f({ search: 'DRAGAO' })))).toEqual(['dragao-vermelho-anciao']);
  });

  it('faixa de ND inclusiva, com frações no 0–1', () => {
    const tier = (label: string) => CR_TIERS.find((t) => t.label === label)!;
    const byTier = (label: string) =>
      ids(filterMonsters(LIST, f({ crMin: tier(label).min, crMax: tier(label).max })));
    expect(byTier('0–1')).toEqual(['aarakocra', 'rato']);
    expect(byTier('2–4')).toEqual(['ogro']);
    expect(byTier('17+')).toEqual(['dragao-vermelho-anciao']);
  });

  it('tipo, tamanho, lendários e voadores combinam', () => {
    expect(ids(filterMonsters(LIST, f({ type: 'gigante' })))).toEqual(['ogro']);
    expect(ids(filterMonsters(LIST, f({ size: 'Miúdo' })))).toEqual(['rato']);
    expect(ids(filterMonsters(LIST, f({ legendary: true })))).toEqual(['dragao-vermelho-anciao']);
    expect(ids(filterMonsters(LIST, f({ flies: true, crMax: 1 })))).toEqual(['aarakocra']);
  });

  it('ordenar por ND: menor primeiro, empate pelo nome', () => {
    const list = [...LIST, monster({ index: 'abelha', name: 'Abelha', challenge_rating: 0 })];
    expect(ids(filterMonsters(list, f({ sort: 'cr' })))).toEqual([
      'abelha',
      'rato',
      'aarakocra',
      'ogro',
      'dragao-vermelho-anciao',
    ]);
  });

  it('opções: tipos em ordem alfabética e tamanhos na ordem do livro', () => {
    expect(monsterFilterOptions(LIST)).toEqual({
      types: ['besta', 'dragão', 'gigante', 'humanoide'],
      sizes: ['Miúdo', 'Médio', 'Grande', 'Imenso'],
    });
  });

  it('conta os filtros ligados (a ordenação não conta)', () => {
    expect(activeFilterCount(f({ sort: 'cr' }))).toBe(0);
    expect(activeFilterCount(f({ search: ' ' }))).toBe(0);
    expect(activeFilterCount(f({ search: 'og', crMin: 2, flies: true }))).toBe(3);
  });
});
