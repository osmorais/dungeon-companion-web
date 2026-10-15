import {
  CombatEncounterDetail,
  CombatParticipant,
  GameSessionDetail,
  MonsterSession,
  NpcSession,
  PlayerSession,
  RollLogEntry,
} from '../app/models/game-session.interface';

/** Fábricas de dados de sessão pros testes — fora do build da aplicação (ver tsconfig.app.json). */

export function player(id: string, overrides: Partial<PlayerSession> = {}): PlayerSession {
  return {
    id_player_session: id,
    id_game_session: 'gs',
    id_character: 1,
    player_name: `Jogador ${id}`,
    user_id: `user-${id}`,
    character: {
      name: `Personagem ${id}`,
      class: 'Guerreiro',
      race: 'Humano',
      level: 1,
      max_hit_points: 20,
      current_hit_points: 20,
      temporary_hit_points: 0,
      experience_points: 0,
      image_url: null,
    },
    ...overrides,
  };
}

export function npc(id: string, overrides: Partial<NpcSession> = {}): NpcSession {
  return { ...player(id), id_npc_session: id, ...overrides } as NpcSession;
}

export function monster(id: string, overrides: Partial<MonsterSession> = {}): MonsterSession {
  return {
    id_monster_session: id,
    id_game_session: 'gs',
    monster_api_slug: 'goblin',
    hp_current: 7,
    hp_max: 7,
    ac: 15,
    data_snapshot: { name: 'Goblin', strength: 8 } as unknown as MonsterSession['data_snapshot'],
    is_revealed: false,
    image_url: null,
    ...overrides,
  };
}

export function roll(id: string): RollLogEntry {
  return {
    id_roll: id,
    id_game_session: 'gs',
    id_character: null,
    actor_name: 'Mestre',
    roll_type: 'dice',
    label: 'd20',
    dice_notation: '1d20',
    rolls: [10],
    advantage_state: 'normal',
    modifier: 0,
    total: 10,
    created_at: '2026-01-01T00:00:00Z',
    is_hidden: false,
  };
}

export function participant(
  id: string,
  overrides: Partial<CombatParticipant> = {},
): CombatParticipant {
  return {
    id_combat_participant: id,
    id_combat_encounter: 'enc',
    participant_type: 'player',
    id_player_session: null,
    id_npc_session: null,
    id_monster_session: null,
    initiative_roll: 10,
    initiative_total: 10,
    dex_modifier: 0,
    turn_order: null,
    delayed_this_round: false,
    is_current_turn: false,
    ...overrides,
  };
}

export function combat(
  participants: CombatParticipant[],
  status: 'rolling_initiative' | 'active' = 'active',
): CombatEncounterDetail {
  return {
    encounter: {
      id_combat_encounter: 'enc',
      id_game_session: 'gs',
      status,
      round_number: 1,
      current_turn_participant_id:
        participants.find((p) => p.is_current_turn)?.id_combat_participant ?? null,
      created_at: '2026-01-01T00:00:00Z',
    },
    participants,
  };
}

export function sessionDetail(overrides: Partial<GameSessionDetail> = {}): GameSessionDetail {
  return {
    game_session: {
      id_game_session: 'gs',
      session_name: 'Mesa',
      session_code: 'ABC123',
      max_player_quantity: 5,
      dm_name: 'Mestre',
      user_id: 'dm',
    },
    players: [],
    npcs: [],
    monsters: [],
    revealed_monsters: [],
    recent_rolls: [],
    combat: null,
    ...overrides,
  };
}
