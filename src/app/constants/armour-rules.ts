// armour_type values from the API: 'Armadura Leve' | 'Armadura Média' | 'Armadura Pesada'

export interface ClassArmourRule {
  types: string[];  // allowed armour_type values
  shield: boolean;  // whether shield proficiency is granted
}

// id_class reference:
//  1=Bárbaro   2=Bardo     3=Bruxo      4=Clérigo   5=Druida    6=Feiticeiro
//  7=Guerreiro 8=Ladino    9=Mago      10=Monge    11=Paladino 12=Patrulheiro

export const CLASS_ARMOUR_RULES: Record<number, ClassArmourRule> = {
  // Bárbaro: leve, média, escudo
  1:  { types: ['Armadura Leve', 'Armadura Média'], shield: true },

  // Bardo: apenas leve
  2:  { types: ['Armadura Leve'], shield: false },

  // Bruxo: apenas leve
  3:  { types: ['Armadura Leve'], shield: false },

  // Clérigo: leve, média, escudo
  4:  { types: ['Armadura Leve', 'Armadura Média'], shield: true },

  // Druida: leve, média, escudo (sem metal por lore, mas não restringido aqui)
  5:  { types: ['Armadura Leve', 'Armadura Média'], shield: true },

  // Feiticeiro: sem proficiência
  6:  { types: [], shield: false },

  // Guerreiro: todas, escudo
  7:  { types: ['Armadura Leve', 'Armadura Média', 'Armadura Pesada'], shield: true },

  // Ladino: apenas leve
  8:  { types: ['Armadura Leve'], shield: false },

  // Mago: sem proficiência
  9:  { types: [], shield: false },

  // Monge: sem proficiência
  10: { types: [], shield: false },

  // Paladino: todas, escudo
  11: { types: ['Armadura Leve', 'Armadura Média', 'Armadura Pesada'], shield: true },

  // Patrulheiro: leve, média, escudo
  12: { types: ['Armadura Leve', 'Armadura Média'], shield: true },
};
