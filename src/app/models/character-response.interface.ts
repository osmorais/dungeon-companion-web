import { Skill, Spell, WeaponRow } from "./character-options.interface";
import { AvatarPreset } from "./avatar-preset.interface";

export interface CharacterBackground {
  id_character: number;
  full_history: string;
}

export interface CharacterSheetResponse {
  character_background?: CharacterBackground;
  character_sheet: {
    id_character?: number;
    header: {
      name: string;
      class_and_level: string;
      race: string;
      background: string;
      alignment: string;
      experience_points: number;
    };
    combat_stats: {
      proficiency_bonus: number;
      armor_class: number;
      initiative: number;
      speed: string;
      hit_points: { max: number; current: number; temporary: number };
      hit_dice: string;
      passive_perception: number;
    };
    attributes_and_saves: Record<string, {
      score: number;
      modifier: number;
      save: number;
      save_proficiency: boolean;
    }>;
    skills: Skill[];
    weapons: WeaponRow[];
    features_and_traits: Array<{ name: string; source: string; description: string }>;
    proficiencies_and_languages: {
      armor: string[];
      weapons: string[];
      tools: string[];
      languages: string[];
    };
    equipment: {
      currency: any;
      items: string[];
    };
    spellcasting_info?: {
      spellcasting_ability: string;
      spell_save_dc: number;
      spell_attack_bonus: number;
    };
    spells?: Spell[];
    avatar_preset?: AvatarPreset | null;
  };
}
