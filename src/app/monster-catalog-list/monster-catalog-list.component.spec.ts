import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MonsterCatalogListComponent } from './monster-catalog-list.component';
import { MonsterCatalogService } from '../services/monster-catalog.service';
import { MonsterCatalogEntry, MonsterStatBlock } from '../models/monster-catalog.interface';

const STAT_BLOCK: MonsterStatBlock = {
  index: 'goblin',
  name: 'Goblin',
  size: 'Pequeno',
  type: 'humanoide',
  alignment: 'neutro e mau',
  armor_class: [{ type: 'armadura', value: 15 }],
  hit_points: 7,
  hit_dice: '2d6',
  speed: { terrestre: '9 m' },
  strength: 8,
  dexterity: 14,
  constitution: 10,
  intelligence: 10,
  wisdom: 8,
  charisma: 8,
  challenge_rating: 0.25,
  xp: 50,
};

function entry(overrides: Partial<MonsterCatalogEntry> = {}): MonsterCatalogEntry {
  return {
    id_monster_catalog: 'goblin-1',
    monster_api_slug: 'goblin',
    custom_name: null,
    hp_max: 7,
    ac: 15,
    data_snapshot: STAT_BLOCK,
    created_at: '2026-01-01T00:00:00.000Z',
    image_url: null,
    ...overrides,
  };
}

describe('MonsterCatalogListComponent', () => {
  function setup(entries: MonsterCatalogEntry[] = [entry()], totalCount = entries.length) {
    const service = {
      getCatalog: vi.fn(() =>
        of({ MonsterCatalogPagedList: entries, page: 1, pageSize: 12, total_count: totalCount }),
      ),
      deleteCatalogEntry: vi.fn(() => of(undefined)),
    };
    const router = { navigate: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: MonsterCatalogService, useValue: service },
        { provide: Router, useValue: router },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new MonsterCatalogListComponent());
    component.ngOnInit();
    return { component, service, router };
  }

  it('carrega a página e usa o nome customizado quando existe', () => {
    const { component } = setup([entry({ custom_name: 'Pena Rubra' })]);
    expect(component.monsters().length).toBe(1);
    expect(component.monsterName(component.monsters()[0])).toBe('Pena Rubra');
  });

  it('sem nome customizado, mostra o nome da ficha', () => {
    const { component } = setup();
    expect(component.monsterName(component.monsters()[0])).toBe('Goblin');
  });

  it('ND 5+ deixa a carta "pronta" (brilho dourado); abaixo disso, carta normal', () => {
    const { component } = setup([
      entry({ data_snapshot: { ...STAT_BLOCK, challenge_rating: 17 } }),
    ]);
    expect(component.cardState(component.monsters()[0])).toBe('ready');
  });

  it('ND abaixo de 5 não acende o brilho', () => {
    const { component } = setup();
    expect(component.cardState(component.monsters()[0])).toBeNull();
  });

  it('monta a carta no formato da revelação: ND no medalhão, faixa tipo·tamanho, resumo no lugar da lore', () => {
    const { component } = setup([entry({ custom_name: 'Pena Rubra' })]);
    const card = component.toCard(component.monsters()[0]);
    expect(card.title).toBe('Pena Rubra');
    expect(card.badge).toBe('1/4');
    expect(card.ribbon).toBe('HUMANOIDE · PEQUENO');
    expect(card.stats).toEqual([]);
    expect(card.text).toBe('Pequeno humanoide, neutro e mau.\nCA 15 · PV 7 · ND 1/4.');
    expect(card.variant).toBe('monster');
  });

  it('não avança além da última página nem volta antes da primeira', () => {
    const { component, service } = setup([entry()], 1);
    expect(component.hasNext()).toBe(false);
    expect(component.hasPrev()).toBe(false);
    component.nextPage();
    component.prevPage();
    expect(service.getCatalog).toHaveBeenCalledTimes(1);
  });

  it('abrir e cancelar a remoção não chama a API', () => {
    const { component, service } = setup();
    component.requestDelete(component.monsters()[0]);
    expect(component.deleteTarget()).not.toBeNull();
    component.cancelDelete();
    expect(component.deleteTarget()).toBeNull();
    expect(service.deleteCatalogEntry).not.toHaveBeenCalled();
  });

  it('confirmar a remoção chama a API e recarrega a página', () => {
    const { component, service } = setup();
    component.requestDelete(component.monsters()[0]);
    component.confirmDelete();
    expect(service.deleteCatalogEntry).toHaveBeenCalledWith('goblin-1');
    expect(component.deleteTarget()).toBeNull();
    expect(service.getCatalog).toHaveBeenCalledTimes(2);
  });

  it('erro ao remover mantém o modal aberto com a mensagem', () => {
    const service = {
      getCatalog: vi.fn(() =>
        of({ MonsterCatalogPagedList: [entry()], page: 1, pageSize: 12, total_count: 1 }),
      ),
      deleteCatalogEntry: vi.fn(() => throwError(() => new Error('falhou'))),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: MonsterCatalogService, useValue: service },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new MonsterCatalogListComponent());
    component.ngOnInit();

    component.requestDelete(component.monsters()[0]);
    component.confirmDelete();
    expect(component.deleteTarget()).not.toBeNull();
    expect(component.deleteError()).toBe('Não foi possível remover o monstro. Tente novamente.');
  });
});
