import { Spell, SpellRoll } from '../models/character-options.interface';
import { saveNote } from './spell-roll-config';

/** Destruição (Colérica, Cegante…) num círculo específico: gasta o espaço quando escolhida no acerto. */
export interface RiderOption {
  key: string;
  spellName: string;
  /** Chave do espaço (ex.: "level_2") — o pai debita esse espaço. */
  slotKey: string;
  levelLabel: string;
  dice: { count: number; sides: number };
  damageType: string;
  /** Ex.: "CD 14 de Sabedoria" — resistência do alvo ao efeito extra. */
  saveNote: string | null;
  save: { save_dc: number; save_ability: NonNullable<SpellRoll['save_ability']> } | null;
}

/** Bruxaria/Marca do Caçador/Manto do Cruzado (já lançadas) e somas de traço (Ataque Furtivo,
 *  Golpe Divino, Matador de Inimigos): o jogador marca no acerto. */
export interface RiderToggle {
  key: string;
  spellName: string;
  /** Dados somados (`null` = só valor fixo, ex.: Matador de Inimigos). */
  dice: { count: number; sides: number } | null;
  /** Valor fixo somado ao dano (Matador de Inimigos). */
  flat?: number;
  damageType: string;
  /** Soma 1×/turno — ao usar, o pai marca na vez do combate. */
  oncePerTurn?: boolean;
}

export interface RiderChoices {
  oneShot: RiderOption[];
  persistent: RiderToggle[];
}

export type RiderAttackKind = 'melee_weapon' | 'ranged_weapon' | 'spell';

function matches(rider: SpellRoll['rider_attack'], attack: RiderAttackKind): boolean {
  if (rider === 'any') return true;
  if (rider === 'weapon') return attack !== 'spell';
  return rider === 'melee_weapon' && attack === 'melee_weapon';
}

/**
 * Magias do personagem que podem somar dano neste ataque: Destruições com espaço disponível (uma
 * opção por círculo) e as de efeito contínuo que ele conhece. `canCast` cuida de "preparada" pra
 * quem prepara magias; `slotsAvailable` recebe a chave do espaço (ex.: "level_2").
 */
export function riderChoicesFor(
  spells: Spell[],
  attack: RiderAttackKind,
  canCast: (spell: Spell) => boolean,
  slotsAvailable: (slotKey: string) => number,
): RiderChoices {
  const oneShot: RiderOption[] = [];
  const persistent: RiderToggle[] = [];
  for (const spell of spells) {
    const roll = spell.roll;
    if (roll?.kind !== 'rider' || !matches(roll.rider_attack, attack) || !canCast(spell)) continue;
    const damageType = roll.damage_type ?? '';
    if (roll.rider_trigger === 'each_hit') {
      const entry = roll.by_slot[String(spell.spellLevel)];
      if (!entry) continue;
      persistent.push({
        key: `${spell.id_spell}`,
        spellName: spell.name,
        dice: { count: entry.dice_count, sides: entry.dice_sides },
        damageType,
      });
      continue;
    }
    const save =
      roll.save_dc !== null && roll.save_ability
        ? { save_dc: roll.save_dc, save_ability: roll.save_ability }
        : null;
    for (const [slot, entry] of Object.entries(roll.by_slot)) {
      const slotKey = `level_${slot}`;
      if (slotsAvailable(slotKey) <= 0) continue;
      oneShot.push({
        key: `${spell.id_spell}:${slot}`,
        spellName: spell.name,
        slotKey,
        levelLabel: `${slot}º círculo`,
        dice: { count: entry.dice_count, sides: entry.dice_sides },
        damageType,
        saveNote: save ? saveNote(save.save_dc, save.save_ability) : null,
        save,
      });
    }
  }
  return { oneShot, persistent };
}

/** Destruição (só soma no acerto): o botão de lançar some da lista de magias pra não gastar o
 *  espaço duas vezes — ela é escolhida no ataque com arma. */
export function isOnHitSpell(spell: Spell): boolean {
  return spell.roll?.kind === 'rider' && spell.roll.rider_trigger === 'next_hit';
}

export function hasRiderChoices(choices: RiderChoices | undefined): boolean {
  return !!choices && (choices.oneShot.length > 0 || choices.persistent.length > 0);
}
