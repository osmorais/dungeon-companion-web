import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { PlayerActionsModalComponent, companionConfig } from './player-actions-modal.component';
import { WildShapePickerComponent } from './wild-shape-picker.component';
import { CharacterService } from '../services/character.service';
import { GameSessionService } from '../services/game-session.service';
import { CharacterSheetResponse, CombatFeatures } from '../models/character-response.interface';
import { AbilityRollConfig } from '../roll-modal/roll-modal.component';
import { companion } from '../../testing/session-fixtures';

const BITE = {
  name: 'Mordida',
  desc: 'Ataque Corpo-a-Corpo com Arma: +4 para atingir, alcance 1,5 m, um alvo. Acerto: 7 (2d4 + 2) de dano perfurante.',
  usage: null,
  attack: { kind: 'melee_weapon', bonus: 4, reach_m: 1.5, range_m: null, target: 'um alvo' },
  damage: [{ dice: '2d4+2', average: 7, type: 'perfurante' }],
  dc: null,
  multiattack: null,
};

const attack: AbilityRollConfig = {
  mode: 'ability',
  rollType: 'attack',
  label: 'Mordida',
  modifier: 4,
  damage: { diceCount: 2, diceSides: 4, modifier: 2, label: 'Mordida' },
};

describe('companionConfig (proficiência do ranger nas ações da besta)', () => {
  it('soma a proficiência no ataque e no dano', () => {
    const config = companionConfig(attack, { proficiency_bonus: 3, attacks_per_command: 1 });
    expect(config.modifier).toBe(7);
    expect(config.damage!.modifier).toBe(5);
    expect(config).not.toHaveProperty('instances');
  });

  it('nível 11: dois ataques por comando', () => {
    const config = companionConfig(attack, { proficiency_bonus: 4, attacks_per_command: 2 });
    expect(config.instances).toEqual({ count: 2, label: 'ataque da besta' });
  });

  it('efeito com resistência (sem jogada de ataque): só o dano ganha a proficiência', () => {
    const save = { ...attack, modifier: 0, autoHit: true };
    const config = companionConfig(save, { proficiency_bonus: 2, attacks_per_command: 2 });
    expect(config.modifier).toBe(0);
    expect(config.damage!.modifier).toBe(4);
    expect(config).not.toHaveProperty('instances');
  });

  it('rolagem que não é ataque passa sem mudança', () => {
    const skill: AbilityRollConfig = {
      mode: 'ability',
      rollType: 'skill',
      label: 'x',
      modifier: 1,
    };
    expect(companionConfig(skill, { proficiency_bonus: 2, attacks_per_command: 1 })).toBe(skill);
  });
});

describe('WildShapePickerComponent — lista do Companheiro Animal', () => {
  it('usa o loader e os textos de fora, sem chamar a Forma Selvagem', () => {
    const getWildShapeOptions = vi.fn();
    const loader = vi.fn(() =>
      of({
        beasts: [
          { slug: 'lobo', name: 'Lobo', challenge_rating: 0.25, hp_max: 11, ac: 13, speed: {} },
        ],
      }),
    );
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: CharacterService, useValue: { getWildShapeOptions } }],
    });
    const fixture = TestBed.createComponent(WildShapePickerComponent);
    fixture.componentRef.setInput('idCharacter', 7);
    fixture.componentRef.setInput('loader', loader);
    fixture.componentRef.setInput('title', 'COMPANHEIRO ANIMAL');
    fixture.componentRef.setInput('pickLabel', 'ESCOLHER');
    fixture.detectChanges();
    expect(loader).toHaveBeenCalled();
    expect(getWildShapeOptions).not.toHaveBeenCalled();
    expect(fixture.componentInstance.filtered().map((b) => b.slug)).toEqual(['lobo']);
    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('COMPANHEIRO ANIMAL');
    expect(text).toContain('ESCOLHER');
  });
});

describe('PlayerActionsModalComponent — Companheiro Animal', () => {
  let modal: PlayerActionsModalComponent;
  let sessions: Record<string, ReturnType<typeof vi.fn>>;

  function create(animalCompanion: boolean, idPlayerSession: string | null = 'p1') {
    const sheet = {
      character_sheet: {
        header: { name: 'Vex' },
        class_abilities: [],
        resource_trackers: [],
        attributes_and_saves: {},
        spells: [],
        skills: [],
        weapons: [],
        combat_features: {
          crit_min: 20,
          melee_crit_extra_dice: 0,
          riders: [],
          attack_bonuses: [],
          power_attack: [],
          unarmed: null,
          active_effects: { active: [], turn_uses: {} },
          halfling_lucky: false,
          animal_companion: animalCompanion,
        } as unknown as CombatFeatures,
      },
    } as unknown as CharacterSheetResponse;
    sessions = {
      announceSpellCast: vi.fn(() => of(undefined)),
      getCompanionOptions: vi.fn(() => of({ allowed: true, beasts: [] })),
      chooseCompanion: vi.fn(() => of(companion('c1', 'p1'))),
      dismissCompanion: vi.fn(() => of(undefined)),
    };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: CharacterService, useValue: { getCharacterById: vi.fn(() => of(sheet)) } },
        { provide: GameSessionService, useValue: sessions },
      ],
    });
    modal = TestBed.runInInjectionContext(() => new PlayerActionsModalComponent());
    modal.idCharacter = 7;
    modal.sessionId = 'gs';
    modal.idPlayerSession = idPlayerSession;
    modal.ngOnInit();
  }

  it('a seção só aparece pro ranger com a característica, jogando numa mesa', () => {
    create(true);
    expect(modal.hasCompanionFeature()).toBe(true);
    create(false);
    expect(modal.hasCompanionFeature()).toBe(false);
    // NPC (sem jogador na mesa): não escolhe companheiro.
    create(true, null);
    expect(modal.hasCompanionFeature()).toBe(false);
  });

  it('a lista do seletor vem das opções do companheiro naquela mesa', () => {
    create(true);
    modal.companionLoader().subscribe();
    expect(sessions['getCompanionOptions']).toHaveBeenCalledWith('gs', 'p1');
  });

  it('escolher: avisa a mesa, anuncia e fecha o seletor', () => {
    create(true);
    const set = vi.fn();
    modal.companionSet.subscribe(set);
    modal.companionPicking.set(true);
    modal.chooseCompanion({
      slug: 'lobo',
      name: 'Lobo',
      challenge_rating: 0.25,
      hp_max: 11,
      ac: 13,
      speed: {},
    });
    expect(sessions['chooseCompanion']).toHaveBeenCalledWith('gs', 'p1', 'lobo');
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ id_session_companion: 'c1' }));
    expect(sessions['announceSpellCast']).toHaveBeenCalledWith('gs', {
      id_character: 7,
      actor_name: 'Vex',
      spell_name: 'Companheiro Animal: Lobo',
      is_ability: true,
    });
    expect(modal.companionPicking()).toBe(false);
  });

  it('erro ao escolher vira aviso no modal', () => {
    create(true);
    sessions['chooseCompanion'].mockReturnValue(
      throwError(() => ({ status: 422, error: { error: { message: 'Besta inválida' } } })),
    );
    modal.chooseCompanion({
      slug: 'x',
      name: 'X',
      challenge_rating: 0,
      hp_max: 1,
      ac: 10,
      speed: {},
    });
    expect(modal.actionError()).toBeTruthy();
  });

  it('dispensar avisa a mesa com null', () => {
    create(true);
    modal.companion = companion('c1', 'p1');
    const set = vi.fn();
    modal.companionSet.subscribe(set);
    modal.dismissCompanion();
    expect(sessions['dismissCompanion']).toHaveBeenCalledWith('c1');
    expect(set).toHaveBeenCalledWith(null);
  });

  it('ataques da besta com a proficiência e o nome do companheiro na rolagem', () => {
    create(true);
    modal.companion = companion('c1', 'p1', { actions: [BITE], proficiency_bonus: 2 });
    const [bite] = modal.companionActions();
    modal.rollCompanionAction(bite);
    expect(modal.activeRoll()).toMatchObject({ label: 'Lobo: Mordida', modifier: 6 });
  });
});
