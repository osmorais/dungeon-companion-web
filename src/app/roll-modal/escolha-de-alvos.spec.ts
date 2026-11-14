import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AbilityRollConfig, RollModalComponent } from './roll-modal.component';
import { ApplyTarget } from './apply-target';
import { GameSessionService } from '../services/game-session.service';
import { DamageImpactService } from '../services/damage-impact.service';
import { SessionStateService } from '../services/session-state.service';
import { GameSessionDetail } from '../models/game-session.interface';
import { SpellCastContext } from '../spell-cast/spell-cast-context';

/** Lançamento com os alvos escolhidos no começo (1.25.0). */
describe('RollModalComponent — escolha dos alvos no começo do lançamento', () => {
  let postRoll: ReturnType<typeof vi.fn>;
  let publish: ReturnType<typeof vi.fn>;
  let requestSecretRoll: ReturnType<typeof vi.fn>;
  let attackCheck: ReturnType<typeof vi.fn>;
  let state: SessionStateService;

  const goblin: ApplyTarget = { key: 'monster:m1', label: 'Goblin', allowsTempHp: false };
  const orc: ApplyTarget = { key: 'monster:m2', label: 'Orc', allowsTempHp: false };
  const lyra: ApplyTarget = { key: 'player:p1', label: 'Lyra', allowsTempHp: true };
  const ally: ApplyTarget = { key: 'npc:n1', label: 'Guarda', allowsTempHp: false };

  const cast: SpellCastContext = {
    castId: 'cast-1',
    idSpell: 9,
    weapon: null,
    spellName: 'Magia',
    actor: { name: 'Elora', imageUrl: null, avatarPreset: null, character: null },
    card: {
      title: 'Magia',
      badge: '1',
      art: null,
      fallbackIcon: '',
      artBackground: null,
      ribbon: '',
      stats: [],
      text: null,
      tags: [],
    },
    saveDc: 14,
    saveAbility: 'DEX',
    saveNote: null,
  };

  const fireball: AbilityRollConfig = {
    mode: 'ability',
    rollType: 'attack',
    label: 'Magia: Bola de Fogo',
    modifier: 0,
    autoHit: true,
    save: { note: 'CD 14 de Destreza', onSuccess: 'half', ability: 'DEX', dc: 14 },
    damage: { diceCount: 2, diceSides: 10, modifier: 0, label: 'Dano', damageType: 'fogo' },
  };

  const fireBolt: AbilityRollConfig = {
    mode: 'ability',
    rollType: 'attack',
    label: 'Magia: Raio de Fogo',
    modifier: 5,
    damage: { diceCount: 2, diceSides: 10, modifier: 0, label: 'Dano', damageType: 'fogo' },
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // d20 → 11, d10 → 6
    let n = 0;
    postRoll = vi.fn((_gs: string, p: { rolls: number[]; modifier: number; total: number }) =>
      of({
        id_roll: `r${++n}`,
        rolls: p.rolls,
        dice_notation: '',
        modifier: p.modifier,
        total: p.total,
      }),
    );
    publish = vi.fn(() => of(undefined));
    requestSecretRoll = vi.fn(() =>
      of([
        { id_player_session: null, id_monster_session: 'm1', request_id: 'req-m1' },
        { id_player_session: 'p1', request_id: 'req-p1' },
      ]),
    );
    attackCheck = vi.fn(() => of({ hit: true }));
    TestBed.configureTestingModule({
      providers: [
        {
          provide: GameSessionService,
          useValue: { postRoll, publishSpellCastStage: publish, requestSecretRoll, attackCheck },
        },
        { provide: DamageImpactService, useValue: { trigger: vi.fn() } },
      ],
    });
    state = TestBed.inject(SessionStateService);
    state.detail.set({
      game_session: { auto_hit_check: false },
      recent_rolls: [],
    } as unknown as GameSessionDetail);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function create(config: AbilityRollConfig, targets: ApplyTarget[] = [goblin, lyra, ally]) {
    const modal = TestBed.runInInjectionContext(() => new RollModalComponent());
    modal.config = config;
    modal.sessionId = 'gs';
    modal.idCharacter = 7;
    modal.cast = cast;
    modal.applyTargets = targets;
    modal.ngOnInit();
    const applied = vi.fn();
    const rolled = vi.fn();
    modal.applyToTarget.subscribe(applied);
    modal.rolled.subscribe(rolled);
    return { modal, applied, rolled };
  }

  /** O palco vai em fila de promessas: espera elas antes de conferir o que foi enviado. */
  const flush = async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
  };
  const lastStage = () => publish.mock.calls[publish.mock.calls.length - 1][1];

  const resolve = (requestId: string, outcome: 'success' | 'fail') =>
    state.saveOutcomes.update((map) => ({ ...map, [requestId]: outcome }));

  it('abre na escolha; SEM ALVO segue o fluxo de antes', () => {
    const { modal } = create(fireball);
    expect(modal.pickingTargets()).toBe(true);
    expect(modal.attackPhase()).toBe('attack');
    modal.skipTargets();
    expect(modal.pickingTargets()).toBe(false);
    expect(modal.chosenTargets()).toBeNull();
    expect(modal.attackPhase()).toBe('damage');
    expect(modal.canApply).toBe(false); // ainda sem rolar
  });

  it('sem lançamento (rolagem comum), não pergunta o alvo', () => {
    const modal = TestBed.runInInjectionContext(() => new RollModalComponent());
    modal.config = fireball;
    modal.applyTargets = [goblin];
    modal.ngOnInit();
    expect(modal.pickingTargets()).toBe(false);
  });

  it('resistência: confirma os alvos, pede a resistência a quem rola e aplica conforme o resultado', async () => {
    const { modal, applied, rolled } = create(fireball);
    modal.togglePick('monster:m1');
    modal.togglePick('player:p1');
    modal.togglePick('npc:n1');
    modal.confirmTargets();
    expect(requestSecretRoll).toHaveBeenCalledWith(
      'gs',
      expect.objectContaining({ id_player_sessions: ['p1'], id_monster_sessions: ['m1'] }),
    );
    // O palco de todos leva os alvos e quem ainda está rolando.
    await flush();
    expect(lastStage().targets).toEqual([
      { label: 'Goblin', save: 'pending' },
      { label: 'Lyra', save: 'pending' },
      { label: 'Guarda', save: null },
    ]);

    modal.roll();
    vi.advanceTimersByTime(1000);
    expect(modal.awaitingApply()).toBe(true);
    expect(modal.targetsToApply.map((t) => t.label)).toEqual(['Goblin', 'Lyra', 'Guarda']);

    // Lyra ainda não rolou: o APLICAR avisa antes.
    resolve('req-m1', 'success');
    modal.applyChosen();
    expect(modal.confirmingPending()).toBe(true);
    expect(modal.pendingNames).toBe('Lyra');
    expect(applied).not.toHaveBeenCalled();

    modal.applyChosen(true);
    // Goblin passou (metade: 12 → 6); Guarda (NPC, sem pedido) recebe inteiro; Lyra fica de fora.
    expect(applied.mock.calls.map(([r]) => [r.targetKey, r.amount])).toEqual([
      ['monster:m1', 6],
      ['npc:n1', 12],
    ]);
    // Aplicar já encerra (saída de vitória do lançamento).
    expect(modal.castTriumph()).toBe(true);
    modal.onTriumphFinished();
    expect(rolled).toHaveBeenCalledTimes(1);
  });

  it('o carimbo vai pro palco quando a resistência chega', async () => {
    const { modal } = create(fireball);
    modal.togglePick('monster:m1');
    modal.confirmTargets();
    resolve('req-m1', 'fail');
    TestBed.tick();
    await flush();
    expect(lastStage().targets).toEqual([{ label: 'Goblin', save: 'fail' }]);
  });

  it('CONCLUIR SEM APLICAR encerra sem aplicar nada', () => {
    const { modal, applied } = create(fireball, [ally]);
    modal.togglePick('npc:n1');
    modal.confirmTargets();
    modal.roll();
    vi.advanceTimersByTime(1000);
    modal.concludeWithoutApply();
    expect(applied).not.toHaveBeenCalled();
    expect(modal.castTriumph()).toBe(true);
  });

  it('ataque com acerto automático da mesa: confere na API, rola o dano e aplica no alvo', () => {
    state.detail.update((d) => ({
      ...d!,
      game_session: { ...d!.game_session, auto_hit_check: true },
    }));
    const { modal, applied } = create(fireBolt, [goblin]);
    modal.togglePick('monster:m1');
    modal.confirmTargets();
    expect(requestSecretRoll).not.toHaveBeenCalled(); // ataque não pede resistência
    modal.roll();
    vi.advanceTimersByTime(1000);
    expect(attackCheck).toHaveBeenCalledWith('gs', {
      target_kind: 'monster',
      target_id: 'm1',
      total: 16,
      natural: 11,
    });
    vi.advanceTimersByTime(1000); // dano
    expect(modal.awaitingApply()).toBe(true);
    modal.applyChosen();
    expect(applied).toHaveBeenCalledWith(
      expect.objectContaining({ targetKey: 'monster:m1', amount: 12, damageType: 'fogo' }),
    );
  });

  it('acerto automático: errou quebra o painel, sem dano', () => {
    state.detail.update((d) => ({
      ...d!,
      game_session: { ...d!.game_session, auto_hit_check: true },
    }));
    attackCheck.mockReturnValue(of({ hit: false }));
    const { modal } = create(fireBolt, [goblin]);
    modal.togglePick('monster:m1');
    modal.confirmTargets();
    modal.roll();
    vi.advanceTimersByTime(1000);
    expect(modal.castShatter()).toBe(true);
  });

  it('sem a opção da mesa: pergunta "passou da CA?" como antes', () => {
    const { modal } = create(fireBolt, [goblin]);
    modal.togglePick('monster:m1');
    modal.confirmTargets();
    modal.roll();
    vi.advanceTimersByTime(1000);
    expect(attackCheck).not.toHaveBeenCalled();
    expect(modal.isAwaitingHitDecision).toBe(true);
    expect(modal.offersHitCheck).toBe(false);
  });

  it('vários ataques: cada um vai num alvo escolhido, na ordem', () => {
    state.detail.update((d) => ({
      ...d!,
      game_session: { ...d!.game_session, auto_hit_check: true },
    }));
    const { modal, applied } = create({ ...fireBolt, instances: { count: 2, label: 'raio' } }, [
      goblin,
      orc,
    ]);
    modal.togglePick('monster:m1');
    modal.togglePick('monster:m2');
    modal.confirmTargets();
    expect(modal.currentAttackTarget?.label).toBe('Goblin');
    modal.roll();
    vi.advanceTimersByTime(2000);
    modal.applyChosen();
    expect(modal.instanceIndex()).toBe(2);
    expect(modal.currentAttackTarget?.label).toBe('Orc');
    modal.roll();
    vi.advanceTimersByTime(2000);
    modal.applyChosen();
    expect(applied.mock.calls.map(([r]) => r.targetKey)).toEqual(['monster:m1', 'monster:m2']);
    expect(modal.castTriumph()).toBe(true);
  });
});
