import { Armour, Skill, Spell, WeaponRow } from './character-options.interface';
import { AvatarPreset } from './avatar-preset.interface';

export interface CharacterSheetData {
  core_build: {
    level: number;
    id_race: number;
    race: string;
    subrace?: string;
    id_class: number;
    class: string;
    id_subclass?: string;
    id_background: number;
    background: string;
  };
  attributes: {
    generation_method: string;
    base_values: {
      [key: string]: number;
      FOR: number;
      DES: number;
      CON: number;
      INT: number;
      SAB: number;
      CAR: number;
    };
  };
  choices: {
    skills: Skill[];
    spells: Spell[];
    /** Especialização (Ladino) ou Bênção do Conhecimento (Clérigo, Domínio do Conhecimento) — só relevante pra essas. */
    expertise_skill_ids?: number[];
  };
  equipment: {
    armour: Armour | null;
    weapons: WeaponRow[];
    has_shield: boolean;
  };
  character_details: {
    name: string;
    id_alignment: number;
    alignment: string;
    age: number;
  };
  avatar_preset?: AvatarPreset;
}
