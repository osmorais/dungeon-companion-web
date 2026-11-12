import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AbilityRollConfig, RollModalComponent } from './roll-modal.component';
import { GameSessionService } from '../services/game-session.service';
import { DamageImpactService } from '../services/damage-impact.service';
import { SessionStateService } from '../services/session-state.service';
import { GameSessionDetail, RollLogEntry } from '../models/game-session.interface';
import { d20Options, splitAdvantage } from './d20-options';
import { D20Reminder } from '../models/character-response.interface';

const POISON: D20Reminder = {
  applies: 'save',
  abilities: null,
  against: 'poison',
  text: 'Resistência Anã',
};
const GNOME: D20Reminder = {
  applies: 'save',
  abilities: ['INT', 'WIS', 'CHA'],
  against: 'magic',
  text: 'Esperteza Gnômica',
};
const RAGE: D20Reminder = { applies: 'save', abilities: ['STR'], against: null, text: 'Fúria' };

describe('splitAdvantage (vantagem condicional)', () => {
  it('contexto conhecido: a vantagem que bate entra sozinha; a que não bate some', () => {
    expect(splitAdvantage([POISON, GNOME], 'save', 'CON', ['poison', 'magic'])).toEqual({
      advantageFrom: ['Resistência Anã'],
      advantageReminders: [],
    });
    expect(splitAdvantage([POISON], 'save', 'DEX', ['magic', 'visible'])).toEqual({
      advantageFrom: [],
      advantageReminders: [],
    });
    expect(splitAdvantage([GNOME], 'save', 'WIS', ['magic']).advantageFrom).toEqual([
      'Esperteza Gnômica',
    ]);
  });

  it('sem contexto (rolagem manual): vira lembrete', () => {
    expect(splitAdvantage([POISON], 'save', 'CON', null)).toEqual({
      advantageFrom: [],
      advantageReminders: ['Resistência Anã'],
    });
  });

  it('vantagem sem contexto (Fúria) entra sempre; atributo e tipo de rolagem filtram', () => {
    expect(splitAdvantage([RAGE], 'save', 'STR', null).advantageFrom).toEqual(['Fúria']);
    expect(splitAdvantage([RAGE], 'save', 'DEX', null).advantageFrom).toEqual([]);
    expect(splitAdvantage([RAGE], 'check', 'STR', null).advantageFrom).toEqual([]);
  });

  it('API antiga (sem `against`): lembrete, como antes', () => {
    const old = { applies: 'save', abilities: null, text: 'Bravura' } as D20Reminder;
    expect(splitAdvantage([old], 'save', 'WIS', ['fear']).advantageReminders).toEqual(['Bravura']);
  });

  it('d20Options junta os recursos (Indomável só em resistência)', () => {
    const trackers = [
      { name: 'Indomável', max: 2, used: 1, recharge_on: 'long_rest' as const },
      { name: 'Pontos de Sorte', max: 3, used: 3, recharge_on: 'long_rest' as const },
    ];
    expect(d20Options(undefined, trackers, 'save', 'CON', null)).toMatchObject({
      indomitable: 1,
      luckPoints: 0,
      halflingLucky: false,
    });
    expect(d20Options(undefined, trackers, 'check', 'STR', null).indomitable).toBe(0);
  });
});

describe('RollModalComponent — vantagem condicional, Indomável e pedido de resistência', () => {
  let postRoll: ReturnType<typeof vi.fn>;
  let requestSecretRoll: ReturnType<typeof vi.fn>;
  let state: SessionStateService;

  beforeEach(() => {
    vi.useFakeTimers();
    postRoll = vi.fn(() => of({}));
    requestSecretRoll = vi.fn(() => of([{ id_player_session: 'p1', request_id: 'req-1' }]));
    TestBed.configureTestingModule({
      providers: [
        { provide: GameSessionService, useValue: { postRoll, requestSecretRoll } },
        { provide: DamageImpactService, useValue: { trigger: vi.fn() } },
      ],
    });
    state = TestBed.inject(SessionStateService);
  });

  afterEach(() => vi.useRealTimers());

  function create(config: AbilityRollConfig, extra: Partial<RollModalComponent> = {}) {
    const modal = TestBed.runInInjectionContext(() => new RollModalComponent());
    modal.config = config;
    modal.sessionId = 'gs';
    Object.assign(modal, extra);
    modal.ngOnInit();
    return modal;
  }

  const save = (extra: Partial<AbilityRollConfig> = {}): AbilityRollConfig => ({
    mode: 'ability',
    rollType: 'save',
    label: 'Resistência: Constituição',
    modifier: 2,
    ...extra,
  });

  it('com contexto, a vantagem já vem marcada e dá pra desmarcar', () => {
    const modal = create(save({ advantageFrom: ['Resistência Anã'] }));
    expect(modal.advantageState()).toBe('advantage');
    modal.toggleAutoAdvantage();
    expect(modal.advantageState()).toBe('normal');
    modal.roll();
    vi.advanceTimersByTime(1000);
    expect(postRoll.mock.calls[0][1]).toMatchObject({ advantage_state: 'normal' });
    expect(postRoll.mock.calls[0][1].rolls).toHaveLength(1);
  });

  it('vantagem automática + desvantagem: se anulam, rolagem normal com um d20', () => {
    const modal = create(save({ advantageFrom: ['Bravura'] }));
    modal.setAdvantage('disadvantage');
    expect(modal.advantagesCancel).toBe(true);
    expect(modal.advantageState()).toBe('normal');
    modal.roll();
    vi.advanceTimersByTime(1000);
    expect(postRoll.mock.calls[0][1]).toMatchObject({ advantage_state: 'normal' });
    expect(postRoll.mock.calls[0][1].rolls).toHaveLength(1);
  });

  it('sem contexto: "rolar com vantagem" rola já com 2d20', () => {
    const modal = create(save({ advantageReminders: ['Vantagem contra veneno'] }));
    expect(modal.advantageState()).toBe('normal');
    modal.rollWithAdvantage();
    vi.advanceTimersByTime(1000);
    expect(postRoll.mock.calls[0][1]).toMatchObject({ advantage_state: 'advantage' });
    expect(postRoll.mock.calls[0][1].rolls).toHaveLength(2);
  });

  describe('Indomável com a CD na API', () => {
    function rollSaveWith(outcome: 'success' | 'fail' | undefined) {
      postRoll.mockReturnValue(of(outcome === undefined ? {} : { save_outcome: outcome }));
      const modal = create(save({ indomitable: 1 }), { secretRequestId: 'req-1' });
      modal.roll();
      vi.advanceTimersByTime(1000);
      return modal;
    }

    it('passou: o botão não aparece', () => {
      expect(rollSaveWith('success').canIndomitable).toBe(false);
    });

    it('falhou: o botão aparece', () => {
      expect(rollSaveWith('fail').canIndomitable).toBe(true);
    });

    it('sem CD conhecida: continua disponível, o jogador decide', () => {
      expect(rollSaveWith(undefined).canIndomitable).toBe(true);
    });
  });

  describe('pedir resistência a quem foi atingido', () => {
    const spell = (dc: number | null): AbilityRollConfig => ({
      mode: 'ability',
      rollType: 'attack',
      label: 'Magia: Rajada de Veneno',
      modifier: 0,
      autoHit: true,
      save: {
        note: 'CD 14 de Constituição',
        onSuccess: 'none',
        ability: 'CON',
        dc,
        against: ['poison', 'magic'],
      },
      damage: { diceCount: 1, diceSides: 12, modifier: 0, label: 'Dano' },
    });
    const targets = [
      { key: 'player:p1', label: 'Thorin', allowsTempHp: true },
      { key: 'monster:m1', label: 'Goblin', allowsTempHp: false },
    ];

    it('só jogadores entram na lista, e só com CD conhecida', () => {
      expect(create(spell(14), { applyTargets: targets }).saveRequestTargets).toEqual([
        { id: 'p1', label: 'Thorin' },
      ]);
      expect(create(spell(null), { applyTargets: targets }).saveRequestTargets).toEqual([]);
    });

    it('pede a resistência pública com CD e contexto, e mostra se passou ou falhou', () => {
      const modal = create(spell(14), { applyTargets: targets });
      modal.toggleSaveTarget('p1');
      modal.requestSaves();
      expect(requestSecretRoll).toHaveBeenCalledWith('gs', {
        id_player_sessions: ['p1'],
        check: { kind: 'save', ability: 'CON' },
        label: 'Magia: Rajada de Veneno',
        dc: 14,
        against: ['poison', 'magic'],
        secret: false,
      });
      expect(modal.saveStatus('p1')).toBe('pending');
      state.detail.set({
        recent_rolls: [{ save_request_id: 'req-1', save_outcome: 'fail' } as RollLogEntry],
      } as GameSessionDetail);
      expect(modal.saveStatus('p1')).toBe('fail');
      // quem já recebeu o pedido não é marcado de novo
      modal.toggleSaveTarget('p1');
      expect(modal.saveRequestPicks().size).toBe(0);
    });

    it('erro ao pedir mostra a mensagem e deixa tentar de novo', async () => {
      const { throwError } = await import('rxjs');
      requestSecretRoll.mockReturnValue(throwError(() => new Error('x')));
      const modal = create(spell(14), { applyTargets: targets });
      modal.toggleSaveTarget('p1');
      modal.requestSaves();
      expect(modal.saveRequestError()).toMatch(/Não foi possível/);
      expect(modal.saveRequestPicks().has('p1')).toBe(true);
    });
  });
});
