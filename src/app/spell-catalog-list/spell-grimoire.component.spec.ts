import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SpellGrimoireComponent } from './spell-grimoire.component';
import { SpellCatalogService } from '../services/spell-catalog.service';
import { SpellCatalogEntry } from '../models/spell-catalog.interface';

const spell = (id: number, name: string): SpellCatalogEntry => ({
  id_spell: id,
  name,
  description: null,
  casting_time: '1 ação',
  range_distance: null,
  duration: null,
  is_verbal: true,
  is_somatic: false,
  is_material: false,
  spellLevel: 1,
  school: 'Evocação',
});

describe('SpellGrimoireComponent (grimório do mestre)', () => {
  let getCatalog: ReturnType<typeof vi.fn>;
  let grimoire: SpellGrimoireComponent;

  beforeEach(() => {
    vi.useFakeTimers();
    getCatalog = vi.fn(() =>
      of({
        SpellCatalogPagedList: [spell(1, 'Bola de Fogo')],
        page: 1,
        pageSize: 20,
        total_count: 45,
      }),
    );
    TestBed.configureTestingModule({
      providers: [{ provide: SpellCatalogService, useValue: { getCatalog } }],
    });
    grimoire = TestBed.runInInjectionContext(() => new SpellGrimoireComponent());
    grimoire.ngOnInit();
  });

  afterEach(() => {
    grimoire.ngOnDestroy();
    vi.useRealTimers();
  });

  it('carrega todas as magias do catálogo como cartas, 20 por página', () => {
    expect(getCatalog).toHaveBeenCalledWith(1, 20, null);
    expect(grimoire.cards().map((c) => c.card.title)).toEqual(['Bola de Fogo']);
    expect(grimoire.totalPages()).toBe(3);
  });

  it('busca pelo nome com espera curta e volta pra primeira página', () => {
    grimoire.goTo(2);
    grimoire.onSearch('fog');
    grimoire.onSearch('fogo ');
    expect(getCatalog).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(300);
    expect(getCatalog).toHaveBeenLastCalledWith(1, 20, 'fogo');
    expect(grimoire.page()).toBe(1);
  });

  it('paginação não passa das pontas', () => {
    grimoire.goTo(0);
    grimoire.goTo(4);
    expect(getCatalog).toHaveBeenCalledTimes(1);
    grimoire.goTo(3);
    expect(getCatalog).toHaveBeenLastCalledWith(3, 20, null);
  });

  it('Esc fecha o grimório, mas não quando fecha a carta em tela cheia', () => {
    const closed = vi.fn();
    grimoire.closed.subscribe(closed);
    grimoire.openCard(spell(1, 'Bola de Fogo'));
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
