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
  sessionDetail,
} from '../../testing/session-fixtures';

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
});
