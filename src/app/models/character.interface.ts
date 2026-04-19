export interface CharacterSheetData {
  core_build: {
    level: number;
    race: string;
    subrace?: string;
    class: string;
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
    alignment: string;
    age: number;
  };
}
