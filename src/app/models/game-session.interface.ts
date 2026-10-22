import { SrdMonsterDetail } from './monster-catalog.interface';

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
  /** Amortecedor de dano à parte do PV normal — pode deixar o total acima do máximo. */
  temporary_hit_points: number;
  experience_points: number;
  avatar_preset?: import('./avatar-preset.interface').AvatarPreset | null;
  /** Foto de verdade, à parte do avatar_preset — usada como fundo do toast de rolagem. */
  image_url: string | null;
  /** Resistências e reações pra quem aplica dano nele (só no detalhe da sessão). */
  defenses?: DamageDefenses;
}

/** Espelho de `DamageDefenses` da API (combat-features.ts). */
export interface DamageDefenses {
  /** Tipos com resistência, minúsculos ("fogo", "veneno", "contundente"…). */
  resistances: string[];
  uncanny_dodge: boolean;
  evasion: boolean;
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

/** Chaves de atributo dentro de `MonsterSession.data_snapshot` (formato do SRD, em inglês). */
export type MonsterAbilityKey =
  | 'strength'
  | 'dexterity'
  | 'constitution'
  | 'intelligence'
  | 'wisdom'
  | 'charisma';

export interface MonsterSession {
  id_monster_session: string;
  id_game_session: string;
  monster_api_slug: string;
  custom_name?: string;
  hp_current: number;
  hp_max: number;
  ac: number;
  data_snapshot: SrdMonsterDetail;
  is_revealed: boolean;
  image_url: string | null;
}

/** Versão pública de um monstro revelado — só o que os jogadores podem ver: nome, sem status/PV. */
export interface RevealedMonster {
  id_monster_session: string;
  name: string;
  image_url: string | null;
}

export type RollType =
  | 'dice'
  | 'attack'
  | 'damage'
  | 'skill'
  | 'save'
  | 'spell'
  | 'initiative'
  | 'heal';
export type AdvantageState = 'normal' | 'advantage' | 'disadvantage';

export type CombatStatus = 'rolling_initiative' | 'active' | 'finished';
export type CombatParticipantType = 'player' | 'npc' | 'monster';

export interface CombatParticipant {
  id_combat_participant: string;
  id_combat_encounter: string;
  participant_type: CombatParticipantType;
  id_player_session: string | null;
  id_npc_session: string | null;
  id_monster_session: string | null;
  initiative_roll: number | null;
  initiative_total: number | null;
  dex_modifier: number;
  turn_order: number | null;
  /** Atrasou o próprio turno nesta rodada — volta ao normal na rodada seguinte. */
  delayed_this_round: boolean;
  is_current_turn: boolean;
}

export interface CombatEncounter {
  id_combat_encounter: string;
  id_game_session: string;
  status: CombatStatus;
  round_number: number;
  current_turn_participant_id: string | null;
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
  /** Rolagem oculta do mestre — não aparece pros jogadores. */
  is_hidden: boolean;
  /** Só no evento do socket: rolagem de um lançamento de magia (aparece no aviso do lançamento,
   *  não num aviso de rolagem avulso). Não vem no GET da sessão. */
  cast_id?: string;
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
  /** Só o mestre consegue de fato ocultar — o backend ignora esse campo pra quem não é dono da sessão. */
  is_hidden?: boolean;
  /** Resposta a um teste secreto pedido pelo mestre — o backend grava oculta (só o mestre recebe). */
  secret_request_id?: string;
  /** Rolagem de um lançamento de magia — o backend repassa no evento, sem gravar. */
  cast_id?: string;
}

/** Magia mostrada como carta no aviso de lançamento (a API manda sem a descrição). */
export interface SpellCardInfo {
  id_spell: number;
  name: string;
  casting_time: string | null;
  range_distance: number | null;
  duration: string | null;
  is_verbal: boolean;
  is_somatic: boolean;
  is_material: boolean;
  spellLevel: number;
  school: string | null;
}

/** Rolagem que faz parte de um lançamento (o id é o da rolagem já registrada). */
export interface CastStageRoll {
  id_roll: string;
  kind: 'attack' | 'damage' | 'heal';
  /** Só ataque: aguardando a decisão, acertou ou errou. */
  outcome: 'pending' | 'hit' | 'miss' | null;
  critical: boolean;
}

/** Etapa de um lançamento de magia (POST /spell-cast-stage). */
export interface SpellCastStagePayload {
  cast_id: string;
  id_character: number;
  actor_name: string;
  id_spell: number;
  phase: 'open' | 'done';
  rolls: CastStageRoll[];
  save_dc?: number | null;
  save_ability?: 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA' | null;
}

/** O que o mestre pede no teste secreto — o jogador rola com o bônus da própria ficha. */
export type SecretRollCheck =
  | { kind: 'skill'; id_skill: number }
  | { kind: 'save'; ability: 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA' };

export interface SecretRollRequestPayload {
  id_player_sessions: string[];
  check: SecretRollCheck;
  label: string;
}

/** Anúncio de "personagem lançou uma magia" — só informativo, não persiste no backend (ao
 *  contrário da rolagem), só dispara o toast em tela de todo mundo na sessão. */
export interface SpellCastPayload {
  id_character: number;
  actor_name: string;
  spell_name: string;
  /** Magia de resistência: CD e atributo que os alvos rolam (aparece no toast da mesa). */
  save_dc?: number | null;
  save_ability?: 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA' | null;
  /** Habilidade de classe (não magia): o toast diz "USOU". */
  is_ability?: boolean;
}

export interface GameSessionDetail {
  game_session: GameSession;
  players: PlayerSession[];
  npcs: NpcSession[];
  /** Só preenchido para o mestre — jogadores recebem sempre um array vazio aqui. */
  monsters: MonsterSession[];
  /** Monstros revelados pelo mestre — visível para todos, sem status/PV. */
  revealed_monsters: RevealedMonster[];
  recent_rolls: RollLogEntry[];
  combat: CombatEncounterDetail | null;
  /** Imagem de referência que o mestre está mostrando agora (todos veem) — `null` se nenhuma. */
  shown_reference_image?: ShownReferenceImage | null;
}

/** Imagem da biblioteca do mestre numa sessão (só o mestre lista). */
export interface ReferenceImage {
  id_reference_image: string;
  id_game_session: string;
  image_url: string;
  title: string | null;
  created_at: string;
}

/** O que a mesa recebe da imagem em exibição. */
export interface ShownReferenceImage {
  id_reference_image: string;
  image_url: string;
  title: string | null;
}

export interface JoinSessionPayload {
  session_code: string;
  player_name: string;
  id_character: number;
}

export interface PartyRestPayload {
  rest_type: 'short' | 'long';
  id_player_sessions?: string[];
  id_npc_sessions?: string[];
}

export interface PartyRestResult {
  rested: string[];
  /** Quem ficou de fora (descanso longo exige PV > 0). */
  skipped: { name: string; reason: string }[];
}

export interface GrantXpPayload {
  xp_amount: number;
  /** Cada jogador/NPC listado recebe o valor cheio de `xp_amount` (não é dividido entre eles). */
  id_player_sessions?: string[];
  id_npc_sessions?: string[];
}

export interface GrantXpResult {
  participant_type: 'player' | 'npc';
  id_player_session?: string;
  id_npc_session?: string;
  id_character: number;
  character_name: string;
  xp_points: number;
  level: number;
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
