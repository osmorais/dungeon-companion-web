import { CLASS_SPELLS } from '../constants/spell-rules';
import { SpellCatalogEntry } from '../models/spell-catalog.interface';
import { normalizeSearch } from '../services/monster-format';
import { SPELL_TAGS, SpellElement, SpellFunction } from './spell-tags';

/** Filtros do grimório de magias em carta (mesmo painel do catalogar monstros). Elemento e função
 *  vêm da classificação em `spell-tags.ts`. */
export interface SpellFilters {
  search: string;
  /** Círculo (0 = truque); `null` = todos. */
  level: number | null;
  school: string;
  /** `id_class` da lista de magias da classe; `null` = todas. */
  classId: number | null;
  element: SpellElement | '';
  role: SpellFunction | '';
  range: SpellRange | null;
  concentration: boolean;
  bonusAction: boolean;
  reaction: boolean;
  sort: SpellSort;
}

export type SpellSort = 'level' | 'name';

/** Faixa de alcance. No banco, `range_distance` 0 = pessoal e 1 = toque; o resto é em metros. */
export type SpellRange = 'self' | 'touch' | 'short' | 'long';

export const EMPTY_SPELL_FILTERS: SpellFilters = {
  search: '',
  level: null,
  school: '',
  classId: null,
  element: '',
  role: '',
  range: null,
  concentration: false,
  bonusAction: false,
  reaction: false,
  sort: 'level',
};

export const SPELL_LEVELS: { label: string; value: number | null }[] = [
  { label: 'TODOS', value: null },
  { label: 'TRUQUE', value: 0 },
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ label: `${n}º`, value: n })),
];

export const SPELL_RANGES: { label: string; value: SpellRange | null }[] = [
  { label: 'TODOS', value: null },
  { label: 'PESSOAL', value: 'self' },
  { label: 'TOQUE', value: 'touch' },
  { label: 'ATÉ 9 M', value: 'short' },
  { label: '18 M OU MAIS', value: 'long' },
];

/** A faixa de alcance da magia; sem alcance gravado, nenhuma. */
export function spellRange(distance: number | null): SpellRange | null {
  if (distance === null) return null;
  if (distance === 0) return 'self';
  if (distance <= 2) return 'touch';
  return distance < 18 ? 'short' : 'long';
}

/** Classes conjuradoras, na ordem alfabética (ids de `CLASS_SPELLS`). */
export const SPELL_CLASSES: { id: number; label: string }[] = [
  { id: 2, label: 'Bardo' },
  { id: 3, label: 'Bruxo' },
  { id: 4, label: 'Clérigo' },
  { id: 5, label: 'Druida' },
  { id: 6, label: 'Feiticeiro' },
  { id: 9, label: 'Mago' },
  { id: 11, label: 'Paladino' },
  { id: 12, label: 'Patrulheiro' },
];

const CLASS_SPELL_SETS = new Map(
  Object.entries(CLASS_SPELLS).map(([id, spells]) => [Number(id), new Set(spells)]),
);

const byName = (a: SpellCatalogEntry, b: SpellCatalogEntry) =>
  a.name.localeCompare(b.name, 'pt', { numeric: true });

const has = (text: string | null, term: string) => !!text && normalizeSearch(text).includes(term);

export function filterSpells(list: SpellCatalogEntry[], f: SpellFilters): SpellCatalogEntry[] {
  const term = normalizeSearch(f.search);
  const classSpells = f.classId === null ? null : (CLASS_SPELL_SETS.get(f.classId) ?? new Set());
  const result = list.filter(
    (s) =>
      (!term || normalizeSearch(s.name).includes(term)) &&
      (f.level === null || s.spellLevel === f.level) &&
      (!f.school || s.school === f.school) &&
      (!classSpells || classSpells.has(s.id_spell)) &&
      (!f.element || !!SPELL_TAGS[s.id_spell]?.[0].includes(f.element)) &&
      (!f.role || !!SPELL_TAGS[s.id_spell]?.[1].includes(f.role)) &&
      (f.range === null || spellRange(s.range_distance) === f.range) &&
      (!f.concentration || has(s.duration, 'concentracao')) &&
      (!f.bonusAction || has(s.casting_time, 'acao bonus')) &&
      (!f.reaction || has(s.casting_time, 'reacao')),
  );
  if (f.sort === 'name') return result.sort(byName);
  return result.sort((a, b) => a.spellLevel - b.spellLevel || byName(a, b));
}

/** Escolas que existem na lista, em ordem alfabética, pro select. */
export function spellSchoolOptions(list: SpellCatalogEntry[]): string[] {
  const schools = list.map((s) => s.school).filter((s): s is string => !!s?.trim());
  return [...new Set(schools)].sort((a, b) => a.localeCompare(b, 'pt'));
}

/** Quantos filtros estão ligados (fora a ordenação), pro LIMPAR FILTROS. */
export function activeSpellFilterCount(f: SpellFilters): number {
  return [
    !!f.search.trim(),
    f.level !== null,
    !!f.school,
    f.classId !== null,
    !!f.element,
    !!f.role,
    f.range !== null,
    f.concentration,
    f.bonusAction,
    f.reaction,
  ].filter(Boolean).length;
}
