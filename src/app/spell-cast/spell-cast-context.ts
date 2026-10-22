import { CharacterCardData } from '../character-card/character-card.component';
import { GameCardData } from '../game-card/game-card.model';
import { CastStageRoll, SpellCastStagePayload } from '../models/game-session.interface';

/** Lançamento em andamento do lado de quem lança (montado em PlayerActionsModal.castSpell). */
export interface SpellCastContext {
  castId: string;
  idSpell: number;
  spellName: string;
  actor: CharacterCardData;
  card: GameCardData;
  saveDc: number | null;
  saveAbility: SpellCastStagePayload['save_ability'];
  /** "CD 14 de Destreza" — mostrado no palco. */
  saveNote: string | null;
}

/** Id do lançamento (agrupa as rolagens e as etapas na mesa). */
export function newCastId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return `cast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function castStagePayload(
  ctx: SpellCastContext,
  idCharacter: number,
  actorName: string,
  phase: 'open' | 'done',
  rolls: CastStageRoll[],
): SpellCastStagePayload {
  return {
    cast_id: ctx.castId,
    id_character: idCharacter,
    actor_name: actorName,
    id_spell: ctx.idSpell,
    phase,
    rolls,
    save_dc: ctx.saveDc,
    save_ability: ctx.saveAbility,
  };
}
