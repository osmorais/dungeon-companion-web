import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { PlayerActionsModalComponent } from './player-actions-modal.component';
import { WildShapePickerComponent, formatCr, formatSpeed } from './wild-shape-picker.component';
import { CharacterService } from '../services/character.service';
import { GameSessionService } from '../services/game-session.service';
import {
  CharacterSheetResponse,
  ClassAbility,
  CombatFeatures,
  WildShapeView,
} from '../models/character-response.interface';

const BITE = {
  name: 'Mordida',
  desc: 'Ataque Corpo-a-Corpo com Arma: +4 para atingir, alcance 1,5 m, um alvo. Acerto: 7 (2d4 + 2) de dano perfurante.',
  usage: null,
  attack: { kind: 'melee_weapon', bonus: 4, reach_m: 1.5, range_m: null, target: 'um alvo' },
  damage: [{ dice: '2d4+2', average: 7, type: 'perfurante' }],
  dc: null,
  multiattack: null,
};

const WOLF_FORM: WildShapeView = {
  slug: 'lobo',
  name: 'Lobo',
  challenge_rating: 0.25,
  hp_current: 9,
  hp_max: 11,
  armor_class: 13,
  strength: 12,
  dexterity: 15,
  constitution: 12,
  speed: 'terrestre 12 m',
  actions: [BITE],
  druid_hit_points: { current: 25, max: 30 },
  spells_blocked: true,
  hours: 2,
};

const WILD_SHAPE: ClassAbility = {
  name: 'Forma Selvagem',
  description: '',
  resource_key: 'Forma Selvagem',
  cost: 1,
};

const features = (form: WildShapeView | null): CombatFeatures =>
  ({
    crit_min: 20,
    melee_crit_extra_dice: 0,
    riders: [],
    attack_bonuses: [],
    power_attack: [],
    unarmed: null,
    active_effects: { active: [], turn_uses: {} },
    halfling_lucky: false,
    wild_shape: form,
  }) as CombatFeatures;

describe('formatCr / formatSpeed', () => {
  it('ND como o livro e deslocamento por extenso', () => {
    expect([0, 0.125, 0.25, 0.5, 1, 2].map(formatCr)).toEqual(['0', '1/8', '1/4', '1/2', '1', '2']);
    expect(formatSpeed({ terrestre: '12 m', natação: '9 m' })).toBe('terrestre 12 m, natação 9 m');
  });
});

describe('WildShapePickerComponent', () => {
  it('carrega as bestas do nível e filtra pelo nome', () => {
    const getWildShapeOptions = vi.fn(() =>
      of({
        beasts: [
          { slug: 'lobo', name: 'Lobo', challenge_rating: 0.25, hp_max: 11, ac: 13, speed: {} },
          {
            slug: 'pantera',
            name: 'Pantera',
            challenge_rating: 0.25,
            hp_max: 13,
            ac: 12,
            speed: {},
          },
        ],
      }),
    );
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: CharacterService, useValue: { getWildShapeOptions } }],
    });
    const fixture = TestBed.createComponent(WildShapePickerComponent);
    fixture.componentRef.setInput('idCharacter', 7);
    fixture.detectChanges();
    const picker = fixture.componentInstance;
    expect(getWildShapeOptions).toHaveBeenCalledWith(7);
    expect(picker.filtered().map((b) => b.slug)).toEqual(['lobo', 'pantera']);
    picker.query.set('PAN');
    expect(picker.filtered().map((b) => b.slug)).toEqual(['pantera']);
  });
});

describe('PlayerActionsModalComponent — Forma Selvagem', () => {
  let modal: PlayerActionsModalComponent;
  let charService: Record<string, ReturnType<typeof vi.fn>>;
  let announce: ReturnType<typeof vi.fn>;

  function create(form: WildShapeView | null) {
    const sheet = (f: WildShapeView | null) =>
      ({
        character_sheet: {
          header: { name: 'Elara' },
          class_abilities: [WILD_SHAPE],
          resource_trackers: [
            { name: 'Forma Selvagem', max: 2, used: 0, recharge_on: 'short_rest' },
          ],
          attributes_and_saves: {},
          spells: [],
          skills: [],
          weapons: [],
          combat_features: features(f),
        },
      }) as unknown as CharacterSheetResponse;
    charService = {
      getCharacterById: vi.fn(() => of(sheet(form))),
      startWildShape: vi.fn(() => of({ active_effects: {} })),
      endWildShape: vi.fn(() => of({ active_effects: {} })),
      updateResourceUses: vi.fn(() => of({ resource_trackers: [] })),
    };
    announce = vi.fn(() => of(undefined));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: CharacterService, useValue: charService },
        { provide: GameSessionService, useValue: { announceSpellCast: announce } },
      ],
    });
    modal = TestBed.runInInjectionContext(() => new PlayerActionsModalComponent());
    modal.idCharacter = 7;
    modal.sessionId = 'gs';
    modal.ngOnInit();
  }

  it('USAR Forma Selvagem abre a escolha da besta, sem gastar o uso', () => {
    create(null);
    modal.useClassAbility(WILD_SHAPE);
    expect(modal.wildShapePicking()).toBe(true);
    expect(charService['updateResourceUses']).not.toHaveBeenCalled();
  });

  it('transformar chama a API, recarrega a ficha e avisa a mesa', () => {
    create(null);
    modal.wildShapePicking.set(true);
    charService['getCharacterById'].mockClear();
    modal.startWildShape({
      slug: 'lobo',
      name: 'Lobo',
      challenge_rating: 0.25,
      hp_max: 11,
      ac: 13,
      speed: {},
    });
    expect(charService['startWildShape']).toHaveBeenCalledWith(7, 'lobo');
    expect(charService['getCharacterById']).toHaveBeenCalledWith(7, true, 'gs');
    expect(announce).toHaveBeenCalledWith('gs', {
      id_character: 7,
      actor_name: 'Elara',
      spell_name: 'Forma Selvagem: Lobo',
      is_ability: true,
    });
    expect(modal.wildShapePicking()).toBe(false);
  });

  it('API recusa: mostra o motivo', () => {
    create(null);
    charService['startWildShape'].mockReturnValue(
      throwError(() => ({ error: { error: { message: 'Sem usos de Forma Selvagem' } } })),
    );
    modal.startWildShape({
      slug: 'lobo',
      name: 'Lobo',
      challenge_rating: 0.25,
      hp_max: 11,
      ac: 13,
      speed: {},
    });
    expect(modal.actionError()).toBe('Sem usos de Forma Selvagem');
  });

  it('transformado: ataques da besta viram botões e abrem a rolagem com o nome da forma', () => {
    create(WOLF_FORM);
    expect(modal.wildShapeActions().map((b) => b.name)).toEqual(['Mordida']);
    modal.rollWildShapeAction(modal.wildShapeActions()[0]);
    expect(modal.activeRoll()).toMatchObject({
      rollType: 'attack',
      label: 'Lobo: Mordida',
      modifier: 4,
    });
  });

  it('transformado: USAR de novo não abre a escolha; SAIR DA FORMA chama a API', () => {
    create(WOLF_FORM);
    modal.useClassAbility(WILD_SHAPE);
    expect(modal.wildShapePicking()).toBe(false);
    modal.endWildShape();
    expect(charService['endWildShape']).toHaveBeenCalledWith(7);
  });
});
