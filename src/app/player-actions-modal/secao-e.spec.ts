import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PlayerActionsModalComponent } from './player-actions-modal.component';
import { AttackCounterService } from './attack-counter.service';
import { CharacterService } from '../services/character.service';
import { GameSessionService } from '../services/game-session.service';
import { CharacterSheetResponse, CombatFeatures } from '../models/character-response.interface';
import { WeaponRow } from '../models/character-options.interface';
import { RollModalComponent } from '../roll-modal/roll-modal.component';
import { DamageImpactService } from '../services/damage-impact.service';

const features = (extra: Partial<CombatFeatures> = {}): CombatFeatures => ({
  crit_min: 20,
  melee_crit_extra_dice: 0,
  riders: [],
  attack_bonuses: [],
  power_attack: [],
  unarmed: {
    name: 'Ataque Desarmado',
    attack_bonus: 5,
    damage_modifier: 3,
    dice: { count: 1, sides: 6 },
  } as CombatFeatures['unarmed'],
  active_effects: { active: [], turn_uses: {} },
  halfling_lucky: false,
  ...extra,
});

const sword = {
  id_weapon: 1,
  name: 'Espada Longa',
  attack_bonus: 6,
  damage_modifier: 3,
  damage_die: '1d8',
  damage_type: 'cortante',
  properties: 'Versátil',
  weight: 1,
  price_value: 1,
  isRanged: false,
} as WeaponRow;

describe('AttackCounterService', () => {
  it('conta por personagem e vez, e esquece a vez anterior', () => {
    const counter = new AttackCounterService();
    counter.record(7, 'c:1:p');
    counter.record(7, 'c:1:p');
    counter.record(8, 'c:1:q');
    expect(counter.used(7, 'c:1:p')).toBe(2);
    expect(counter.used(8, 'c:1:q')).toBe(1);
    counter.record(7, 'c:2:p');
    expect(counter.used(7, 'c:1:p')).toBe(0);
    expect(counter.used(7, 'c:2:p')).toBe(1);
    expect(counter.used(8, 'c:1:q')).toBe(1);
  });
});

describe('PlayerActionsModalComponent — seção E (Ataque Extra e Ação Ardilosa)', () => {
  let modal: PlayerActionsModalComponent;
  let announce: ReturnType<typeof vi.fn>;

  function create(combat: CombatFeatures, turnKey: string | null = null) {
    announce = vi.fn(() => of(undefined));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CharacterService,
          useValue: {
            getCharacterById: vi.fn(() =>
              of({
                character_sheet: {
                  header: { name: 'Vex' },
                  class_abilities: [],
                  resource_trackers: [],
                  attributes_and_saves: { STR: { modifier: 3 }, DEX: { modifier: 4 } },
                  spells: [],
                  skills: [
                    {
                      id_skill: 16,
                      name: 'Furtividade',
                      attribute_name: 'DES',
                      total_skill_value: 7,
                    },
                  ],
                  combat_features: combat,
                },
              } as unknown as CharacterSheetResponse),
            ),
          },
        },
        { provide: GameSessionService, useValue: { announceSpellCast: announce } },
      ],
    });
    modal = TestBed.runInInjectionContext(() => new PlayerActionsModalComponent());
    modal.idCharacter = 7;
    modal.sessionId = 'gs';
    modal.turnKey = turnKey;
    modal.ngOnInit();
  }

  describe('Ataque Extra', () => {
    it('sem Ataque Extra, um ataque só (sem contador)', () => {
      create(features({ attacks_per_action: 1 }));
      modal.rollAttack(sword);
      expect(modal.activeRoll()).not.toHaveProperty('instances');
    });

    it('com Ataque Extra, o ataque mostra "ataque 1 de 2"', () => {
      create(features({ attacks_per_action: 2 }));
      modal.rollAttack(sword);
      expect(modal.activeRoll()).toMatchObject({
        instances: { count: 2, label: 'ataque', start: 1 },
      });
    });

    it('no combate a conta segue pela vez: reabrir continua do ataque 2; depois recomeça', () => {
      create(features({ attacks_per_action: 2 }), 'c1:1:p7');
      modal.rollAttack(sword);
      modal.onAttackResolved(true);
      modal.rollAttack(sword);
      expect(modal.activeRoll()).toMatchObject({ instances: { start: 2 } });
      modal.onAttackResolved(false);
      // acabou a ação de Atacar: uma nova (Surto de Ação) recomeça do 1
      modal.rollAttack(sword);
      expect(modal.activeRoll()).toMatchObject({ instances: { start: 1 } });
    });

    it('fora do combate não guarda a conta', () => {
      create(features({ attacks_per_action: 3 }));
      modal.rollAttack(sword);
      modal.onAttackResolved(true);
      modal.rollAttack(sword);
      expect(modal.activeRoll()).toMatchObject({ instances: { count: 3, start: 1 } });
    });

    it('ataque desarmado do Monge entra no Ataque Extra; a Rajada de Golpes não', () => {
      create(features({ attacks_per_action: 2 }));
      modal.rollUnarmed();
      expect(modal.activeRoll()).toMatchObject({ instances: { label: 'ataque', count: 2 } });
      modal.rollUnarmed(2);
      expect(modal.activeRoll()).toMatchObject({ instances: { label: 'golpe', count: 2 } });
    });

    it('cada ataque resolvido avisa quem está acima (acertou ou errou)', () => {
      create(features({ attacks_per_action: 2 }), 'c1:1:p7');
      const resolved = vi.fn();
      modal.attackResolved.subscribe(resolved);
      modal.rollAttack(sword);
      modal.onAttackResolved(false);
      expect(resolved).toHaveBeenCalledWith(false);
    });
  });

  describe('Ação Ardilosa', () => {
    it('anuncia na mesa como habilidade usada', () => {
      create(features({ cunning_action: true }));
      modal.useCunningAction(modal.cunningOptions[1]);
      expect(announce).toHaveBeenCalledWith('gs', {
        id_character: 7,
        actor_name: 'Vex',
        spell_name: 'Ação Ardilosa: Desengajar',
        is_ability: true,
      });
      expect(modal.cunningUsed()).toBe('Desengajar');
      expect(modal.activeRoll()).toBeNull();
    });

    it('Esconder já abre o teste de Furtividade', () => {
      create(features({ cunning_action: true }));
      modal.useCunningAction(modal.cunningOptions[2]);
      expect(modal.activeRoll()).toMatchObject({
        rollType: 'skill',
        label: 'Perícia: Furtividade',
        modifier: 7,
      });
    });
  });
});

describe('RollModalComponent — começar num ataque que não o primeiro', () => {
  it('"ataque 2 de 2" e sem próximo ataque depois dele', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: GameSessionService, useValue: { postRoll: vi.fn(() => of({})) } },
        { provide: DamageImpactService, useValue: { trigger: vi.fn() } },
      ],
    });
    const roll = TestBed.runInInjectionContext(() => new RollModalComponent());
    roll.config = {
      mode: 'ability',
      rollType: 'attack',
      label: 'Ataque: Espada Longa',
      modifier: 6,
      instances: { count: 2, label: 'ataque', start: 2 },
    };
    roll.ngOnInit();
    expect(roll.instanceIndex()).toBe(2);
    expect(roll.instanceProgress).toBe('ataque 2 de 2');
  });
});
