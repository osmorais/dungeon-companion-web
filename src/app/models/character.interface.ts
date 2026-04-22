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
    skills: string[];
    spells: string[];
  };
  equipment: {
    armor_type: string;
    weapons: string[];
    has_shield: boolean;
  };
  character_details: {
    name: string;
    id_alignment: number;
    alignment: string;
    age: number;
  };
}
