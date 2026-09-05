export interface NpcRef {
  id_character: number;
}

export interface MonsterRef {
  monster_api_slug: string;
  custom_name?: string;
  hp_current: number;
  hp_max: number;
  ac: number;
  data_snapshot?: Record<string, unknown>;
}

export interface CreateGameSessionPayload {
  session_name: string;
  session_code: string;
  max_player_quantity: number;
  dm_name: string;
  npcs: NpcRef[];
  monsters: MonsterRef[];
}

export interface GameSessionResponse {
  game_session: GameSession;
  npcs: NpcSession[];
  monsters: MonsterSession[];
}

export interface GameSession {
  id_game_session: string;
  session_name: string;
  session_code: string;
  max_player_quantity: number;
  dm_name: string;
  created_at?: Date;
  user_id: string;
}

export interface PlayerCharacterSummary {
  name: string;
  class: string;
  race: string;
  level: number;
  max_hit_points: number;
  current_hit_points: number;
  avatar_preset?: import('./avatar-preset.interface').AvatarPreset | null;
}

export interface PlayerSession {
  id_player_session: string;
  id_game_session: string;
  id_character: number;
  player_name: string;
  user_id: string;
  character: PlayerCharacterSummary | null;
}

export interface NpcSession {
  id_npc_session: string;
  id_game_session: string;
  id_character: number;
  character?: PlayerCharacterSummary | null;
}

export interface MonsterSession {
  id_monster_session: string;
  id_game_session: string;
  monster_api_slug: string;
  custom_name?: string;
  hp_current: number;
  hp_max: number;
  ac: number;
  data_snapshot: Record<string, unknown>;
}

export type RollType = 'dice' | 'attack' | 'skill' | 'save' | 'spell' | 'initiative';
export type AdvantageState = 'normal' | 'advantage' | 'disadvantage';

export type CombatStatus = 'rolling_initiative' | 'active' | 'finished';
export type CombatParticipantType = 'player' | 'npc';

export interface CombatParticipant {
  id_combat_participant: string;
  id_combat_encounter: string;
  participant_type: CombatParticipantType;
  id_player_session: string | null;
  id_npc_session: string | null;
  initiative_roll: number | null;
  initiative_total: number | null;
  dex_modifier: number;
  is_current_turn: boolean;
}

export interface CombatEncounter {
  id_combat_encounter: string;
  id_game_session: string;
  status: CombatStatus;
  round_number: number;
  current_turn_index: number;
  created_at: string;
}

export interface CombatEncounterDetail {
  encounter: CombatEncounter;
  participants: CombatParticipant[];
}

export interface StartEncounterParticipantInput {
  participant_type: CombatParticipantType;
  id: string;
}

export interface SubmitInitiativePayload {
  rolls: number[];
  modifier: number;
  total: number;
}

export interface RollLogEntry {
  id_roll: string;
  id_game_session: string;
  id_character: number | null;
  actor_name: string;
  roll_type: RollType;
  label: string;
  dice_notation: string;
  rolls: number[];
  advantage_state: AdvantageState;
  modifier: number;
  total: number;
  created_at: string;
}

export interface RollLogPayload {
  id_character: number | null;
  actor_name: string;
  roll_type: RollType;
  label: string;
  dice_notation: string;
  rolls: number[];
  advantage_state: AdvantageState;
  modifier: number;
  total: number;
}

export interface GameSessionDetail {
  game_session: GameSession;
  players: PlayerSession[];
  npcs: NpcSession[];
  monsters: MonsterSession[];
  recent_rolls: RollLogEntry[];
  combat: CombatEncounterDetail | null;
}

export interface JoinSessionPayload {
  session_code: string;
  player_name: string;
  id_character: number;
}

export interface GameSessionSummary {
  id_game_session: string;
  session_name: string;
  session_code: string;
  max_player_quantity: number;
  dm_name: string;
  created_at: Date;
  total_count: number;
}

export interface GameSessionPagedList {
  GameSessionPagedList: GameSessionSummary[];
  page: number;
  pageSize: number;
  total_count: number;
}
