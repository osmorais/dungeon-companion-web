import { Skill, Spell, WeaponRow } from "./character-options.interface";
import { AvatarPreset } from "./avatar-preset.interface";

export interface CharacterBackground {
  id_character: number;
  full_history: string;
}

/** Recurso consumível rastreado (Fúria/Pontos de Chi/Canalizar Divindade). */
export interface ResourceTracker {
  name: string;
  max: number | 'unlimited';
  used: number;
  recharge_on: 'short_rest' | 'long_rest';
}

/** Característica ativável gastando um dos recursos rastreados (hoje só as de Pontos de Chi do Monge). */
export interface ChiAbility {
  name: string;
  description: string;
  chi_cost: number;
  resource_key: string;
}

export interface CharacterSheetResponse {
  character_background?: CharacterBackground;
  character_sheet: {
    id_character?: number;
    header: {
      name: string;
      class_and_level: string;
      id_class: number;
      race: string;
      background: string;
      alignment: string;
      experience_points: number;
      /** XP mínimo pro próximo nível; `null` se já estiver no nível 20. */
      next_level_xp: number | null;
    };
    combat_stats: {
      proficiency_bonus: number;
      armor_class: number;
      initiative: number;
      speed: string;
      hit_points: { max: number; current: number; temporary: number };
      hit_dice: string;
      hit_dice_total: number;
      hit_dice_spent: number;
      hit_die_size: number;
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
      currency: { cp: number; sp: number; ep: number; gp: number; pp: number };
      items: string[];
      equipped_armour: { id_armour: number; name: string; armour_type: string | null } | null;
      has_shield: boolean;
    };
    spellcasting_info?: {
      spellcasting_ability: string;
      spell_save_dc: number;
      spell_attack_bonus: number;
      slots_total?: Record<string, number>;
      slots_expended?: Record<string, number>;
      spells_known?: Record<string, string[]>;
      prepares_spells?: boolean;
      max_prepared_spells?: number;
    };
    spells?: Spell[];
    avatar_preset?: AvatarPreset | null;
    /** Vazio se a classe não tiver nenhum recurso rastreável neste nível. Uma classe pode ter mais de um ao mesmo tempo. */
    resource_trackers: ResourceTracker[];
    /** Vazio se a classe não tiver nenhuma característica ativável neste nível. */
    chi_abilities: ChiAbility[];
    /** Recursos de classe/subclasse que escalam por nível (ex: "Ataque Furtivo": "2d6") — informativo, `null` se não houver nenhum neste nível. */
    class_resources: Record<string, string> | null;
  };
}
