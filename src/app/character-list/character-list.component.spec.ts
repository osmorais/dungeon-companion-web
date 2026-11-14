import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { CharacterService } from '../services/character.service';
import { CharacterListComponent } from './character-list.component';

describe('CharacterListComponent (Meus personagens)', () => {
  function create(count: number, total: number) {
    const list = Array.from({ length: count }, (_, i) => ({
      id_character: i + 1,
      name: `P${i + 1}`,
      level: 1,
      race: 'Humano',
      class: 'Guerreiro',
    }));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: CharacterService,
          useValue: {
            getCharacters: vi.fn(() => of({ CharacterPagedList: list, total_count: total })),
            getCharacterById: () => of(null),
            getCharacterOptions: () => of({}),
            cachedOptions: signal(null),
          },
        },
      ],
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const cmp = TestBed.runInInjectionContext(() => new CharacterListComponent());
    cmp.ngOnInit();
    return cmp;
  }

  it('rodapé mostra a faixa da página', () => {
    const cmp = create(10, 17);
    expect([cmp.rangeStart(), cmp.rangeEnd(), cmp.totalPages()]).toEqual([1, 10, 2]);
  });

  it('sem personagens: faixa zerada', () => {
    const cmp = create(0, 0);
    expect([cmp.rangeStart(), cmp.rangeEnd()]).toEqual([0, 0]);
  });

  it('+ CRIAR PERSONAGEM abre o wizard e trava o botão', () => {
    const cmp = create(1, 1);
    cmp.createCharacter();
    expect(cmp.openingCreate()).toBe(true);
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/create']);
  });
});
