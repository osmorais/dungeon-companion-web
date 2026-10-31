import { SpellCatalogEntry } from '../models/spell-catalog.interface';
import { CLASS_SPELLS } from '../constants/spell-rules';
import {
  EMPTY_SPELL_FILTERS,
  SPELL_CLASSES,
  SpellFilters,
  activeSpellFilterCount,
  filterSpells,
  spellRange,
  spellSchoolOptions,
} from './spell-filters';
import { SPELL_ELEMENTS, SPELL_FUNCTIONS, SPELL_TAGS } from './spell-tags';

const spell = (s: Partial<SpellCatalogEntry>): SpellCatalogEntry => ({
  id_spell: 0,
  name: 'X',
  description: null,
  casting_time: '1 ação',
  range_distance: null,
  duration: 'Instantânea',
  is_verbal: true,
  is_somatic: true,
  is_material: false,
  spellLevel: 1,
  school: 'Evocação',
  ...s,
});

// Ids reais das listas: um que só o Mago tem e um que o Clérigo tem e o Mago não.
const wizardOnly = CLASS_SPELLS[9].find((id) => !CLASS_SPELLS[4].includes(id))!;
const clericOnly = CLASS_SPELLS[4].find((id) => !CLASS_SPELLS[9].includes(id))!;

const LIST = [
  spell({ id_spell: wizardOnly, name: 'Bola de Fogo', spellLevel: 3 }),
  spell({
    id_spell: clericOnly,
    name: 'Palavra Curativa',
    spellLevel: 1,
    casting_time: '1 ação bônus',
    school: 'Conjuração',
  }),
  spell({
    id_spell: 9001,
    name: 'Escudo Arcano',
    spellLevel: 1,
    casting_time: '1 reação',
    school: 'Abjuração',
  }),
  spell({
    id_spell: 9002,
    name: 'Ilusão Menor',
    spellLevel: 0,
    duration: 'Concentração, até 1 minuto',
    school: 'Ilusão',
  }),
];
const names = (list: SpellCatalogEntry[]) => list.map((s) => s.name);
const f = (patch: Partial<SpellFilters>): SpellFilters => ({ ...EMPTY_SPELL_FILTERS, ...patch });

describe('filterSpells', () => {
  it('sem filtro: ordena por círculo e depois pelo nome', () => {
    expect(names(filterSpells(LIST, EMPTY_SPELL_FILTERS))).toEqual([
      'Ilusão Menor',
      'Escudo Arcano',
      'Palavra Curativa',
      'Bola de Fogo',
    ]);
  });

  it('ordena só pelo nome', () => {
    expect(names(filterSpells(LIST, f({ sort: 'name' })))).toEqual([
      'Bola de Fogo',
      'Escudo Arcano',
      'Ilusão Menor',
      'Palavra Curativa',
    ]);
  });

  it('busca pelo nome sem acento e sem maiúscula', () => {
    expect(names(filterSpells(LIST, f({ search: 'ilusao' })))).toEqual(['Ilusão Menor']);
  });

  it('filtra pelo círculo, com o truque como 0', () => {
    expect(names(filterSpells(LIST, f({ level: 0 })))).toEqual(['Ilusão Menor']);
    expect(names(filterSpells(LIST, f({ level: 1 })))).toEqual([
      'Escudo Arcano',
      'Palavra Curativa',
    ]);
  });

  it('filtra pela escola', () => {
    expect(names(filterSpells(LIST, f({ school: 'Conjuração' })))).toEqual(['Palavra Curativa']);
  });

  it('filtra pela lista de magias da classe', () => {
    expect(names(filterSpells(LIST, f({ classId: 9 })))).toEqual(['Bola de Fogo']);
    expect(names(filterSpells(LIST, f({ classId: 4 })))).toEqual(['Palavra Curativa']);
  });

  it('classe sem lista não mostra nada', () => {
    expect(filterSpells(LIST, f({ classId: 1 }))).toEqual([]);
  });

  it('concentração, ação bônus e reação', () => {
    expect(names(filterSpells(LIST, f({ concentration: true })))).toEqual(['Ilusão Menor']);
    expect(names(filterSpells(LIST, f({ bonusAction: true })))).toEqual(['Palavra Curativa']);
    expect(names(filterSpells(LIST, f({ reaction: true })))).toEqual(['Escudo Arcano']);
  });

  it('não altera a lista original', () => {
    const copy = [...LIST];
    filterSpells(LIST, f({ sort: 'name' }));
    expect(LIST).toEqual(copy);
  });
});

describe('opções e contagem', () => {
  it('escolas distintas em ordem alfabética', () => {
    expect(spellSchoolOptions([...LIST, spell({ school: null })])).toEqual([
      'Abjuração',
      'Conjuração',
      'Evocação',
      'Ilusão',
    ]);
  });

  it('toda classe do filtro tem lista de magias', () => {
    for (const c of SPELL_CLASSES) expect(CLASS_SPELLS[c.id]?.length).toBeGreaterThan(0);
  });

  it('conta os filtros ligados, fora a ordenação', () => {
    expect(activeSpellFilterCount(f({ sort: 'name' }))).toBe(0);
    expect(activeSpellFilterCount(f({ level: 0, classId: 2, reaction: true }))).toBe(3);
  });
});

describe('elemento, função e alcance', () => {
  // Ids reais da tabela SPELL_TAGS: Bola de Fogo (44), Curar Ferimentos (108), Raio de Gelo (288).
  const TAGGED = [
    spell({ id_spell: 44, name: 'Bola de Fogo', range_distance: 45 }),
    spell({ id_spell: 108, name: 'Curar Ferimentos', range_distance: 1 }),
    spell({ id_spell: 288, name: 'Raio de Gelo', spellLevel: 0, range_distance: 18 }),
    spell({ id_spell: 9999, name: 'Sem classificação', range_distance: 0 }),
  ];

  it('filtra pelo elemento', () => {
    expect(names(filterSpells(TAGGED, f({ element: 'fogo' })))).toEqual(['Bola de Fogo']);
    expect(names(filterSpells(TAGGED, f({ element: 'frio' })))).toEqual(['Raio de Gelo']);
  });

  it('filtra pela função', () => {
    expect(names(filterSpells(TAGGED, f({ role: 'curar' })))).toEqual(['Curar Ferimentos']);
    expect(names(filterSpells(TAGGED, f({ role: 'dano-area' })))).toEqual(['Bola de Fogo']);
  });

  it('magia fora da tabela não entra quando há filtro de elemento ou função', () => {
    expect(names(filterSpells(TAGGED, f({ role: 'utilidade' })))).toEqual([]);
    expect(filterSpells(TAGGED, EMPTY_SPELL_FILTERS)).toHaveLength(4);
  });

  it('faixas de alcance: 0 pessoal, 1 toque, até 9 m e 18 m ou mais', () => {
    expect(spellRange(0)).toBe('self');
    expect(spellRange(1)).toBe('touch');
    expect(spellRange(9)).toBe('short');
    expect(spellRange(18)).toBe('long');
    expect(spellRange(null)).toBeNull();
    expect(names(filterSpells(TAGGED, f({ range: 'long' })))).toEqual([
      'Raio de Gelo',
      'Bola de Fogo',
    ]);
    expect(names(filterSpells(TAGGED, f({ range: 'touch' })))).toEqual(['Curar Ferimentos']);
  });

  it('elemento, função e alcance contam como filtros ligados', () => {
    expect(activeSpellFilterCount(f({ element: 'fogo', role: 'curar', range: 'self' }))).toBe(3);
  });
});

describe('SPELL_TAGS', () => {
  const entries = Object.entries(SPELL_TAGS);
  const elements = new Set(SPELL_ELEMENTS.map((e) => e.value));
  const roles = new Set(SPELL_FUNCTIONS.map((r) => r.value));

  it('classifica as 361 magias do catálogo (ids 2 a 362)', () => {
    expect(entries).toHaveLength(361);
    expect(entries.every(([id]) => Number(id) >= 2 && Number(id) <= 362)).toBe(true);
  });

  it('toda magia tem ao menos uma função e só valores conhecidos, sem repetir', () => {
    for (const [, [els, fns]] of entries) {
      expect(fns.length).toBeGreaterThan(0);
      expect(els.every((e) => elements.has(e))).toBe(true);
      expect(fns.every((r) => roles.has(r))).toBe(true);
      expect(new Set(els).size).toBe(els.length);
      expect(new Set(fns).size).toBe(fns.length);
    }
  });

  it('todo elemento e toda função têm ao menos uma magia', () => {
    const usedEls = new Set(entries.flatMap(([, [els]]) => els));
    const usedFns = new Set(entries.flatMap(([, [, fns]]) => fns));
    expect([...elements].filter((e) => !usedEls.has(e))).toEqual([]);
    expect([...roles].filter((r) => !usedFns.has(r))).toEqual([]);
  });
});
