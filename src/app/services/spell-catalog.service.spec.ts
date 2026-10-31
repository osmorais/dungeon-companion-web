import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SpellCatalogService } from './spell-catalog.service';
import { SpellCatalogEntry } from '../models/spell-catalog.interface';

const page = (ids: number[], total: number) => ({
  SpellCatalogPagedList: ids.map((id) => ({ id_spell: id }) as SpellCatalogEntry),
  page: 1,
  pageSize: 50,
  total_count: total,
});

describe('SpellCatalogService.getAll', () => {
  function setup() {
    TestBed.configureTestingModule({ providers: [SpellCatalogService] });
    return TestBed.inject(SpellCatalogService);
  }

  it('busca os lotes de 50 que faltam e junta na ordem', () => {
    const service = setup();
    const spy = vi
      .spyOn(service, 'getCatalog')
      .mockImplementation((p: number) => of(page([p * 100, p * 100 + 1], 120)));
    let result: SpellCatalogEntry[] = [];
    service.getAll().subscribe((r) => (result = r));
    expect(spy.mock.calls.map((c) => [c[0], c[1]])).toEqual([
      [1, 50],
      [2, 50],
      [3, 50],
    ]);
    expect(result.map((s) => s.id_spell)).toEqual([100, 101, 200, 201, 300, 301]);
  });

  it('um lote só: não faz outra chamada', () => {
    const service = setup();
    const spy = vi.spyOn(service, 'getCatalog').mockReturnValue(of(page([1, 2], 2)));
    let result: SpellCatalogEntry[] = [];
    service.getAll().subscribe((r) => (result = r));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(2);
  });
});
