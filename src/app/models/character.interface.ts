import { Armour, Skill, Spell, WeaponOption } from './character-options.interface';

export interface CharacterSheetData {
  core_build: {
    level: number;
    id_race: number;
    race: string;
    subrace?: string;
    id_class: number;
    class: string;
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
  };
  equipment: {
    armour: Armour | null;
    weapons: WeaponOption[];// TO DO: passar o id do weapon para que seja inserido na tabela de character_weapon, e não o nome do weapon
    has_shield: boolean;
  };
  character_details: {
    name: string;
    id_alignment: number;
    alignment: string;
    age: number;
  };
}
