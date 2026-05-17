export interface ClassSkillRule {
  choices: number;
  from: number[]; // id_skill values; empty = any skill
}

export interface RaceSkillRule {
  granted: number[]; // id_skill values automatically granted
  extraChoices?: number;
  extraFrom?: number[]; // id_skill values for extra choices; empty = any skill
}

// id_skill reference:
//  1=Atletismo        2=Acrobacia       3=Furtividade     4=Prestidigitação
//  5=Arcanismo        6=História        7=Investigação    8=Natureza        9=Religião
// 10=Adestrar Animais 11=Intuição       12=Medicina       13=Percepção      14=Sobrevivência
// 15=Atuação          16=Enganação      17=Intimidação    18=Persuasão

export const CLASS_SKILL_RULES: Record<number, ClassSkillRule> = {
  // id_class 1 — Bárbaro: escolhe 2 de Atletismo, Adestrar Animais, Intimidação, Natureza, Percepção, Sobrevivência
  1: { choices: 2, from: [1, 10, 17, 8, 13, 14] },

  // id_class 2 — Bardo: escolhe 3 de qualquer perícia
  2: { choices: 3, from: [] },

  // id_class 3 — Bruxo: escolhe 2 de Arcanismo, Enganação, História, Intimidação, Investigação, Natureza, Religião
  3: { choices: 2, from: [5, 16, 6, 17, 7, 8, 9] },

  // id_class 4 — Clérigo: escolhe 2 de História, Intuição, Medicina, Persuasão, Religião
  4: { choices: 2, from: [6, 11, 12, 18, 9] },

  // id_class 5 — Druida: escolhe 2 de Arcanismo, Adestrar Animais, Intuição, Medicina, Natureza, Percepção, Religião, Sobrevivência
  5: { choices: 2, from: [5, 10, 11, 12, 8, 13, 9, 14] },

  // id_class 6 — Feiticeiro: escolhe 2 de Arcanismo, Enganação, Intuição, Intimidação, Persuasão, Religião
  6: { choices: 2, from: [5, 16, 11, 17, 18, 9] },

  // id_class 7 — Guerreiro: escolhe 2 de Acrobacia, Adestrar Animais, Atletismo, História, Intuição, Intimidação, Percepção, Sobrevivência
  7: { choices: 2, from: [2, 10, 1, 6, 11, 17, 13, 14] },

  // id_class 8 — Ladino: escolhe 4 de Acrobacia, Atletismo, Enganação, Intuição, Intimidação, Investigação, Percepção, Atuação, Persuasão, Prestidigitação, Furtividade
  8: { choices: 4, from: [2, 1, 16, 11, 17, 7, 13, 15, 18, 4, 3] },

  // id_class 9 — Mago: escolhe 2 de Arcanismo, História, Intuição, Investigação, Medicina, Religião
  9: { choices: 2, from: [5, 6, 11, 7, 12, 9] },

  // id_class 10 — Monge: escolhe 2 de Acrobacia, Atletismo, História, Intuição, Religião, Furtividade
  10: { choices: 2, from: [2, 1, 6, 11, 9, 3] },

  // id_class 11 — Paladino: escolhe 2 de Atletismo, Intuição, Intimidação, Medicina, Persuasão, Religião
  11: { choices: 2, from: [1, 11, 17, 12, 18, 9] },

  // id_class 12 — Patrulheiro: escolhe 3 de Adestrar Animais, Atletismo, Intuição, Investigação, Natureza, Percepção, Furtividade, Sobrevivência
  12: { choices: 3, from: [10, 1, 11, 7, 8, 13, 3, 14] },
};

// id_race reference:
//  1=Anão  2=Elfo  3=Halfling  4=Draconato  5=Gnomo  6=Meio-Elfo  7=Meio-Orc  8=Tiefling  9=Humano

export const RACE_SKILL_RULES: Record<number, RaceSkillRule> = {
  // id_race 2 — Elfo: ganha Percepção automaticamente
  2: { granted: [13] },

  // id_race 6 — Meio-Elfo: escolhe 2 perícias livres de qualquer lista
  6: { granted: [], extraChoices: 2, extraFrom: [] },

  // id_race 7 — Meio-Orc: ganha Intimidação automaticamente
  7: { granted: [17] },
};
