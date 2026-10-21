import { CharacterSheetResponse } from '../models/character-response.interface';
import { AvatarPreset } from '../models/avatar-preset.interface';
import { ATTR_PT_LABEL, STAT_KEYS } from '../models/level-up.interface';

/** O que o card da lista de personagens mostra, tirado da ficha calculada (CA/atributos ao vivo). */
export interface CharacterCardInfo {
  classLine: string;
  race: string;
  background: string;
  avatarPreset: AvatarPreset | null;
  imageUrl: string | null;
  hp: { current: number; max: number; temp: number };
  ac: number;
  passivePerception: number;
  initiative: number;
  /** Na ordem do livro: FOR, DES, CON, INT, SAB, CAR. */
  attrs: { key: string; label: string; score: number; modifier: number }[];
  xp: number;
  /** `null` no nível 20. */
  nextLevelXp: number | null;
  canLevelUp: boolean;
}

export function characterCardInfo(sheet: CharacterSheetResponse): CharacterCardInfo {
  const cs = sheet.character_sheet;
  const header = cs.header;
  const combat = cs.combat_stats;
  return {
    classLine: header.class_and_level,
    race: header.race,
    background: header.background,
    avatarPreset: cs.avatar_preset ?? null,
    imageUrl: cs.image_url ?? null,
    hp: {
      current: combat.hit_points.current,
      max: combat.hit_points.max,
      temp: combat.hit_points.temporary,
    },
    ac: combat.armor_class,
    passivePerception: combat.passive_perception,
    initiative: combat.initiative,
    attrs: STAT_KEYS.filter((key) => cs.attributes_and_saves[key]).map((key) => ({
      key,
      label: ATTR_PT_LABEL[key],
      score: cs.attributes_and_saves[key].score,
      modifier: cs.attributes_and_saves[key].modifier,
    })),
    xp: header.experience_points,
    nextLevelXp: header.next_level_xp,
    canLevelUp: header.next_level_xp !== null && header.experience_points >= header.next_level_xp,
  };
}

/** Barra de XP: quanto do caminho até o próximo nível (0–100); cheia no nível 20 ou se já pode subir. */
export function xpPercent(info: Pick<CharacterCardInfo, 'xp' | 'nextLevelXp'>): number {
  if (info.nextLevelXp === null || info.nextLevelXp <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((info.xp / info.nextLevelXp) * 100)));
}

export function formatModifier(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}
