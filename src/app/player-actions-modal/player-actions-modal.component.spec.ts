import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PlayerActionsModalComponent } from './player-actions-modal.component';
import { CharacterService } from '../services/character.service';
import { GameSessionService } from '../services/game-session.service';
import { CharacterSheetResponse, ClassAbility } from '../models/character-response.interface';
import { SpellRoll } from '../models/character-options.interface';

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
        { provide: GameSessionService, useValue: { announceSpellCast: announce } },
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
