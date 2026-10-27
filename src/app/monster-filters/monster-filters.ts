import { normalizeSearch } from '../services/monster-format';

/** Filtros das listas de monstros em carta (catalogar e bestiário, 1.14.0). */
export interface MonsterFilters {
  search: string;
  /** Faixa de ND (inclusiva); `null` = sem limite. */
  crMin: number | null;
  crMax: number | null;
  type: string;
  size: string;
  legendary: boolean;
  flies: boolean;
  /** `recent` mantém a ordem que veio (o bestiário vem do mais novo pro mais antigo). */
  sort: MonsterSort;
}

export type MonsterSort = 'recent' | 'name' | 'cr';

/** O que os filtros olham em cada monstro (o livro já vem assim; o bestiário é convertido). */
export interface FilterableMonster {
  name: string;
  /** Outro nome que a busca também acha (o original, quando o mestre deu um nome próprio). */
  altName?: string | null;
  challenge_rating: number;
  type: string;
  size: string;
  legendary: boolean;
  flies: boolean;
}

export const EMPTY_MONSTER_FILTERS: MonsterFilters = {
  search: '',
  crMin: null,
  crMax: null,
  type: '',
  size: '',
  legendary: false,
  flies: false,
  sort: 'name',
};

/** Faixas de ND, mais ou menos os patamares de jogo (níveis 1–4, 5–10, 11–16, 17–20). */
export const CR_TIERS: { label: string; min: number | null; max: number | null }[] = [
  { label: 'TODOS', min: null, max: null },
  { label: '0–1', min: 0, max: 1 },
  { label: '2–4', min: 2, max: 4 },
  { label: '5–10', min: 5, max: 10 },
  { label: '11–16', min: 11, max: 16 },
  { label: '17+', min: 17, max: null },
];

/** Tamanhos na ordem do livro (os que não estiverem aqui vão pro fim). */
const SIZE_ORDER = ['Miúdo', 'Pequeno', 'Médio', 'Grande', 'Enorme', 'Imenso'];

// numeric: "Esqueleto 2" antes de "Esqueleto 10".
const byName = (a: FilterableMonster, b: FilterableMonster) =>
  a.name.localeCompare(b.name, 'pt', { numeric: true });

export function filterMonsters<T extends FilterableMonster>(list: T[], f: MonsterFilters): T[] {
  const term = normalizeSearch(f.search);
  const result = list.filter(
    (m) =>
      (!term ||
        normalizeSearch(m.name).includes(term) ||
        (!!m.altName && normalizeSearch(m.altName).includes(term))) &&
      (f.crMin === null || m.challenge_rating >= f.crMin) &&
      (f.crMax === null || m.challenge_rating <= f.crMax) &&
      (!f.type || m.type === f.type) &&
      (!f.size || m.size === f.size) &&
      (!f.legendary || m.legendary) &&
      (!f.flies || m.flies),
  );
  if (f.sort === 'name') return [...result].sort(byName);
  if (f.sort === 'cr') {
    return [...result].sort((a, b) => a.challenge_rating - b.challenge_rating || byName(a, b));
  }
  return result;
}

/** Tipos e tamanhos que existem na lista, pros selects. */
export function monsterFilterOptions(list: FilterableMonster[]): {
  types: string[];
  sizes: string[];
} {
  const distinct = (values: string[]) => [...new Set(values.filter((v) => !!v?.trim()))];
  const sizeRank = (s: string) => {
    const i = SIZE_ORDER.indexOf(s);
    return i === -1 ? SIZE_ORDER.length : i;
  };
  return {
    types: distinct(list.map((m) => m.type)).sort((a, b) => a.localeCompare(b, 'pt')),
    sizes: distinct(list.map((m) => m.size)).sort((a, b) => sizeRank(a) - sizeRank(b)),
  };
}

/** Quantos filtros estão ligados (fora a ordenação), pro LIMPAR FILTROS. */
export function activeFilterCount(f: MonsterFilters): number {
  return [
    !!f.search.trim(),
    f.crMin !== null || f.crMax !== null,
    !!f.type,
    !!f.size,
    f.legendary,
    f.flies,
  ].filter(Boolean).length;
}
