import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { secretCheckLabel, secretCheckModifier } from './secret-roll-checks';
import { SecretRollRequestModalComponent } from './secret-roll-request-modal.component';
import { SecretRollPromptComponent } from './secret-roll-prompt.component';
import { GameSessionService } from '../services/game-session.service';
import { CharacterService } from '../services/character.service';
import { CharacterSheetResponse } from '../models/character-response.interface';
import { player } from '../../testing/session-fixtures';

const sheet = {
  character_sheet: {
    header: { name: 'Lyra' },
    skills: [{ id_skill: 13, name: 'Percepção', total_skill_value: 5 }],
    attributes_and_saves: { WIS: { score: 14, modifier: 2, save: 4, save_proficiency: true } },
  },
} as unknown as CharacterSheetResponse;

describe('secret-roll-checks', () => {
  it('nome do teste', () => {
    expect(secretCheckLabel({ kind: 'skill', id_skill: 13 })).toBe('Percepção');
    expect(secretCheckLabel({ kind: 'save', ability: 'WIS' })).toBe('Resistência: Sabedoria');
  });

  it('bônus pela ficha: perícia usa o total; resistência, a salvaguarda; ausente = 0', () => {
    expect(secretCheckModifier(sheet, { kind: 'skill', id_skill: 13 })).toBe(5);
    expect(secretCheckModifier(sheet, { kind: 'save', ability: 'WIS' })).toBe(4);
    expect(secretCheckModifier(sheet, { kind: 'skill', id_skill: 1 })).toBe(0);
    expect(secretCheckModifier(sheet, { kind: 'save', ability: 'STR' })).toBe(0);
  });
});

describe('SecretRollRequestModalComponent (mestre)', () => {
  let requestSecretRoll: ReturnType<typeof vi.fn>;

  function create() {
    TestBed.configureTestingModule({
      providers: [{ provide: GameSessionService, useValue: { requestSecretRoll } }],
    });
    const modal = TestBed.runInInjectionContext(() => new SecretRollRequestModalComponent());
    modal.sessionId = 'gs';
    modal.players = [
      player('p1'),
      player('p2'),
      player('p3', { character: null }),
      player('p4', { user_id: undefined }),
    ];
    const closed = vi.fn();
    modal.closed.subscribe(closed);
    return { modal, closed };
  }

  beforeEach(() => {
    requestSecretRoll = vi.fn(() => of([]));
  });

  it('só jogadores com personagem e usuário podem receber', () => {
    const { modal } = create();
    expect(modal.eligiblePlayers.map((p) => p.id_player_session)).toEqual(['p1', 'p2']);
    modal.selectAll();
    expect([...modal.selected()]).toEqual(['p1', 'p2']);
  });

  it('pede perícia (padrão Percepção) pros escolhidos e fecha', () => {
    const { modal, closed } = create();
    modal.togglePlayer('p2');
    modal.send();
    expect(requestSecretRoll).toHaveBeenCalledWith('gs', {
      id_player_sessions: ['p2'],
      check: { kind: 'skill', id_skill: 13 },
      label: 'Percepção',
    });
    expect(closed).toHaveBeenCalled();
  });

  it('pede resistência', () => {
    const { modal } = create();
    modal.togglePlayer('p1');
    modal.setKind('save');
    modal.setAbility({ target: { value: 'DEX' } } as unknown as Event);
    modal.send();
    expect(requestSecretRoll.mock.calls[0][1]).toMatchObject({
      check: { kind: 'save', ability: 'DEX' },
      label: 'Resistência: Destreza',
    });
  });

  it('resistência com CD e contexto (a CD fica na API)', () => {
    const { modal } = create();
    modal.togglePlayer('p1');
    modal.setKind('save');
    modal.setDc({ target: { valueAsNumber: 13 } } as unknown as Event);
    modal.toggleAgainst('poison');
    modal.toggleAgainst('magic');
    modal.toggleAgainst('poison');
    modal.toggleAgainst('poison');
    modal.send();
    expect(requestSecretRoll.mock.calls[0][1]).toMatchObject({
      check: { kind: 'save' },
      dc: 13,
      against: ['poison', 'magic'],
    });
  });

  it('CD fora de 1–40 fica vazia; perícia não leva CD nem contexto', () => {
    const { modal } = create();
    modal.setDc({ target: { valueAsNumber: 0 } } as unknown as Event);
    expect(modal.dc()).toBeNull();
    modal.setDc({ target: { valueAsNumber: NaN } } as unknown as Event);
    expect(modal.dc()).toBeNull();
    modal.togglePlayer('p1');
    modal.send();
    expect(requestSecretRoll.mock.calls[0][1]).not.toHaveProperty('dc');
  });

  it('sem jogador escolhido não envia; erro mostra mensagem e não fecha', () => {
    const { modal, closed } = create();
    modal.send();
    expect(requestSecretRoll).not.toHaveBeenCalled();
    requestSecretRoll.mockReturnValue(throwError(() => new Error('x')));
    modal.togglePlayer('p1');
    modal.send();
    expect(modal.error()).toMatch(/Não foi possível/);
    expect(closed).not.toHaveBeenCalled();
  });
});

describe('SecretRollPromptComponent (jogador)', () => {
  function create(getCharacterById: ReturnType<typeof vi.fn>) {
    TestBed.configureTestingModule({
      providers: [{ provide: CharacterService, useValue: { getCharacterById } }],
    });
    const prompt = TestBed.runInInjectionContext(() => new SecretRollPromptComponent());
    prompt.request = {
      request_id: 'req-1',
      id_character: 10,
      label: 'Percepção',
      check: { kind: 'skill', id_skill: 13 },
    };
    prompt.ngOnInit();
    return prompt;
  }

  it('carrega a ficha e abre a rolagem com o bônus dela', () => {
    const getCharacterById = vi.fn(() => of(sheet));
    const prompt = create(getCharacterById);
    expect(getCharacterById).toHaveBeenCalledWith(10, true);
    expect(prompt.actorName()).toBe('Lyra');
    expect(prompt.rollConfig()).toBeNull();
    prompt.roll();
    expect(prompt.rollConfig()).toMatchObject({
      mode: 'ability',
      rollType: 'skill',
      label: 'Teste secreto: Percepção',
      modifier: 5,
      advantageFrom: [],
      indomitable: 0,
    });
  });

  it('resistência pedida contra uma magia: aplica a vantagem do contexto e oferece o Indomável', () => {
    const fighterDwarf = {
      character_sheet: {
        ...sheet.character_sheet,
        attributes_and_saves: { CON: { save: 3 } },
        resource_trackers: [{ name: 'Indomável', max: 1, used: 0, recharge_on: 'long_rest' }],
        combat_features: {
          halfling_lucky: false,
          active_effects: { active: [], turn_uses: {} },
          d20_reminders: [
            { applies: 'save', abilities: null, against: 'poison', text: 'Resistência Anã' },
          ],
        },
      },
    } as unknown as CharacterSheetResponse;
    const updateResourceUses = vi.fn(() => of({ resource_trackers: [] }));
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CharacterService,
          useValue: { getCharacterById: () => of(fighterDwarf), updateResourceUses },
        },
      ],
    });
    const prompt = TestBed.runInInjectionContext(() => new SecretRollPromptComponent());
    prompt.request = {
      request_id: 'req-2',
      id_character: 10,
      label: 'Magia: Rajada de Veneno',
      check: { kind: 'save', ability: 'CON' },
      secret: false,
      against: ['poison', 'magic', 'visible'],
    };
    prompt.ngOnInit();
    expect(prompt.isSecret).toBe(false);
    expect(prompt.againstText).toBe('veneno, magia');
    prompt.roll();
    expect(prompt.rollConfig()).toMatchObject({
      rollType: 'save',
      label: 'Resistência: Rajada de Veneno',
      modifier: 3,
      advantageFrom: ['Resistência Anã'],
      indomitable: 1,
    });
    prompt.onIndomitableUsed();
    expect(updateResourceUses).toHaveBeenCalledWith(10, 'Indomável', 1);
  });

  it('erro ao carregar a ficha', () => {
    const prompt = create(vi.fn(() => throwError(() => new Error('x'))));
    expect(prompt.error()).toBe(true);
    expect(prompt.loading()).toBe(false);
  });
});

describe('SecretRollPromptComponent (mestre, resistência de monstro — 1.24.2)', () => {
  function create(monster: unknown) {
    TestBed.resetTestingModule();
    const getCharacterById = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: CharacterService, useValue: { getCharacterById } }],
    });
    const prompt = TestBed.runInInjectionContext(() => new SecretRollPromptComponent());
    prompt.request = {
      request_id: 'req-m',
      id_character: null,
      id_monster_session: 'm1',
      monster_name: 'Goblin',
      dc: 15,
      label: 'Magia: Bola de Fogo',
      check: { kind: 'save', ability: 'DEX' },
      secret: false,
    };
    prompt.monster = monster as SecretRollPromptComponent['monster'];
    prompt.ngOnInit();
    return { prompt, getCharacterById };
  }

  it('rola com o bônus de resistência da ficha do monstro, sem buscar ficha de personagem', () => {
    const { prompt, getCharacterById } = create({
      dexterity: 14,
      saving_throws: [{ ability: 'DES', bonus: 4 }],
    });
    expect(getCharacterById).not.toHaveBeenCalled();
    expect(prompt.isMonster).toBe(true);
    expect(prompt.actorName()).toBe('Goblin');
    prompt.roll();
    expect(prompt.rollConfig()).toEqual({
      mode: 'ability',
      rollType: 'save',
      label: 'Resistência: Bola de Fogo',
      modifier: 4,
    });
  });

  it('sem resistência listada, usa o modificador do atributo', () => {
    const { prompt } = create({ dexterity: 8 });
    prompt.roll();
    expect(prompt.rollConfig()?.modifier).toBe(-1);
  });

  it('monstro que saiu da mesa: avisa em vez de rolar', () => {
    const { prompt } = create(null);
    expect(prompt.error()).toBe(true);
  });
});

describe('SecretRollPromptComponent — volta pro lançamento depois de rolar (1.25.0)', () => {
  it('fecha sozinho depois de mostrar o resultado', () => {
    vi.useFakeTimers();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: CharacterService, useValue: { getCharacterById: vi.fn() } }],
    });
    const prompt = TestBed.runInInjectionContext(() => new SecretRollPromptComponent());
    const closed = vi.fn();
    prompt.closed.subscribe(closed);
    prompt.onRolled();
    prompt.onRolled(); // só um fechamento
    vi.advanceTimersByTime(SecretRollPromptComponent.RESULT_READ_MS - 1);
    expect(closed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(closed).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
