import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MonsterCatalogDetailComponent } from './monster-catalog-detail.component';
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

describe('MonsterCatalogDetailComponent', () => {
  function setup(result: ReturnType<MonsterCatalogService['getCatalogEntry']>) {
    const service = { getCatalogEntry: vi.fn(() => result), uploadImage: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: MonsterCatalogService, useValue: service },
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'goblin-1' } } },
        },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new MonsterCatalogDetailComponent());
    component.ngOnInit();
    return { component, service };
  }

  it('monta a mesma carta da listagem (nome customizado, ND no medalhão, resumo)', () => {
    const { component } = setup(of(entry({ custom_name: 'Pena Rubra' })));
    expect(component.card()).toMatchObject({
      title: 'Pena Rubra',
      badge: '1/4',
      ribbon: 'HUMANOIDE · PEQUENO',
      text: 'Pequeno humanoide, neutro e mau.\nCA 15 · PV 7 · ND 1/4.',
      variant: 'monster',
    });
    expect(component.cardState()).toBeNull();
  });

  it('ND alto acende o brilho de ameaça na carta', () => {
    const { component } = setup(
      of(entry({ data_snapshot: { ...STAT_BLOCK, challenge_rating: 8 } })),
    );
    expect(component.cardState()).toBe('threat');
  });

  it('erro ao carregar: sem carta', () => {
    const { component } = setup(throwError(() => new Error('falhou')));
    expect(component.error()).toBe(true);
    expect(component.card()).toBeNull();
  });
});
