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
    expect(prompt.rollConfig()).toEqual({
      mode: 'ability',
      rollType: 'skill',
      label: 'Teste secreto: Percepção',
      modifier: 5,
    });
  });

  it('erro ao carregar a ficha', () => {
    const prompt = create(vi.fn(() => throwError(() => new Error('x'))));
    expect(prompt.error()).toBe(true);
    expect(prompt.loading()).toBe(false);
  });
});
