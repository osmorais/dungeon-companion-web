import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { SpellGrimoireComponent } from './spell-grimoire.component';
import { SpellCatalogService } from '../services/spell-catalog.service';
import { SpellCatalogEntry } from '../models/spell-catalog.interface';

const spell = (id: number, name: string, level = 1): SpellCatalogEntry => ({
  id_spell: id,
  name,
  description: null,
  casting_time: '1 ação',
  range_distance: null,
  duration: null,
  is_verbal: true,
  is_somatic: false,
  is_material: false,
  spellLevel: level,
  school: 'Evocação',
});

// 45 magias: Bola de Fogo (id 44, 3º círculo, fogo) e 44 truques "Magia N".
const SPELLS = [
  spell(44, 'Bola de Fogo', 3),
  ...Array.from({ length: 44 }, (_, i) => spell(1000 + i, `Magia ${i + 1}`, 0)),
];

describe('SpellGrimoireComponent (grimório do mestre)', () => {
  let grimoire: SpellGrimoireComponent;

  function setup(getAll = vi.fn(() => of(SPELLS))) {
    TestBed.configureTestingModule({
      providers: [{ provide: SpellCatalogService, useValue: { getAll } }],
    });
    grimoire = TestBed.runInInjectionContext(() => new SpellGrimoireComponent());
    grimoire.ngOnInit();
    return getAll;
  }

  afterEach(() => vi.useRealTimers());

  it('carrega o catálogo inteiro como cartas, 20 por página', () => {
    const getAll = setup();
    expect(getAll).toHaveBeenCalledTimes(1);
    expect(grimoire.loading()).toBe(false);
    expect(grimoire.cards()).toHaveLength(20);
    expect(grimoire.totalPages()).toBe(3);
  });

  it('filtra no navegador (busca, círculo, elemento) e volta pra primeira página', () => {
    setup();
    grimoire.goTo(2);
    grimoire.patchFilters({ search: 'fogo' });
    expect(grimoire.page()).toBe(1);
    expect(grimoire.cards().map((c) => c.card.title)).toEqual(['Bola de Fogo']);
    grimoire.patchFilters({ search: '', level: 0 });
    expect(grimoire.filteredSpells()).toHaveLength(44);
    grimoire.patchFilters({ level: null, element: 'fogo' });
    expect(grimoire.filteredSpells().map((s) => s.id_spell)).toEqual([44]);
  });

  it('limpar filtros mantém a ordenação', () => {
    setup();
    grimoire.patchFilters({ level: 0, sort: 'name' });
    grimoire.clearFilters();
    expect(grimoire.filters().level).toBeNull();
    expect(grimoire.filters().sort).toBe('name');
  });

  it('paginação não passa das pontas', () => {
    setup();
    grimoire.goTo(0);
    grimoire.goTo(4);
    expect(grimoire.page()).toBe(1);
    grimoire.goTo(3);
    expect(grimoire.page()).toBe(3);
    expect(grimoire.cards()).toHaveLength(5);
  });

  it('erro ao carregar', () => {
    setup(vi.fn(() => throwError(() => new Error('x'))));
    expect(grimoire.error()).toBe(true);
    expect(grimoire.loading()).toBe(false);
  });

  it('Esc fecha o grimório, mas não quando fecha a carta em tela cheia', () => {
    vi.useFakeTimers();
    setup();
    const closed = vi.fn();
    grimoire.closed.subscribe(closed);
    grimoire.openCard(SPELLS[0]);
    grimoire.onEscape();
    expect(closed).not.toHaveBeenCalled();
    grimoire.closeCard();
    grimoire.onEscape();
    expect(closed).not.toHaveBeenCalled();
    vi.runAllTimers();
    grimoire.onEscape();
    expect(closed).toHaveBeenCalledTimes(1);
  });
});
