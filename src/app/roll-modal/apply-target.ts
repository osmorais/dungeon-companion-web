/** Alvo em que o resultado de uma rolagem de dano/cura pode ser aplicado direto (opcional). */
export interface ApplyTarget {
  /** Ex.: "player:<id_player_session>", "npc:<id_npc_session>", "monster:<id_monster_session>". */
  key: string;
  label: string;
  /** Só jogadores têm PV temporários na sessão. */
  allowsTempHp: boolean;
}

export type ApplyKind = 'damage' | 'heal' | 'temp_hp';

export interface ApplyRequest {
  targetKey: string;
  amount: number;
  kind: ApplyKind;
}
