import { CharacterCardData } from '../character-card/character-card.component';
import { GameCardData } from '../game-card/game-card.model';
import {
  CastStageApplied,
  CastStageRoll,
  MonsterActionCardInfo,
  SpellCastStagePayload,
  WeaponCardInfo,
} from '../models/game-session.interface';

/** Lançamento de magia ou ataque com arma em andamento, do lado de quem age (montado em
 *  PlayerActionsModal.castSpell / rollAttack / rollUnarmed). */
export interface SpellCastContext {
  castId: string;
  /** Magia lançada — ou `weapon` (ataque com arma). */
  idSpell: number | null;
  weapon: WeaponCardInfo | null;
  /** Nome da magia ou da arma (título do aviso). */
  spellName: string;
  actor: CharacterCardData;
  card: GameCardData;
  saveDc: number | null;
  saveAbility: SpellCastStagePayload['save_ability'];
  /** "CD 14 de Destreza" — mostrado no palco. */
  saveNote: string | null;
  /** Ação de monstro (1.13.0), lançada pelo mestre: a carta da ação e o monstro da mesa. */
  monsterAction?: MonsterActionCardInfo | null;
  idMonsterSession?: string | null;
  /** Só o mestre vê (monstro escondido): nada vai pra mesa, o palco é montado aqui mesmo. */
  private?: boolean;
}

/** Id do lançamento (agrupa as rolagens e as etapas na mesa). */
export function newCastId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return `cast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function castStagePayload(
  ctx: SpellCastContext,
  idCharacter: number | null,
  actorName: string,
  phase: 'open' | 'done' | 'cancel',
  rolls: CastStageRoll[],
  applied: CastStageApplied[] = [],
): SpellCastStagePayload {
  return {
    cast_id: ctx.castId,
    id_character: idCharacter,
    actor_name: actorName,
    ...(ctx.monsterAction
      ? { monster_action: ctx.monsterAction, id_monster_session: ctx.idMonsterSession ?? null }
      : ctx.weapon
        ? { weapon: ctx.weapon }
        : { id_spell: ctx.idSpell }),
    phase,
    rolls,
    applied,
    save_dc: ctx.saveDc,
    save_ability: ctx.saveAbility,
  };
}

/** "LANÇOU" (magia) ou "ATACOU COM" (arma) — o verbo do aviso. */
export function castVerb(isWeapon: boolean): string {
  return isWeapon ? 'ATACOU COM' : 'LANÇOU';
}

/** Verbo da ação de monstro: "ATACOU COM" (ataque) ou "USOU" (sopro, veneno, dano). */
export function monsterCastVerb(action: MonsterActionCardInfo): string {
  return action.kind === 'attack' ? 'ATACOU COM' : 'USOU';
}
