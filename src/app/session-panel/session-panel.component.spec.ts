import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { SessionPanelComponent } from './session-panel.component';
import { GameSessionService } from '../services/game-session.service';
import { SessionStateService } from '../services/session-state.service';
import { CharacterService } from '../services/character.service';
import { AuthService } from '../services/auth.service';
import {
  GameSessionDetail,
  MonsterSession,
  NpcSession,
  PlayerSession,
} from '../models/game-session.interface';
import {
  combat,
  monster,
  npc,
  participant,
  player,
  roll,
  sessionDetail,
} from '../../testing/session-fixtures';
import { DamageImpactService } from '../services/damage-impact.service';
import { RollLogEntry } from '../models/game-session.interface';

/**
 * Lógica do painel de sessão sem renderizar o template: sem `id` de entrada o componente não
 * busca a sessão nem conecta no socket, então só o estado (signals) e os serviços mockados contam.
 */
describe('SessionPanelComponent', () => {
  let component: SessionPanelComponent;
  let detail: ReturnType<typeof signal<GameSessionDetail | null>>;
  let gameSessionService: {
    updatePlayerHp: ReturnType<typeof vi.fn>;
    updateNpcHp: ReturnType<typeof vi.fn>;
    updateMonsterHp: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    detail = signal<GameSessionDetail | null>(sessionDetail());
    gameSessionService = {
      updatePlayerHp: vi.fn(() => of({})),
      updateNpcHp: vi.fn(() => of({})),
      updateMonsterHp: vi.fn(() => of({})),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: GameSessionService, useValue: gameSessionService },
        {
          provide: SessionStateService,
          useValue: {
            detail,
            patch: (fn: (d: GameSessionDetail) => GameSessionDetail) =>
              detail.update((d) => (d ? fn(d) : d)),
          },
        },
        { provide: CharacterService, useValue: {} },
        { provide: AuthService, useValue: { currentUser: signal({ id: 'dm', email: 'dm@x' }) } },
      ],
    });
    component = TestBed.runInInjectionContext(() => new SessionPanelComponent());
  });

  function typeDamage(target: PlayerSession | NpcSession | MonsterSession, value: number) {
    const event = { target: { value: String(value) } } as unknown as Event;
    if ('id_npc_session' in target) component.setNpcDamageInput(target, event);
    else if ('id_player_session' in target) component.setPlayerDamageInput(target, event);
    else component.setMonsterDamageInput(target, event);
  }

  describe('PV de jogador', () => {
    const withHp = (current: number, temp: number) =>
      player('p1', {
        character: {
          ...player('p1').character!,
          current_hit_points: current,
          temporary_hit_points: temp,
        },
      });

    it('dano consome primeiro a vida temporária', () => {
      const p = withHp(15, 5);
      typeDamage(p, 8);
      component.applyPlayerDamage(p);
      expect(gameSessionService.updatePlayerHp).toHaveBeenCalledWith('p1', 12, 0);
    });

    it('dano menor que a vida temporária não toca no PV', () => {
      const p = withHp(15, 5);
      typeDamage(p, 3);
      component.applyPlayerDamage(p);
      expect(gameSessionService.updatePlayerHp).toHaveBeenCalledWith('p1', 15, 2);
    });

    it('PV não fica negativo', () => {
      const p = withHp(4, 0);
      typeDamage(p, 50);
      component.applyPlayerDamage(p);
      expect(gameSessionService.updatePlayerHp).toHaveBeenCalledWith('p1', 0, 0);
    });

    it('valor zero, negativo ou vazio não faz nada', () => {
      const p = withHp(10, 0);
      typeDamage(p, 0);
      component.applyPlayerDamage(p);
      typeDamage(p, -5);
      component.applyPlayerHeal(p);
      expect(gameSessionService.updatePlayerHp).not.toHaveBeenCalled();
    });

    it('cura até o máximo aplica direto e mantém a vida temporária', () => {
      const p = withHp(10, 3);
      typeDamage(p, 10);
      component.applyPlayerHeal(p);
      expect(gameSessionService.updatePlayerHp).toHaveBeenCalledWith('p1', 20, 3);
      expect(component.pendingTempHp()).toBeNull();
    });

    it('cura acima do máximo pede confirmação de vida temporária (não acumula)', () => {
      const p = withHp(18, 2);
      typeDamage(p, 7);
      component.applyPlayerHeal(p);
      expect(gameSessionService.updatePlayerHp).not.toHaveBeenCalled();
      expect(component.pendingTempHp()).toMatchObject({ newAmount: 5, existingAmount: 2 });

      component.confirmTempHp(true);
      expect(gameSessionService.updatePlayerHp).toHaveBeenCalledWith('p1', 20, 5);
    });

    it('recusar a vida temporária nova cura até o máximo e mantém a antiga', () => {
      const p = withHp(18, 2);
      typeDamage(p, 7);
      component.applyPlayerHeal(p);
      component.declineTempHp();
      expect(gameSessionService.updatePlayerHp).toHaveBeenCalledWith('p1', 20, 2);
    });

    it('depois de salvar, o estado da sessão é atualizado', () => {
      const p = withHp(15, 0);
      detail.set(sessionDetail({ players: [p] }));
      typeDamage(p, 5);
      component.applyPlayerDamage(p);
      expect(detail()!.players[0].character).toMatchObject({
        current_hit_points: 10,
        temporary_hit_points: 0,
      });
    });
  });

  describe('PV de NPC e monstro (limitados entre 0 e o máximo)', () => {
    it('NPC', () => {
      const n = npc('n1', { character: { ...player('n1').character!, current_hit_points: 5 } });
      typeDamage(n, 9);
      component.applyNpcDamage(n);
      expect(gameSessionService.updateNpcHp).toHaveBeenLastCalledWith('n1', 0);
      typeDamage(n, 100);
      component.applyNpcHeal(n);
      expect(gameSessionService.updateNpcHp).toHaveBeenLastCalledWith('n1', 20);
    });

    it('monstro', () => {
      const m = monster('m1', { hp_current: 3, hp_max: 30 });
      typeDamage(m, 10);
      component.applyMonsterHeal(m);
      expect(gameSessionService.updateMonsterHp).toHaveBeenLastCalledWith('m1', 13);
      typeDamage(m, 99);
      component.applyMonsterDamage(m);
      expect(gameSessionService.updateMonsterHp).toHaveBeenLastCalledWith('m1', 0);
    });
  });

  describe('monstro em destaque no combate', () => {
    const revealed = [
      { id_monster_session: 'm1', name: 'Goblin', image_url: null },
      { id_monster_session: 'm2', name: 'Orc', image_url: null },
    ];
    const order = (current: string) =>
      combat([
        participant('pm2', {
          participant_type: 'monster',
          id_monster_session: 'm2',
          is_current_turn: current === 'pm2',
        }),
        participant('pp', {
          participant_type: 'player',
          id_player_session: 'p1',
          is_current_turn: current === 'pp',
        }),
        participant('pm1', {
          participant_type: 'monster',
          id_monster_session: 'm1',
          is_current_turn: current === 'pm1',
        }),
      ]);

    it('sem revelados não mostra nada; sem combate mostra o primeiro revelado', () => {
      expect(component.spotlightMonster()).toBeNull();
      detail.set(sessionDetail({ revealed_monsters: revealed }));
      expect(component.spotlightMonster()!.id_monster_session).toBe('m1');
    });

    it('por padrão mostra o monstro de melhor iniciativa', () => {
      detail.set(sessionDetail({ revealed_monsters: revealed, combat: order('pp') }));
      expect(component.spotlightMonster()!.id_monster_session).toBe('m2');
    });

    it('troca pro monstro da vez e mantém durante o turno de jogador', () => {
      detail.set(sessionDetail({ revealed_monsters: revealed, combat: order('pm1') }));
      TestBed.tick();
      expect(component.spotlightMonster()!.id_monster_session).toBe('m1');

      detail.set(sessionDetail({ revealed_monsters: revealed, combat: order('pp') }));
      TestBed.tick();
      expect(component.spotlightMonster()!.id_monster_session).toBe('m1');

      detail.set(sessionDetail({ revealed_monsters: revealed, combat: order('pm2') }));
      TestBed.tick();
      expect(component.spotlightMonster()!.id_monster_session).toBe('m2');
    });

    it('turno atual só existe com combate ativo', () => {
      detail.set(sessionDetail({ combat: order('pp') }));
      expect(component.currentTurnParticipant()!.id_combat_participant).toBe('pp');
      detail.set(
        sessionDetail({
          combat: {
            ...order('pp'),
            encounter: { ...order('pp').encounter, status: 'rolling_initiative' },
          },
        }),
      );
      expect(component.currentTurnParticipant()).toBeNull();
    });
  });

  describe('impacto de dano junto com o toast de rolagem', () => {
    let trigger: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      trigger = vi.spyOn(TestBed.inject(DamageImpactService), 'trigger');
      // Primeira carga: rolagens existentes só viram "vistas", sem toast nem impacto.
      detail.set(sessionDetail({ recent_rolls: [roll('antiga')] }));
      TestBed.tick();
    });

    afterEach(() => component.ngOnDestroy());

    function arrive(...rolls: RollLogEntry[]) {
      detail.set(sessionDetail({ recent_rolls: [...rolls, roll('antiga')] }));
      TestBed.tick();
    }

    const damage = (
      id: string,
      total: number,
      overrides: Partial<RollLogEntry> = {},
    ): RollLogEntry => ({
      ...roll(id),
      roll_type: 'damage',
      dice_notation: '2d6',
      modifier: 2,
      total,
      ...overrides,
    });

    it('rolagem antiga (primeira carga) não dispara', () => {
      expect(trigger).not.toHaveBeenCalled();
    });

    it('dano de outro jogador dispara junto com o toast', () => {
      arrive(damage('d1', 14));
      expect(component.activeRollToast()?.id_roll).toBe('d1');
      expect(trigger).toHaveBeenCalledTimes(1);
      expect(trigger.mock.calls[0][0]).toMatchObject({
        dice_notation: '2d6',
        modifier: 2,
        total: 14,
      });
    });

    it('ataque, perícia e dados livres não disparam', () => {
      arrive(
        { ...roll('a'), roll_type: 'attack' },
        { ...roll('b'), roll_type: 'skill' },
        { ...roll('c'), roll_type: 'dice' },
      );
      expect(trigger).not.toHaveBeenCalled();
    });

    it('cura de magia de outro jogador também dispara (névoa), com tipo e rótulo da rolagem', () => {
      arrive({ ...damage('h1', 9), roll_type: 'heal', label: 'Cura: Curar Ferimentos' });
      expect(trigger).toHaveBeenCalledTimes(1);
      expect(trigger.mock.calls[0][0]).toMatchObject({
        roll_type: 'heal',
        label: 'Cura: Curar Ferimentos',
        total: 9,
      });
    });

    it('vários danos seguidos: cada um dispara quando o seu toast aparece', () => {
      arrive(
        damage('d1', 5, { created_at: '2026-01-01T00:00:01Z' }),
        damage('d2', 9, { created_at: '2026-01-01T00:00:02Z' }),
      );
      expect(trigger).toHaveBeenCalledTimes(1);
      component.closeRollToast();
      expect(trigger).toHaveBeenCalledTimes(2);
      expect(trigger.mock.calls[1][0].total).toBe(9);
    });
  });

  describe('aplicar resultado de rolagem no alvo (opcional)', () => {
    const p1 = player('p1', {
      id_character: 10,
      user_id: 'dm',
      character: { ...player('p1').character!, current_hit_points: 15, temporary_hit_points: 4 },
    });
    const p2 = player('p2', { id_character: 20 });
    const n1 = npc('n1', { id_character: 30 });
    const m1 = monster('m1', { hp_current: 7, hp_max: 7 });

    it('mestre: todos os jogadores, NPCs e monstros; só jogador aceita PV temporários', () => {
      detail.set(sessionDetail({ players: [p1, p2], npcs: [n1], monsters: [m1] }));
      expect(component.applyTargetsFor(10)).toEqual([
        { key: 'player:p1', label: 'Personagem p1', allowsTempHp: true },
        { key: 'player:p2', label: 'Personagem p2', allowsTempHp: true },
        { key: 'npc:n1', label: 'Personagem n1', allowsTempHp: false },
        { key: 'monster:m1', label: 'Goblin', allowsTempHp: false },
      ]);
    });

    it('jogador: só o próprio personagem (regra de PV atual)', () => {
      detail.set(
        sessionDetail({
          game_session: { ...sessionDetail().game_session, user_id: 'outro-mestre' },
          players: [p1, p2],
          npcs: [n1],
          monsters: [m1],
        }),
      );
      expect(component.applyTargetsFor(10).map((t) => t.key)).toEqual(['player:p1']);
      // a ação aberta é de outro personagem: nada a aplicar
      expect(component.applyTargetsFor(20)).toEqual([]);
    });

    it('dano no jogador consome a vida temporária primeiro', () => {
      detail.set(sessionDetail({ players: [p1] }));
      component.applyRollToTarget({ targetKey: 'player:p1', amount: 10, kind: 'damage' });
      expect(gameSessionService.updatePlayerHp).toHaveBeenCalledWith('p1', 9, 0);
    });

    it('cura de magia no jogador vai só até o máximo, sem virar PV temporário', () => {
      detail.set(sessionDetail({ players: [p1] }));
      component.applyRollToTarget({ targetKey: 'player:p1', amount: 50, kind: 'heal' });
      expect(gameSessionService.updatePlayerHp).toHaveBeenCalledWith('p1', 20, 4);
      expect(component.pendingTempHp()).toBeNull();
    });

    it('PV temporários não acumulam: fica o maior', () => {
      detail.set(sessionDetail({ players: [p1] }));
      component.applyRollToTarget({ targetKey: 'player:p1', amount: 2, kind: 'temp_hp' });
      expect(gameSessionService.updatePlayerHp).toHaveBeenLastCalledWith('p1', 15, 4);
      component.applyRollToTarget({ targetKey: 'player:p1', amount: 9, kind: 'temp_hp' });
      expect(gameSessionService.updatePlayerHp).toHaveBeenLastCalledWith('p1', 15, 9);
    });

    it('NPC e monstro: dano e cura limitados entre 0 e o máximo', () => {
      detail.set(sessionDetail({ npcs: [n1], monsters: [m1] }));
      component.applyRollToTarget({ targetKey: 'monster:m1', amount: 30, kind: 'damage' });
      expect(gameSessionService.updateMonsterHp).toHaveBeenCalledWith('m1', 0);
      component.applyRollToTarget({ targetKey: 'npc:n1', amount: 5, kind: 'heal' });
      expect(gameSessionService.updateNpcHp).toHaveBeenCalledWith('n1', 20);
    });

    it('alvo inexistente ou valor zero não faz nada', () => {
      detail.set(sessionDetail({ players: [p1] }));
      component.applyRollToTarget({ targetKey: 'player:xx', amount: 5, kind: 'damage' });
      component.applyRollToTarget({ targetKey: 'player:p1', amount: 0, kind: 'damage' });
      expect(gameSessionService.updatePlayerHp).not.toHaveBeenCalled();
    });
  });

  describe('teste secreto (jogador)', () => {
    const request = (id: string) => ({
      request_id: id,
      id_character: 10,
      label: 'Percepção',
      check: { kind: 'skill' as const, id_skill: 13 },
    });

    it('pedidos entram numa fila, um de cada vez, sem repetir', () => {
      component.receiveSecretRoll(request('a'));
      component.receiveSecretRoll(request('b'));
      component.receiveSecretRoll(request('a'));
      expect(component.pendingSecretRolls().map((r) => r.request_id)).toEqual(['a', 'b']);
      component.finishSecretRoll();
      expect(component.pendingSecretRolls().map((r) => r.request_id)).toEqual(['b']);
    });
  });

  describe('vez do combate (trava das somas 1×/turno)', () => {
    it('sem combate ativo não trava; com combate ativo usa combate:rodada:participante', () => {
      expect(component.combatTurnKey()).toBeNull();
      detail.set(
        sessionDetail({
          combat: combat([participant('a', { is_current_turn: true }), participant('b')]),
        }),
      );
      expect(component.combatTurnKey()).toBe('enc:1:a');
      detail.set(sessionDetail({ combat: combat([participant('a')], 'rolling_initiative') }));
      expect(component.combatTurnKey()).toBeNull();
    });
  });

  describe('Resistência Implacável (PV que a API grava)', () => {
    it('a sessão usa o PV devolvido pela API (1 em vez de 0)', () => {
      const p1 = player('p1', {
        character: { ...player('p1').character!, current_hit_points: 6, temporary_hit_points: 0 },
      });
      detail.set(sessionDetail({ players: [p1] }));
      gameSessionService.updatePlayerHp.mockReturnValue(of({ current_hit_points: 1 }));
      component.applyRollToTarget({ targetKey: 'player:p1', amount: 20, kind: 'damage' });
      expect(gameSessionService.updatePlayerHp).toHaveBeenCalledWith('p1', 0, 0);
      expect(detail()!.players[0].character!.current_hit_points).toBe(1);
    });
  });

  describe('aliados e defesas', () => {
    it('aliados são os outros jogadores com personagem; alvos levam as defesas', () => {
      const defenses = { resistances: ['fogo'], uncanny_dodge: false, evasion: false };
      const p1 = player('p1', { id_character: 10 });
      const p2 = player('p2', {
        id_character: 20,
        character: { ...player('p2').character!, defenses },
      });
      detail.set(sessionDetail({ players: [p1, p2, player('p3', { character: null })] }));
      expect(component.alliesFor(10)).toEqual([{ id_player_session: 'p2', name: 'Personagem p2' }]);
      expect(component.applyTargetsFor(10).find((t) => t.key === 'player:p2')!.defenses).toEqual(
        defenses,
      );
    });
  });
});
