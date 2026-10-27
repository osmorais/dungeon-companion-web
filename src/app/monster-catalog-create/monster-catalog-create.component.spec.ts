import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MonsterCatalogCreateComponent } from './monster-catalog-create.component';
import { MonsterCatalogService } from '../services/monster-catalog.service';
import { BestiaryMonsterSummary } from '../models/monster-catalog.interface';

const summary = (m: Partial<BestiaryMonsterSummary>): BestiaryMonsterSummary => ({
  index: 'x',
  name: 'X',
  challenge_rating: 1,
  size: 'Médio',
  type: 'humanoide',
  alignment: 'neutro',
  hp_max: 13,
  ac: 12,
  legendary: false,
  flies: false,
  ...m,
});

const BESTIARY: BestiaryMonsterSummary[] = [
  summary({ index: 'aarakocra', name: 'Aarakocra', challenge_rating: 0.25, flies: true }),
  summary({
    index: 'dragao-vermelho-anciao',
    name: 'Dragão Vermelho Ancião',
    challenge_rating: 24,
    size: 'Imenso',
    type: 'dragão',
    legendary: true,
  }),
];

describe('MonsterCatalogCreateComponent (bestiário)', () => {
  beforeEach(() => vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined));
  afterEach(() => vi.restoreAllMocks());

  function setup(list: BestiaryMonsterSummary[] = BESTIARY) {
    const service = {
      listBestiary: vi.fn(() => of(list)),
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

  it('carrega o bestiário em cartas, com o ND no medalhão e o brilho de ameaça', () => {
    const { component, service } = setup();
    expect(service.listBestiary).toHaveBeenCalled();
    const cards = component.visibleCards();
    expect(cards.map((c) => c.monster.index)).toEqual(['aarakocra', 'dragao-vermelho-anciao']);
    expect(cards[0].card).toMatchObject({ title: 'Aarakocra', badge: '1/4', variant: 'monster' });
    expect(cards[0].card.text).toBe('Médio humanoide, neutro.\nCA 12 · PV 13 · ND 1/4.');
    expect(cards.map((c) => c.state)).toEqual([null, 'threat']);
  });

  it('filtros: busca sem acento, faixa de ND, lendários; LIMPAR mantém a ordenação', () => {
    const { component } = setup();
    component.patchFilters({ search: 'dragao' });
    expect(component.filteredMonsters().map((m) => m.index)).toEqual(['dragao-vermelho-anciao']);
    component.patchFilters({ search: '', sort: 'cr' });
    component.patchFilters({ crMin: 0, crMax: 1 });
    expect(component.filteredMonsters().map((m) => m.index)).toEqual(['aarakocra']);
    component.patchFilters({ crMin: null, crMax: null, legendary: true });
    expect(component.filteredMonsters().map((m) => m.index)).toEqual(['dragao-vermelho-anciao']);
    component.clearFilters();
    expect(component.filters()).toMatchObject({ legendary: false, search: '', sort: 'cr' });
    expect(component.filteredMonsters().length).toBe(2);
  });

  it('8 cartas por página; mudar um filtro volta pra primeira', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      summary({ index: `m${i}`, name: `Monstro ${i}` }),
    );
    const { component } = setup(many);
    expect(component.totalPages()).toBe(3);
    expect(component.visibleCards().map((c) => c.monster.index)).toEqual(
      many.slice(0, 8).map((m) => m.index),
    );
    component.prevPage();
    expect(component.page()).toBe(1);
    component.nextPage();
    component.nextPage();
    expect(component.visibleCards().map((c) => c.monster.index)).toEqual([
      'm16',
      'm17',
      'm18',
      'm19',
    ]);
    component.nextPage();
    expect(component.page()).toBe(3);
    component.patchFilters({ type: 'humanoide' });
    expect(component.page()).toBe(1);
  });

  it('abrir a carta busca a ficha; o nome customizado já aparece na carta; catalogar manda o slug', () => {
    const { component, service, router } = setup();
    component.selectMonster(BESTIARY[0]);
    expect(service.getBestiaryMonster).toHaveBeenCalledWith('aarakocra');
    expect(component.selectedDetail()?.name).toBe('Aarakocra');
    component.customName.set('  Pena Rubra ');
    expect(component.previewCard()?.title).toBe('Pena Rubra');
    component.confirmCatalog();
    expect(service.catalogMonster).toHaveBeenCalledWith('aarakocra', 'Pena Rubra');
    expect(router.navigate).toHaveBeenCalledWith(['/monster-catalog']);
  });

  it('voltar com a carta aberta fecha a ficha e mantém os filtros; sem carta, sai da tela', () => {
    const { component, router } = setup();
    component.patchFilters({ flies: true });
    component.selectMonster(BESTIARY[0]);
    component.goBack();
    expect(component.selected()).toBeNull();
    expect(component.filters().flies).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
    component.goBack();
    expect(router.navigate).toHaveBeenCalledWith(['/monster-catalog']);
  });

  it('erro ao catalogar mostra a mensagem e libera o botão', () => {
    const { component, service } = setup();
    service.catalogMonster.mockReturnValue(throwError(() => new Error('x')));
    component.selectMonster(BESTIARY[0]);
    component.confirmCatalog();
    expect(component.cataloging()).toBe(false);
    expect(component.catalogError()).toContain('Não foi possível catalogar');
  });
});
