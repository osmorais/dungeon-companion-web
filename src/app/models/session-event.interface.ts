import {
  CastStageApplied,
  CastStageRoll,
  CombatEncounterDetail,
  MonsterAbilityKey,
  MonsterActionCardInfo,
  MonsterActionState,
  MonsterCastInfo,
  MonsterSession,
  NpcSession,
  PlayerSession,
  RechargeRoll,
  RollLogEntry,
  SecretRollCheck,
  ShownReferenceImage,
  SpellCardInfo,
  WeaponCardInfo,
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
  /** Tipo e tamanho vão pra carta que explode no aviso (1.11.0). */
  monster_defeated: {
    id_monster_session: string;
    name: string;
    image_url: string | null;
    monster_type?: string | null;
    size?: string | null;
  };
  /** Mestre apagou a sessão — quem está nela vê o aviso e volta pro início. */
  session_deleted: Record<never, never>;
  /** Mestre declarou um descanso do grupo — só o aviso pra mesa (PV vai em *_hp_updated). */
  party_rested: { rest_type: 'short' | 'long'; character_names: string[] };
  player_hp_updated: {
    id_player_session: string;
    current_hit_points: number;
    temporary_hit_points: number;
  };
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
  monster_stats_updated: {
    id_monster_session: string;
    custom_name: string | null;
    hp_current: number;
    hp_max: number;
    ac: number;
    abilities?: Partial<Record<MonsterAbilityKey, number>>;
  };
  monster_image_updated: { id_monster_session: string; image_url: string };
  /** Usos das ações do monstro (1.11.0) — só o mestre recebe. `recharge_rolls`: d6 do início
   *  do turno dele. */
  monster_action_state_updated: {
    id_monster_session: string;
    action_state: MonsterActionState;
    recharge_rolls?: RechargeRoll[];
  };
  /** Tipo, tamanho e descrição vão pra carta do aviso (1.11.0); `null` em ficha antiga/sem lore. */
  monster_revealed: {
    id_monster_session: string;
    name: string;
    image_url: string | null;
    monster_type?: string | null;
    size?: string | null;
    lore?: string | null;
  };
  monster_hidden: { id_monster_session: string };
  roll_added: { roll: RollLogEntry };
  /** Teste secreto pedido pelo mestre — o backend só manda pro jogador alvo. */
  secret_roll_requested: {
    target_user_id: string;
    request_id: string;
    id_player_session: string;
    id_character: number;
    label: string;
    check: SecretRollCheck;
  };
  spell_cast: {
    id_character: number;
    actor_name: string;
    spell_name: string;
    /** Opcionais: só magias de resistência (e a API antiga não manda). */
    save_dc?: number | null;
    save_ability?: 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA' | null;
    /** Habilidade de classe: o toast diz "USOU" em vez de "LANÇOU". */
    is_ability?: boolean;
  };
  /** Etapa de um lançamento de magia: aviso único da mesa (card do personagem + carta da magia +
   *  rolagens). `user_id` = quem lançou. */
  spell_cast_stage: {
    cast_id: string;
    user_id: string;
    /** `null` na ação de monstro. */
    id_character: number | null;
    actor_name: string;
    /** Magia, ataque com arma ou ação de monstro (1.13.0): só um vem preenchido. A API antiga não
     *  manda `weapon`, `monster_action` nem `monster`. */
    spell: SpellCardInfo | null;
    weapon?: WeaponCardInfo | null;
    monster_action?: MonsterActionCardInfo | null;
    monster?: MonsterCastInfo | null;
    phase: 'open' | 'done' | 'cancel';
    rolls: CastStageRoll[];
    /** O que já foi aplicado nos alvos (a API antiga não manda). */
    applied?: CastStageApplied[];
    save_dc: number | null;
    save_ability: 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA' | null;
  };
  /** Alguém aplicou dano/cura de uma rolagem num alvo — só o aviso pra mesa. */
  amount_applied: {
    id_character: number;
    actor_name: string;
    target_label: string;
    amount: number;
    kind: 'damage' | 'heal' | 'temp_hp';
    /** Veio de um lançamento: aparece no aviso dele, sem aviso avulso. */
    cast_id?: string;
  };
  /** Mestre mostra uma imagem de referência em tela cheia pra todos da sessão. */
  reference_image_shown: { image: ShownReferenceImage };
  /** Imagem fechada pra todos: o mestre fechou ou apagou a que estava em exibição. */
  reference_image_hidden: { reason: 'hidden' | 'deleted' };
  combat_started: { combat: CombatEncounterDetail };
  combat_participants_added: { combat: CombatEncounterDetail };
  initiative_submitted: { combat: CombatEncounterDetail };
  turn_ended: { combat: CombatEncounterDetail };
  turn_order_changed: { combat: CombatEncounterDetail };
  turn_delayed: { combat: CombatEncounterDetail };
  combat_ended: { id_combat_encounter: string; hidden_monster_ids: string[] };
}

export type SessionEventType = keyof SessionEventPayloadMap;

export type SessionEvent = {
  [K in SessionEventType]: { type: K; id_game_session: string } & SessionEventPayloadMap[K];
}[SessionEventType];
