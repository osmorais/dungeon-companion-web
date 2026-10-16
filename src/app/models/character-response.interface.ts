import { Skill, Spell, SpellRoll, WeaponRow } from "./character-options.interface";
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

/** Característica ativável gastando um dos recursos rastreados (Canalizar Divindade, Fúria, Pontos de Chi, Forma Selvagem, etc.). */
export interface ClassAbility {
  name: string;
  description: string;
  cost: number;
  resource_key: string;
  /** O que o "USAR" rola (cura/resistência) — mesmo formato da rolagem das magias. */
  roll?: SpellRoll | null;
  /** Curar pelo Toque: o jogador escolhe quantos pontos do recurso gastar. */
  variable_cost?: boolean;
  /** Criar Espaço de Magia: devolve um espaço gasto desse círculo. */
  restores_slot?: number | null;
  /** Liga um efeito guardado no personagem até acabar (Fúria, Arma Sagrada). */
  activates?: string | null;
  /** Rajada de Golpes: N ataques desarmados em sequência. */
  unarmed_attacks?: number | null;
}

/** Efeitos ativos (Fúria, Arma Sagrada) e somas 1×/turno já usadas na vez atual do combate. */
export interface ActiveEffects {
  active: string[];
  turn_uses: Record<string, string>;
}

/** Soma no acerto (Ataque Furtivo, Fúria, Golpe Divino, Matador de Inimigos). */
export interface CombatRider {
  key: string;
  name: string;
  dice: { count: number; sides: number } | null;
  flat: number;
  damage_type: string;
  applies: 'finesse_or_ranged' | 'melee_str' | 'weapon';
  once_per_turn: boolean;
  requires_active: string | null;
}

/** Traços que mexem no ataque — espelho de `CombatFeatures` da API (combat-features.ts). */
export interface CombatFeatures {
  crit_min: number;
  melee_crit_extra_dice: number;
  riders: CombatRider[];
  attack_bonuses: { key: string; name: string; bonus: number; requires_active: string }[];
  power_attack: { name: string; applies: 'heavy_melee' | 'ranged' }[];
  unarmed: {
    name: string;
    attack_bonus: number;
    dice: { count: number; sides: number };
    damage_modifier: number;
  } | null;
  active_effects: ActiveEffects;
  /** Halfling (Sortudo): 1 natural no d20 pode ser rolado de novo. */
  halfling_lucky: boolean;
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
    image_url?: string | null;
    /** Trava a UI de preparar magia — em combate não é possível trocar o que está preparado. */
    in_active_combat?: boolean;
    /** Vazio se a classe não tiver nenhum recurso rastreável neste nível. Uma classe pode ter mais de um ao mesmo tempo. */
    resource_trackers: ResourceTracker[];
    /** Vazio se a classe não tiver nenhuma característica ativável neste nível. */
    class_abilities: ClassAbility[];
    /** Recursos de classe/subclasse que escalam por nível (ex: "Ataque Furtivo": "2d6") — informativo, `null` se não houver nenhum neste nível. */
    class_resources: Record<string, string> | null;
    /** Traços que mexem no ataque (só na ficha carregada). */
    combat_features?: CombatFeatures;
  };
}
