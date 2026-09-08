import { GameSessionDetail } from '../models/game-session.interface';
import { SessionEvent } from '../models/session-event.interface';

/**
 * Aplica um evento de socket tipado ao estado atual da sessão — pura, sem I/O, testável
 * isoladamente. O polling/safety-net do painel NUNCA passa por aqui: eles sempre substituem o
 * estado inteiro via um GET normal, pra autocorrigir qualquer mensagem perdida/fora de ordem.
 */
export function applySessionEvent(
  detail: GameSessionDetail,
  event: SessionEvent,
): GameSessionDetail {
  switch (event.type) {
    case 'player_added':
      return { ...detail, players: [...detail.players, event.player] };

    case 'player_removed':
      return {
        ...detail,
        players: detail.players.filter((p) => p.id_player_session !== event.id_player_session),
      };

    case 'npc_added':
      return { ...detail, npcs: [...detail.npcs, event.npc] };

    case 'npc_removed':
      return {
        ...detail,
        npcs: detail.npcs.filter((n) => n.id_npc_session !== event.id_npc_session),
      };

    case 'monster_added':
      // Só chega no cliente do mestre (SessionSocketGateway roteia pra room só-mestre).
      return { ...detail, monsters: [...detail.monsters, event.monster] };

    case 'player_hp_updated':
      return {
        ...detail,
        players: detail.players.map((p) =>
          p.id_player_session === event.id_player_session && p.character
            ? { ...p, character: { ...p.character, current_hit_points: event.current_hit_points } }
            : p,
        ),
      };

    case 'npc_hp_updated':
      return {
        ...detail,
        npcs: detail.npcs.map((n) =>
          n.id_npc_session === event.id_npc_session && n.character
            ? { ...n, character: { ...n.character, current_hit_points: event.current_hit_points } }
            : n,
        ),
      };

    case 'monster_hp_updated':
      return {
        ...detail,
        monsters: detail.monsters.map((m) =>
          m.id_monster_session === event.id_monster_session
            ? { ...m, hp_current: event.hp_current }
            : m,
        ),
      };

    case 'monster_revealed':
      return {
        ...detail,
        monsters: detail.monsters.map((m) =>
          m.id_monster_session === event.id_monster_session ? { ...m, is_revealed: true } : m,
        ),
        revealed_monsters: detail.revealed_monsters.some(
          (r) => r.id_monster_session === event.id_monster_session,
        )
          ? detail.revealed_monsters
          : [
              ...detail.revealed_monsters,
              { id_monster_session: event.id_monster_session, name: event.name },
            ],
      };

    case 'monster_hidden':
      return {
        ...detail,
        monsters: detail.monsters.map((m) =>
          m.id_monster_session === event.id_monster_session ? { ...m, is_revealed: false } : m,
        ),
        revealed_monsters: detail.revealed_monsters.filter(
          (r) => r.id_monster_session !== event.id_monster_session,
        ),
      };

    case 'roll_added':
      // 30 = mesmo LIMIT de GameSessionRepository.findRecentRolls no backend.
      return { ...detail, recent_rolls: [event.roll, ...detail.recent_rolls].slice(0, 30) };

    case 'combat_started':
    case 'initiative_submitted':
    case 'turn_ended':
      return { ...detail, combat: event.combat };

    case 'combat_ended': {
      const hidden = new Set(event.hidden_monster_ids);
      return {
        ...detail,
        combat: null,
        monsters: detail.monsters.map((m) =>
          hidden.has(m.id_monster_session) ? { ...m, is_revealed: false } : m,
        ),
        revealed_monsters: detail.revealed_monsters.filter(
          (r) => !hidden.has(r.id_monster_session),
        ),
      };
    }

    default: {
      const _exhaustive: never = event;
      return detail;
    }
  }
}
