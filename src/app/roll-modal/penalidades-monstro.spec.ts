import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AbilityRollConfig, RollModalComponent } from './roll-modal.component';
import { ApplyTarget } from './apply-target';
import { GameSessionService } from '../services/game-session.service';
import { DamageImpactService } from '../services/damage-impact.service';
import { SessionStateService } from '../services/session-state.service';
import { GameSessionDetail } from '../models/game-session.interface';
import { SpellCastContext } from '../spell-cast/spell-cast-context';

/** Penalidades de magia no monstro (1.26.0). */
describe('RollModalComponent — penalidades de magia no monstro', () => {
  let postRoll: ReturnType<typeof vi.fn>;
  let requestSecretRoll: ReturnType<typeof vi.fn>;
  let updateMonsterSpellEffect: ReturnType<typeof vi.fn>;

  const cast = (idSpell: number): SpellCastContext => ({
    castId: 'cast-1',
    idSpell,
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
    saveDc: 13,
    saveAbility: 'WIS',
    saveNote: null,
  });

  const attack: AbilityRollConfig = {
    mode: 'ability',
    rollType: 'attack',
    label: 'Ataque: Espada',
    modifier: 5,
    damage: { diceCount: 1, diceSides: 8, modifier: 3, label: 'Dano', damageType: 'cortante' },
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // d20 11, d4 3
    postRoll = vi.fn((_gs: string, p: { rolls: number[]; modifier: number; total: number }) =>
      of({
        id_roll: 'r1',
        rolls: p.rolls,
        dice_notation: '',
        modifier: p.modifier,
        total: p.total,
      }),
    );
    requestSecretRoll = vi.fn(() =>
      of([{ id_player_session: null, id_monster_session: 'm1', request_id: 'req-m1' }]),
    );
    updateMonsterSpellEffect = vi.fn(() => of({ spell_effects: {} }));
    TestBed.configureTestingModule({
      providers: [
        {
          provide: GameSessionService,
          useValue: {
            postRoll,
            publishSpellCastStage: vi.fn(() => of(undefined)),
            requestSecretRoll,
            updateMonsterSpellEffect,
            attackCheck: vi.fn(() => of({ hit: true })),
          },
        },
        { provide: DamageImpactService, useValue: { trigger: vi.fn() } },
      ],
    });
    TestBed.inject(SessionStateService).detail.set({
      game_session: { auto_hit_check: false },
      recent_rolls: [],
    } as unknown as GameSessionDetail);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function create(
    config: AbilityRollConfig,
    targets: ApplyTarget[],
    idSpell: number | null = null,
  ) {
    const modal = TestBed.runInInjectionContext(() => new RollModalComponent());
    modal.config = config;
    modal.sessionId = 'gs';
    modal.idCharacter = 7;
    modal.actorName = 'Elora';
    modal.cast = idSpell === null ? { ...cast(0), idSpell: null } : cast(idSpell);
    modal.applyTargets = targets;
    modal.ngOnInit();
    return modal;
  }

  const settle = () => vi.advanceTimersByTime(1000);
  const goblin = (spellEffects = {}): ApplyTarget => ({
    key: 'monster:m1',
    label: 'Goblin',
    allowsTempHp: false,
    spellEffects,
  });

  it('atacar monstro com Fogo das Fadas: vantagem já marcada, com o motivo', () => {
    const modal = create(attack, [goblin({ faerie_fire: { from: 'Lyra' } })]);
    modal.togglePick('monster:m1');
    modal.confirmTargets();
    expect(modal.advantageFrom).toEqual(['Vantagem (Fogo das Fadas)']);
    expect(modal.advantageState()).toBe('advantage');
  });

  it('monstro sem penalidade: rolagem normal', () => {
    const modal = create(attack, [goblin()]);
    modal.togglePick('monster:m1');
    modal.confirmTargets();
    expect(modal.advantageState()).toBe('normal');
  });

  it('Raio Guiador marcado: o ataque contra o monstro gasta a marca', () => {
    const modal = create(attack, [goblin({ guiding_bolt: { from: 'Clara' } })]);
    modal.togglePick('monster:m1');
    modal.confirmTargets();
    expect(modal.advantageState()).toBe('advantage');
    modal.roll();
    settle();
    expect(updateMonsterSpellEffect).toHaveBeenCalledWith('gs', 'm1', {
      key: 'guiding_bolt',
      active: false,
    });
  });

  it('Raio Guiador acertou um monstro: deixa a marca do próximo ataque com vantagem', () => {
    const modal = create(attack, [goblin()], 290);
    modal.togglePick('monster:m1');
    modal.confirmTargets();
    modal.roll();
    settle();
    modal.rollDamageNow();
    expect(updateMonsterSpellEffect).toHaveBeenCalledWith('gs', 'm1', {
      key: 'guiding_bolt',
      active: true,
      from: 'Elora',
    });
  });

  it('Zombaria Viciosa: o pedido de resistência leva a penalidade de quem falhar', () => {
    const mockery: AbilityRollConfig = {
      mode: 'ability',
      rollType: 'attack',
      label: 'Magia: Zombaria Viciosa',
      modifier: 0,
      autoHit: true,
      save: { note: 'CD 13 de Sabedoria', onSuccess: 'none', ability: 'WIS', dc: 13 },
      damage: { diceCount: 1, diceSides: 4, modifier: 0, label: 'Dano', damageType: 'psíquico' },
    };
    const modal = create(mockery, [goblin()], 361);
    modal.togglePick('monster:m1');
    modal.confirmTargets();
    expect(requestSecretRoll.mock.calls[0][1]).toMatchObject({
      id_monster_sessions: ['m1'],
      on_fail_effect: { key: 'vicious_mockery', from: 'Elora' },
    });
  });

  it('magia sem penalidade não manda on_fail_effect', () => {
    const fireball: AbilityRollConfig = {
      mode: 'ability',
      rollType: 'attack',
      label: 'Magia: Bola de Fogo',
      modifier: 0,
      autoHit: true,
      save: { note: 'CD 13 de Destreza', onSuccess: 'half', ability: 'DEX', dc: 13 },
      damage: { diceCount: 8, diceSides: 6, modifier: 0, label: 'Dano', damageType: 'fogo' },
    };
    const modal = create(fireball, [goblin()], 9);
    modal.togglePick('monster:m1');
    modal.confirmTargets();
    expect(requestSecretRoll.mock.calls[0][1]).not.toHaveProperty('on_fail_effect');
  });

  it('Perdição no monstro: tira 1d4 da jogada; Zombaria: desvantagem já marcada', () => {
    const modal = create(
      { ...attack, penaltyDie: { label: 'Perdição' }, disadvantageFrom: ['Zombaria Viciosa'] },
      [],
    );
    expect(modal.advantageState()).toBe('disadvantage');
    modal.roll();
    settle();
    expect(modal.penaltyRoll()).toBe(3);
    // desvantagem: dois d20 (11 e 11), vale um
    expect(modal.result()!.total).toBe(11 + 5 - 3);
    expect(postRoll.mock.calls[0][1].label).toBe('Ataque: Espada (Perdição −3)');
  });
});
