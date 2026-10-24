import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { MonsterCatalogCreateComponent } from './monster-catalog-create.component';
import { MonsterCatalogService } from '../services/monster-catalog.service';
import { BestiaryMonsterSummary } from '../models/monster-catalog.interface';

const BESTIARY: BestiaryMonsterSummary[] = [
  {
    index: 'aarakocra',
    name: 'Aarakocra',
    challenge_rating: 0.25,
    size: 'Médio',
    type: 'humanoide',
  },
  {
    index: 'dragao-vermelho-anciao',
    name: 'Dragão Vermelho Ancião',
    challenge_rating: 24,
    size: 'Imenso',
    type: 'dragão',
  },
];

describe('MonsterCatalogCreateComponent (bestiário)', () => {
  function setup() {
    const service = {
      listBestiary: vi.fn(() => of(BESTIARY)),
      getBestiaryMonster: vi.fn(() => of({ name: 'Aarakocra', speed: { terrestre: '6 m' } })),
      catalogMonster: vi.fn(() => of({})),
    };
    const router = { navigate: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: MonsterCatalogService, useValue: service },
        { provide: Router, useValue: router },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new MonsterCatalogCreateComponent());
    component.ngOnInit();
    return { component, service, router };
  }

  it('carrega a lista do bestiário', () => {
    const { component, service } = setup();
    expect(service.listBestiary).toHaveBeenCalled();
    expect(component.filteredMonsters().map((m) => m.index)).toEqual([
      'aarakocra',
      'dragao-vermelho-anciao',
    ]);
  });

  it('busca sem acento acha o nome com acento', () => {
    const { component } = setup();
    component.searchText.set('dragao');
    expect(component.filteredMonsters().map((m) => m.index)).toEqual(['dragao-vermelho-anciao']);
  });

  it('selecionar busca a ficha no bestiário; catalogar manda o slug e o nome customizado', () => {
    const { component, service, router } = setup();
    component.selectMonster(BESTIARY[0]);
    expect(service.getBestiaryMonster).toHaveBeenCalledWith('aarakocra');
    expect(component.selectedDetail()?.name).toBe('Aarakocra');
    component.customName.set('  Pena Rubra ');
    component.confirmCatalog();
    expect(service.catalogMonster).toHaveBeenCalledWith('aarakocra', 'Pena Rubra');
    expect(router.navigate).toHaveBeenCalledWith(['/monster-catalog']);
  });
});
