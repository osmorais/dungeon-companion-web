import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PlayerActionsModalComponent, isLongCastingTime } from './player-actions-modal.component';
import { CharacterService } from '../services/character.service';
import { GameSessionService } from '../services/game-session.service';
import {
  CharacterSheetResponse,
  ClassAbility,
  CombatFeatures,
} from '../models/character-response.interface';
import { Spell, SpellRoll, WeaponRow } from '../models/character-options.interface';

function roll(extra: Partial<SpellRoll>): SpellRoll {
  return {
    kind: 'heal',
    attack_type: null,
    attack_bonus: null,
    damage_type: null,
    save_ability: null,
    save_dc: null,
    save_on_success: null,
    heal: 'hp',
    maximize: false,
    rider_trigger: null,
    rider_attack: null,
    instance_label: null,
    variant: null,
    by_slot: {},
    ...extra,
  };
}

function ability(name: string, extra: Partial<ClassAbility> = {}): ClassAbility {
  return { name, description: '', cost: 1, resource_key: 'R', roll: null, ...extra };
}

/** "USAR" das habilidades de classe na tela de ações da sessão (fase 1 dos traços mecânicos). */
describe('PlayerActionsModalComponent — habilidades', () => {
  let charService: {
    getCharacterById: ReturnType<typeof vi.fn>;
    updateResourceUses: ReturnType<typeof vi.fn>;
    updateSpellSlots: ReturnType<typeof vi.fn>;
  };
  let announce: ReturnType<typeof vi.fn>;
  let modal: PlayerActionsModalComponent;
  let closed: ReturnType<typeof vi.fn>;

  const sheet = (abilities: ClassAbility[], slotsExpended: Record<string, number> = {}) =>
    ({
      character_sheet: {
        header: { name: 'Thorin' },
        class_abilities: abilities,
        resource_trackers: [{ name: 'R', max: 10, used: 0, recharge_on: 'long_rest' }],
        spellcasting_info: {
          slots_total: { level_1: 4, level_2: 3 },
          slots_expended: slotsExpended,
        },
        spells: [],
        skills: [],
      },
    }) as unknown as CharacterSheetResponse;

  function create(abilities: ClassAbility[], slotsExpended: Record<string, number> = {}) {
    charService = {
      getCharacterById: vi.fn(() => of(sheet(abilities, slotsExpended))),
      updateResourceUses: vi.fn(() =>
        of({ resource_trackers: [{ name: 'R', max: 10, used: 1, recharge_on: 'long_rest' }] }),
      ),
      updateSpellSlots: vi.fn(() => of({ slots_expended: {} })),
    };
    announce = vi.fn(() => of(undefined));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: CharacterService, useValue: charService },
        {
          provide: GameSessionService,
          useValue: {
            announceSpellCast: announce,
            publishSpellCastStage: vi.fn(() => of(undefined)),
          },
        },
      ],
    });
    modal = TestBed.runInInjectionContext(() => new PlayerActionsModalComponent());
    modal.idCharacter = 7;
    modal.sessionId = 'gs';
    modal.ngOnInit();
    closed = vi.fn();
    modal.closed.subscribe(closed);
  }

  it('habilidade com rolagem: gasta, anuncia "USOU" e abre a cura', () => {
    const second = ability('Retomar o Fôlego', {
      roll: roll({
        by_slot: {
          '0': { instances: 1, dice_count: 1, dice_sides: 10, modifier: 3, extra_dice: [] },
        },
      }),
    });
    create([second]);
    modal.useClassAbility(second);
    expect(charService.updateResourceUses).toHaveBeenCalledWith(7, 'R', 1);
    expect(announce.mock.calls[0][1]).toMatchObject({
      spell_name: 'Retomar o Fôlego',
      is_ability: true,
    });
    expect(modal.activeRoll()).toMatchObject({
      healing: { tempHp: false },
      damage: { diceCount: 1, diceSides: 10, modifier: 3, label: 'Cura: Retomar o Fôlego' },
    });
    expect(closed).not.toHaveBeenCalled();
  });

  describe('magia de conjuração longa em combate', () => {
    const prayer = {
      id_spell: 245,
      name: 'Oração Curativa',
      description: '',
      casting_time: '10 minutos',
      range_distance: 9,
      duration: 'Instantânea',
      is_verbal: true,
      is_somatic: false,
      is_material: false,
      spellLevel: 2,
      school: null,
    } as unknown as Spell;

    afterEach(() => vi.restoreAllMocks());

    it('reconhece 1 minuto ou mais; ação, ação bônus e reação não', () => {
      for (const t of ['1 minuto', '10 minutos', '1 hora', '8 horas']) {
        expect(isLongCastingTime(t), t).toBe(true);
      }
      for (const t of ['1 ação', '1 ação bônus', '1 reação', null, undefined]) {
        expect(isLongCastingTime(t), String(t)).toBe(false);
      }
    });

    it('em combate pede confirmação; cancelar não gasta o espaço', () => {
      create([]);
      modal.inCombat = true;
      expect(modal.isLongCastInCombat(prayer)).toBe(true);
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      modal.castSpell(prayer, 2);
      expect(confirmSpy.mock.calls[0][0]).toMatch(/Oração Curativa leva 10 minutos/);
      expect(charService.updateSpellSlots).not.toHaveBeenCalled();
      confirmSpy.mockReturnValue(true);
      modal.castSpell(prayer, 2);
      expect(charService.updateSpellSlots).toHaveBeenCalled();
    });

    it('fora de combate lança sem perguntar', () => {
      create([]);
      const confirmSpy = vi.spyOn(window, 'confirm');
      expect(modal.isLongCastInCombat(prayer)).toBe(false);
      modal.castSpell(prayer, 2);
      expect(confirmSpy).not.toHaveBeenCalled();
      expect(charService.updateSpellSlots).toHaveBeenCalled();
    });
  });

  it('habilidade só com CD: anuncia com a CD e fecha', () => {
    const stun = ability('Ataque Atordoante', {
      roll: roll({ kind: 'save', heal: null, save_ability: 'CON', save_dc: 14 }),
    });
    create([stun]);
    modal.useClassAbility(stun);
    expect(announce.mock.calls[0][1]).toMatchObject({
      save_dc: 14,
      save_ability: 'CON',
      is_ability: true,
    });
    expect(modal.activeRoll()).toBeNull();
    expect(closed).toHaveBeenCalled();
  });

  it('Criar Espaço de Magia: só com espaço gasto daquele círculo, e devolve o espaço', () => {
    const create2 = ability('Criar Espaço de Magia (2º círculo)', { cost: 3, restores_slot: 2 });
    create([create2]);
    expect(modal.canUseClassAbility(create2)).toBe(false);

    create([create2], { level_2: 1 });
    expect(modal.canUseClassAbility(create2)).toBe(true);
    modal.useClassAbility(create2);
    expect(charService.updateSpellSlots).toHaveBeenCalledWith(7, 2, -1);
  });

  it('Curar pelo Toque: pede a quantidade, gasta N e cura N', () => {
    const lay = ability('Curar pelo Toque (1 PV)', { variable_cost: true, roll: roll({}) });
    create([lay]);
    modal.useClassAbility(lay);
    expect(modal.variableAbility()).toBe(lay);
    expect(charService.updateResourceUses).not.toHaveBeenCalled();

    modal.useClassAbility(lay, 6);
    expect(charService.updateResourceUses).toHaveBeenCalledWith(7, 'R', 6);
    expect(modal.activeRoll()).toMatchObject({
      damage: { diceCount: 0, modifier: 6, label: 'Cura: Curar pelo Toque' },
    });
  });

  it('sem mecânica: só gasta, anuncia e fecha (como antes)', () => {
    const surge = ability('Surto de Ação');
    create([surge]);
    modal.useClassAbility(surge);
    expect(announce).toHaveBeenCalled();
    expect(closed).toHaveBeenCalled();
  });
});

/** Traços no ataque com arma (fase 2): efeitos ativos, somas por turno, ataque poderoso, desarmado. */
describe('PlayerActionsModalComponent — traços no ataque', () => {
  let updateActiveEffects: ReturnType<typeof vi.fn>;
  let modal: PlayerActionsModalComponent;

  const features = (extra: Partial<CombatFeatures> = {}): CombatFeatures => ({
    crit_min: 20,
    melee_crit_extra_dice: 0,
    riders: [],
    attack_bonuses: [],
    power_attack: [],
    unarmed: null,
    active_effects: { active: [], turn_uses: {} },
    halfling_lucky: false,
    ...extra,
  });

  const weapon = (name: string, properties: string | null, isRanged = false) =>
    ({
      id_weapon: 1,
      name,
      attack_bonus: 5,
      damage_modifier: 3,
      damage_die: '1d8',
      damage_type: 'cortante',
      properties,
      weight: 1,
      price_value: 1,
      isRanged,
    }) as WeaponRow;

  function create(
    combat: CombatFeatures,
    abilities: ClassAbility[] = [],
    turnKey: string | null = null,
  ) {
    updateActiveEffects = vi.fn(() => of({ active_effects: { active: ['Fúria'], turn_uses: {} } }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CharacterService,
          useValue: {
            getCharacterById: vi.fn(() =>
              of({
                character_sheet: {
                  header: { name: 'Krusk' },
                  class_abilities: abilities,
                  resource_trackers: [{ name: 'R', max: 3, used: 0, recharge_on: 'long_rest' }],
                  attributes_and_saves: { STR: { modifier: 3 }, DEX: { modifier: 1 } },
                  spells: [],
                  skills: [],
                  combat_features: combat,
                },
              } as unknown as CharacterSheetResponse),
            ),
            updateResourceUses: vi.fn(() =>
              of({ resource_trackers: [{ name: 'R', max: 3, used: 1, recharge_on: 'long_rest' }] }),
            ),
            updateActiveEffects,
          },
        },
        {
          provide: GameSessionService,
          useValue: { announceSpellCast: vi.fn(() => of(undefined)) },
        },
      ],
    });
    modal = TestBed.runInInjectionContext(() => new PlayerActionsModalComponent());
    modal.idCharacter = 7;
    modal.sessionId = 'gs';
    modal.turnKey = turnKey;
    modal.ngOnInit();
  }

  const rage = {
    key: 'Fúria',
    name: 'Fúria',
    dice: null,
    flat: 2,
    damage_type: 'da arma',
    applies: 'melee_str' as const,
    once_per_turn: false,
    requires_active: 'Fúria',
  };
  const sneak = {
    key: 'Ataque Furtivo',
    name: 'Ataque Furtivo',
    dice: { count: 2, sides: 6 },
    flat: 0,
    damage_type: 'da arma',
    applies: 'finesse_or_ranged' as const,
    once_per_turn: true,
    requires_active: null,
  };

  it('Fúria ativa soma no dano corpo a corpo de Força (não no ataque à distância)', () => {
    create(features({ riders: [rage], active_effects: { active: ['Fúria'], turn_uses: {} } }));
    modal.rollAttack(weapon('Machado', 'Pesada'));
    expect(modal.activeRoll()).toMatchObject({
      label: 'Ataque: Machado + Fúria',
      damage: { modifier: 5, label: 'Dano: Machado + Fúria' },
    });
    modal.rollAttack(weapon('Arco', 'Munição', true));
    expect(modal.activeRoll()).toMatchObject({ damage: { modifier: 3 } });
  });

  it('Fúria inativa não soma', () => {
    create(features({ riders: [rage] }));
    modal.rollAttack(weapon('Machado', 'Pesada'));
    expect(modal.activeRoll()).toMatchObject({ damage: { modifier: 3, label: 'Dano: Machado' } });
  });

  it('Arma Sagrada ativa soma no ataque; crítico e ataque poderoso vêm dos traços', () => {
    create(
      features({
        crit_min: 19,
        melee_crit_extra_dice: 1,
        attack_bonuses: [
          { key: 'Arma Sagrada', name: 'Arma Sagrada', bonus: 3, requires_active: 'Arma Sagrada' },
        ],
        power_attack: [{ name: 'Mestre em Armas Grandes', applies: 'heavy_melee' }],
        active_effects: { active: ['Arma Sagrada'], turn_uses: {} },
      }),
    );
    modal.rollAttack(weapon('Espada Grande', 'Pesada, Duas Mãos'));
    expect(modal.activeRoll()).toMatchObject({
      modifier: 8,
      critMin: 19,
      powerAttack: { name: 'Mestre em Armas Grandes' },
      damage: { critExtraDice: 1 },
    });
    modal.rollAttack(weapon('Adaga', 'Acuidade, Leve'));
    expect(modal.activeRoll()!).not.toHaveProperty('powerAttack.name');
  });

  it('Ataque Furtivo: só acuidade/distância e some depois de usado nesta vez do combate', () => {
    create(features({ riders: [sneak] }), [], 'enc:2:p1');
    modal.rollAttack(weapon('Espada Longa', 'Versátil'));
    expect(modal.activeRoll()!.mode === 'ability' && modal.activeRoll()).toMatchObject({
      damage: { riders: { persistent: [] } },
    });
    modal.rollAttack(weapon('Rapieira', 'Acuidade'));
    expect(modal.activeRoll()).toMatchObject({
      damage: {
        riders: {
          persistent: [{ key: 'Ataque Furtivo', dice: { count: 2, sides: 6 }, oncePerTurn: true }],
        },
      },
    });

    modal.onOncePerTurnUsed(['Ataque Furtivo']);
    expect(updateActiveEffects).toHaveBeenCalledWith(7, {
      turn_use: 'Ataque Furtivo',
      turn_key: 'enc:2:p1',
    });

    create(
      features({
        riders: [sneak],
        active_effects: { active: [], turn_uses: { 'Ataque Furtivo': 'enc:2:p1' } },
      }),
      [],
      'enc:2:p1',
    );
    modal.rollAttack(weapon('Rapieira', 'Acuidade'));
    expect(modal.activeRoll()).toMatchObject({ damage: { riders: { persistent: [] } } });
  });

  it('fora de combate, 1×/turno não trava', () => {
    create(features({ riders: [sneak] }));
    modal.onOncePerTurnUsed(['Ataque Furtivo']);
    expect(updateActiveEffects).not.toHaveBeenCalled();
  });

  it('USAR Fúria liga o efeito; Encerrar desliga', () => {
    const fury = {
      name: 'Fúria',
      description: '',
      cost: 1,
      resource_key: 'R',
      roll: null,
      activates: 'Fúria',
    };
    create(features({ riders: [rage] }), [fury]);
    modal.useClassAbility(fury);
    expect(updateActiveEffects).toHaveBeenCalledWith(7, { effect: 'Fúria', active: true });
    expect(modal.activeEffects()).toEqual(['Fúria']);
    modal.endEffect('Fúria');
    expect(updateActiveEffects).toHaveBeenLastCalledWith(7, { effect: 'Fúria', active: false });
  });

  it('Monge: ataque desarmado e Rajada de Golpes (2 golpes)', () => {
    const flurry = {
      name: 'Rajada de Golpes',
      description: '',
      cost: 1,
      resource_key: 'R',
      roll: null,
      unarmed_attacks: 2,
    };
    create(
      features({
        unarmed: {
          name: 'Ataque Desarmado',
          attack_bonus: 6,
          dice: { count: 1, sides: 6 },
          damage_modifier: 4,
        },
      }),
      [flurry],
    );
    modal.rollUnarmed();
    expect(modal.activeRoll()).toMatchObject({
      label: 'Ataque: Ataque Desarmado',
      modifier: 6,
      damage: { diceCount: 1, diceSides: 6, modifier: 4 },
    });
    modal.useClassAbility(flurry);
    expect(modal.activeRoll()).toMatchObject({ instances: { count: 2, label: 'golpe' } });
  });
});

describe('PlayerActionsModalComponent — Sortudo', () => {
  it('teste leva o Sortudo do Halfling e os Pontos de Sorte; gastar debita o recurso', () => {
    const updateResourceUses = vi.fn(() =>
      of({
        resource_trackers: [{ name: 'Pontos de Sorte', max: 3, used: 2, recharge_on: 'long_rest' }],
      }),
    );
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CharacterService,
          useValue: {
            getCharacterById: vi.fn(() =>
              of({
                character_sheet: {
                  header: { name: 'Pip' },
                  class_abilities: [],
                  resource_trackers: [
                    { name: 'Pontos de Sorte', max: 3, used: 1, recharge_on: 'long_rest' },
                  ],
                  spells: [],
                  skills: [],
                  combat_features: {
                    crit_min: 20,
                    melee_crit_extra_dice: 0,
                    riders: [],
                    attack_bonuses: [],
                    power_attack: [],
                    unarmed: null,
                    active_effects: { active: [], turn_uses: {} },
                    halfling_lucky: true,
                  },
                },
              } as unknown as CharacterSheetResponse),
            ),
            updateResourceUses,
          },
        },
        {
          provide: GameSessionService,
          useValue: { announceSpellCast: vi.fn(() => of(undefined)) },
        },
      ],
    });
    const modal = TestBed.runInInjectionContext(() => new PlayerActionsModalComponent());
    modal.idCharacter = 7;
    modal.ngOnInit();
    modal.rollSave('DEX', 4);
    expect(modal.activeRoll()).toMatchObject({ halflingLucky: true, luckPoints: 2 });
    modal.onLuckUsed();
    expect(updateResourceUses).toHaveBeenCalledWith(7, 'Pontos de Sorte', 1);
  });
});

describe('PlayerActionsModalComponent — fase 4 dos traços', () => {
  function create(
    extra: {
      features?: Partial<CombatFeatures>;
      trackers?: { name: string; max: number; used: number; recharge_on: string }[];
      abilities?: ClassAbility[];
      skills?: unknown[];
    } = {},
  ) {
    const grant = vi.fn(() => of({ sides: 8, to: 'Thorin' }));
    const updateActiveEffects = vi.fn(() => of({ active_effects: { active: [], turn_uses: {} } }));
    const updateResourceUses = vi.fn(() => of({ resource_trackers: extra.trackers ?? [] }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CharacterService,
          useValue: {
            getCharacterById: vi.fn(() =>
              of({
                character_sheet: {
                  header: { name: 'Lyra' },
                  class_abilities: extra.abilities ?? [],
                  resource_trackers: extra.trackers ?? [],
                  spells: [],
                  skills: extra.skills ?? [],
                  combat_features: {
                    crit_min: 20,
                    melee_crit_extra_dice: 0,
                    riders: [],
                    attack_bonuses: [],
                    power_attack: [],
                    unarmed: null,
                    active_effects: { active: [], turn_uses: {} },
                    halfling_lucky: false,
                    d20_reminders: [],
                    ...extra.features,
                  },
                },
              } as unknown as CharacterSheetResponse),
            ),
            updateResourceUses,
            updateActiveEffects,
          },
        },
        {
          provide: GameSessionService,
          useValue: {
            announceSpellCast: vi.fn(() => of(undefined)),
            grantBardicInspiration: grant,
          },
        },
      ],
    });
    const modal = TestBed.runInInjectionContext(() => new PlayerActionsModalComponent());
    modal.idCharacter = 7;
    modal.sessionId = 'gs';
    modal.allies = [{ id_player_session: 'p2', name: 'Thorin' }];
    modal.ngOnInit();
    return { modal, grant, updateActiveEffects, updateResourceUses };
  }

  it('teste leva os lembretes do atributo e a Inspiração guardada; usar apaga o dado', () => {
    const { modal, updateActiveEffects } = create({
      features: {
        active_effects: {
          active: [],
          turn_uses: {},
          bardic_inspiration: { sides: 8, from: 'Lyra' },
        },
        d20_reminders: [
          { applies: 'save', abilities: ['DEX'], text: 'Sentido de Perigo' },
          { applies: 'save', abilities: null, text: 'Bravura' },
          { applies: 'check', abilities: ['STR'], text: 'Fúria' },
        ],
      },
    });
    modal.rollSave('DEX', 3);
    expect(modal.activeRoll()).toMatchObject({
      inspiration: { sides: 8, from: 'Lyra' },
      reminders: ['Sentido de Perigo', 'Bravura'],
    });
    modal.rollSave('WIS', 3);
    expect(modal.activeRoll()).toMatchObject({ reminders: ['Bravura'] });
    modal.rollSkill({
      id_skill: 1,
      name: 'Atletismo',
      attribute_name: 'FOR',
      total_skill_value: 5,
    } as never);
    expect(modal.activeRoll()).toMatchObject({ reminders: ['Fúria'] });
    modal.onInspirationUsed();
    expect(updateActiveEffects).toHaveBeenCalledWith(7, { consume_inspiration: true });
  });

  it('Indomável só nas resistências', () => {
    const { modal, updateResourceUses } = create({
      trackers: [{ name: 'Indomável', max: 1, used: 0, recharge_on: 'long_rest' }],
    });
    modal.rollSave('WIS', 1);
    expect(modal.activeRoll()).toMatchObject({ indomitable: 1 });
    modal.rollSkill({
      id_skill: 1,
      name: 'Atletismo',
      attribute_name: 'FOR',
      total_skill_value: 5,
    } as never);
    expect(modal.activeRoll()).toMatchObject({ indomitable: 0 });
    modal.onIndomitableUsed();
    expect(updateResourceUses).toHaveBeenCalledWith(7, 'Indomável', 1);
  });

  it('Inspiração Bárdica: pede o aliado, gasta e entrega o dado', () => {
    const inspire = {
      name: 'Inspiração Bárdica',
      description: '',
      cost: 1,
      resource_key: 'Inspiração Bárdica',
      roll: null,
      targets_ally: true,
    };
    const { modal, grant, updateResourceUses } = create({
      abilities: [inspire],
      trackers: [{ name: 'Inspiração Bárdica', max: 3, used: 0, recharge_on: 'short_rest' }],
    });
    modal.useClassAbility(inspire);
    expect(modal.allyAbility()).toBe(inspire);
    expect(updateResourceUses).not.toHaveBeenCalled();
    modal.useClassAbility(inspire, undefined, 'p2');
    expect(updateResourceUses).toHaveBeenCalledWith(7, 'Inspiração Bárdica', 1);
    expect(grant).toHaveBeenCalledWith('gs', { id_character: 7, id_player_session: 'p2' });
  });

  it('ataque com arma leva o tipo de dano (resistências do alvo)', () => {
    const { modal } = create();
    modal.rollAttack({
      id_weapon: 1,
      name: 'Machado',
      attack_bonus: 5,
      damage_modifier: 3,
      damage_die: '1d12',
      damage_type: 'Cortante',
      properties: 'Pesada',
      weight: 1,
      price_value: 1,
      isRanged: false,
    });
    expect(modal.activeRoll()).toMatchObject({ damage: { damageType: 'Cortante' } });
  });
});

describe('PlayerActionsModalComponent — grimório', () => {
  let modal: PlayerActionsModalComponent;

  const spell = (id: number, name: string, level: number, prepared = false) =>
    ({ id_spell: id, name, spellLevel: level, is_prepared: prepared }) as unknown as Spell;

  function create(prepares: boolean, maxPrepared = 3, inCombat = false) {
    const data = {
      character_sheet: {
        header: { name: 'Elora' },
        in_active_combat: inCombat,
        spellcasting_info: {
          max_prepared_spells: maxPrepared,
          prepares_spells: prepares,
          slots_total: { level_1: 2 },
          slots_expended: {},
        },
        spells: [
          spell(1, 'Raio de Fogo', 0),
          spell(2, 'Mísseis Mágicos', 1, true),
          spell(3, 'Escudo', 1),
          spell(4, 'Teia', 2),
        ],
        skills: [],
      },
    } as unknown as CharacterSheetResponse;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: CharacterService, useValue: { getCharacterById: vi.fn(() => of(data)) } },
        { provide: GameSessionService, useValue: {} },
      ],
    });
    modal = TestBed.runInInjectionContext(() => new PlayerActionsModalComponent());
    modal.idCharacter = 7;
    modal.ngOnInit();
  }

  it('abre na aba PRONTAS e volta pras ações', () => {
    create(true);
    expect(modal.view()).toBe('actions');
    modal.grimoireTab.set(2);
    modal.openGrimoire();
    expect(modal.view()).toBe('grimoire');
    expect(modal.grimoireTab()).toBe('ready');
    modal.backToActions();
    expect(modal.view()).toBe('actions');
  });

  it('quem prepara: PRONTAS = truques + preparadas; abas por círculo com a contagem', () => {
    create(true);
    expect(modal.grimoireTabs()).toEqual([
      { key: 'ready', label: 'PRONTAS', count: 2 },
      { key: 0, label: 'TRUQUES', count: 1 },
      { key: 1, label: '1º', count: 2 },
      { key: 2, label: '2º', count: 1 },
    ]);
    expect(modal.grimoireSpells().map((s) => s.name)).toEqual(['Raio de Fogo', 'Mísseis Mágicos']);
    modal.grimoireTab.set(1);
    expect(modal.grimoireSpells().map((s) => s.name)).toEqual(['Escudo', 'Mísseis Mágicos']);
  });

  it('quem não prepara: a primeira aba é TODAS', () => {
    create(false);
    expect(modal.grimoireTabs()[0]).toEqual({ key: 'ready', label: 'TODAS', count: 4 });
  });

  it('cor do card: pronta, dá pra preparar ou bloqueada', () => {
    const [cantrip, prepared, unprepared] = [0, 1, 2];
    create(true, 3);
    const spells = () => modal.sheet()!.character_sheet.spells!;
    expect(modal.spellCardState(spells()[cantrip])).toBe('ready');
    expect(modal.spellCardState(spells()[prepared])).toBe('ready');
    expect(modal.spellCardState(spells()[unprepared])).toBe('preparable');

    create(true, 1); // já tem 1 preparada: sem vaga
    expect(modal.spellCardState(spells()[unprepared])).toBe('locked');

    create(true, 3, true); // em combate: travada
    expect(modal.spellCardState(spells()[unprepared])).toBe('locked');
  });

  it('grimório abre em CARTAS e a carta em tela cheia acompanha o PREPARAR', () => {
    create(true, 3);
    expect(modal.grimoireMode()).toBe('cards');
    const escudo = modal.sheet()!.character_sheet.spells![2];
    modal.openSpellDetail(escudo);
    expect(modal.selectedSpellDetail()?.is_prepared).toBe(false);
    // Simula a ficha atualizada depois do PREPARAR (applyPreparedLocally).
    const sheet = modal.sheet()!;
    modal.sheet.set({
      ...sheet,
      character_sheet: {
        ...sheet.character_sheet,
        spells: sheet.character_sheet.spells!.map((s) =>
          s.id_spell === escudo.id_spell ? { ...s, is_prepared: true } : s,
        ),
      },
    });
    expect(modal.selectedSpellDetail()?.is_prepared).toBe(true);
    expect(modal.spellCards().get(escudo.id_spell)?.tags).toEqual(['PREPARADA']);
    modal.closeSpellDetail();
    expect(modal.selectedSpellDetail()).toBeNull();
  });
});

describe('PlayerActionsModalComponent — lançamento de magia (1.5.0)', () => {
  let publish: ReturnType<typeof vi.fn>;
  let modal: PlayerActionsModalComponent;

  const light = {
    id_spell: 3,
    name: 'Luz',
    description: '',
    casting_time: '1 ação',
    range_distance: null,
    duration: '1 hora',
    is_verbal: true,
    is_somatic: false,
    is_material: true,
    spellLevel: 0,
    school: 'Evocação',
  } as unknown as Spell;

  beforeEach(() => {
    publish = vi.fn(() => of(undefined));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CharacterService,
          useValue: {
            getCharacterById: vi.fn(() =>
              of({ character_sheet: { header: { name: 'Elora' }, spells: [light], skills: [] } }),
            ),
          },
        },
        {
          provide: GameSessionService,
          useValue: { publishSpellCastStage: publish, announceSpellCast: vi.fn() },
        },
      ],
    });
    modal = TestBed.runInInjectionContext(() => new PlayerActionsModalComponent());
    modal.idCharacter = 7;
    modal.sessionId = 'gs';
    modal.ngOnInit();
  });

  it('magia sem dados: a mesa recebe o lançamento já terminado, sem rolagens', () => {
    const closed = vi.fn();
    modal.closed.subscribe(closed);
    modal.castSpell(light, 0);
    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish.mock.calls[0][1]).toMatchObject({
      id_character: 7,
      actor_name: 'Elora',
      id_spell: 3,
      phase: 'done',
      rolls: [],
    });
    expect(closed).toHaveBeenCalled();
  });

  it('magia com rolagem: abre o modal com o palco e avisa que o lançamento é de quem lançou', () => {
    const bolt = {
      ...light,
      id_spell: 9,
      name: 'Raio de Fogo',
      roll: {
        kind: 'attack',
        attack_type: 'ranged',
        attack_bonus: 5,
        damage_type: 'Fogo',
        save_ability: null,
        save_dc: null,
        save_on_success: null,
        heal: null,
        maximize: false,
        rider_trigger: null,
        rider_attack: null,
        instance_label: null,
        variant: null,
        by_slot: {
          '0': { instances: 1, dice_count: 1, dice_sides: 10, modifier: 0, extra_dice: [] },
        },
      },
    } as unknown as Spell;
    const own = vi.fn();
    modal.ownCast.subscribe(own);
    modal.castSpell(bolt, 0);
    expect(modal.activeRoll()).not.toBeNull();
    const cast = modal.activeRollCast()!;
    expect(cast.idSpell).toBe(9);
    expect(own).toHaveBeenCalledWith(cast.castId);
    expect(publish).not.toHaveBeenCalled();
  });

  it('ATACAR na carta da arma em tela cheia fecha a carta e abre a rolagem do ataque', () => {
    const sword = {
      id_weapon: 20,
      attack_bonus: 5,
      damage_modifier: 3,
      name: 'Espada Longa',
      damage_die: '1d8',
      damage_type: 'cortante',
      properties: null,
      weight: 1.5,
      price_value: 15,
      isRanged: false,
    } as WeaponRow;
    modal.selectedWeaponCard.set(sword);
    modal.attackFromCard(sword);
    expect(modal.selectedWeaponCard()).toBeNull();
    expect(modal.activeRoll()).toMatchObject({ mode: 'ability', rollType: 'attack' });
  });

  it('ataque com arma na sessão também vira aviso da mesa (carta da arma no modal)', () => {
    const own = vi.fn();
    modal.ownCast.subscribe(own);
    const axe = {
      id_weapon: 26,
      attack_bonus: 5,
      damage_modifier: 3,
      name: 'Machado de Batalha',
      damage_die: '1d8',
      damage_type: 'cortante',
      properties: 'Versátil (1d10)',
      weight: 2,
      price_value: 10,
      isRanged: false,
    } as WeaponRow;
    modal.rollAttack(axe);
    const cast = modal.activeRollCast()!;
    expect(cast.idSpell).toBeNull();
    expect(cast.weapon).toMatchObject({
      id_weapon: 26,
      name: 'Machado de Batalha',
      attack_bonus: 5,
    });
    expect(cast.card.ribbon).toBe('MARCIAL · CORPO A CORPO');
    expect(own).toHaveBeenCalledWith(cast.castId);
  });
});
