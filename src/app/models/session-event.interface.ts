import {
  CombatEncounterDetail,
  MonsterSession,
  NpcSession,
  PlayerSession,
  RollLogEntry,
} from './game-session.interface';

/**
 * Espelha dungeon-companion-api/src/models/session-event-types.ts — manter em sync
 * manualmente, não há pacote compartilhado entre os dois repos.
 */
export interface SessionEventPayloadMap {
  player_added: { player: PlayerSession };
  player_removed: { id_player_session: string };
  npc_added: { npc: NpcSession };
  npc_removed: { id_npc_session: string };
  monster_added: { monster: MonsterSession };
  monster_removed: { id_monster_session: string };
  monster_defeated: { id_monster_session: string; name: string; image_url: string | null };
  player_hp_updated: { id_player_session: string; current_hit_points: number };
  player_xp_granted: {
    id_player_session: string;
    character_name: string;
    xp_amount: number;
    xp_points: number;
    can_level_up: boolean;
  };
  npc_xp_granted: {
    id_npc_session: string;
    character_name: string;
    xp_amount: number;
    xp_points: number;
    can_level_up: boolean;
  };
  npc_hp_updated: { id_npc_session: string; current_hit_points: number };
  monster_hp_updated: { id_monster_session: string; hp_current: number };
  monster_image_updated: { id_monster_session: string; image_url: string };
  monster_revealed: { id_monster_session: string; name: string; image_url: string | null };
  monster_hidden: { id_monster_session: string };
  roll_added: { roll: RollLogEntry };
  combat_started: { combat: CombatEncounterDetail };
  initiative_submitted: { combat: CombatEncounterDetail };
  turn_ended: { combat: CombatEncounterDetail };
  combat_ended: { id_combat_encounter: string; hidden_monster_ids: string[] };
}

export type SessionEventType = keyof SessionEventPayloadMap;

export type SessionEvent = {
  [K in SessionEventType]: { type: K; id_game_session: string } & SessionEventPayloadMap[K];
}[SessionEventType];
