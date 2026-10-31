import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SpellCatalogListComponent } from './spell-catalog-list.component';
import { SpellCatalogService } from '../services/spell-catalog.service';
import { SpellCatalogEntry } from '../models/spell-catalog.interface';

const spell = (id: number, level = 1, school = 'Evocação'): SpellCatalogEntry => ({
  id_spell: id,
  name: `Magia ${id}`,
  description: null,
  casting_time: '1 ação',
  range_distance: null,
  duration: null,
  is_verbal: true,
  is_somatic: false,
  is_material: false,
  spellLevel: level,
  school,
});

// 10 magias: 2 truques e 8 de 1º círculo.
const SPELLS = Array.from({ length: 10 }, (_, i) => spell(i + 1, i < 2 ? 0 : 1));

describe('SpellCatalogListComponent (grimório com filtros)', () => {
  function setup(getAll = vi.fn(() => of(SPELLS))) {
    const router = { navigate: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: SpellCatalogService, useValue: { getAll } },
        { provide: Router, useValue: router },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new SpellCatalogListComponent());
    component.ngOnInit();
    return { component, router, getAll };
  }

  it('carrega o catálogo inteiro e mostra 8 cartas por página', () => {
    const { component, getAll } = setup();
    expect(getAll).toHaveBeenCalled();
    expect(component.loading()).toBe(false);
    expect(component.visibleCards()).toHaveLength(8);
    expect(component.totalPages()).toBe(2);
    component.nextPage();
    expect(component.visibleCards().map((c) => c.spell.id_spell)).toEqual([9, 10]);
    component.nextPage();
    expect(component.page()).toBe(2);
  });

  it('filtrar volta pra primeira página', () => {
    const { component } = setup();
    component.nextPage();
    component.patchFilters({ level: 0 });
    expect(component.page()).toBe(1);
    expect(component.filteredSpells().map((s) => s.id_spell)).toEqual([1, 2]);
  });

  it('limpar filtros mantém a ordenação', () => {
    const { component } = setup();
    component.patchFilters({ level: 0, sort: 'name', school: 'Evocação' });
    component.clearFilters();
    expect(component.filters().level).toBeNull();
    expect(component.filters().school).toBe('');
    expect(component.filters().sort).toBe('name');
  });

  it('erro ao carregar', () => {
    const { component } = setup(vi.fn(() => throwError(() => new Error('x'))));
    expect(component.error()).toBe(true);
    expect(component.loading()).toBe(false);
  });

  it('abre e fecha a carta em tela cheia', () => {
    const { component } = setup();
    component.openDetail(SPELLS[0]);
    expect(component.selectedSpell()).toBe(SPELLS[0]);
    component.closeDetail();
    expect(component.selectedSpell()).toBeNull();
  });
});
