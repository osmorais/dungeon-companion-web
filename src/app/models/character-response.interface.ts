export interface CharacterSheetResponse {
  character_sheet: {
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
    skills: Record<string, {
      stat: string;
      bonus: number;
      proficient: boolean;
    }>;
    combat_actions: { weapons: any[] };
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
    spellcasting?: {
      is_spellcaster: boolean;
      spellcasting_ability: string;
      spell_save_dc: number;
      spell_attack_bonus: number;
      spells_known: {
        cantrips: string[];
        level_1?: string[];
      };
    };
  };
}
