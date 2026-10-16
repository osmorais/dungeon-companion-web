export interface AttributeType {
  id_attribute: number;
  name: string;
  full_name: string;
}

export interface Skill {
  id_skill: number;
  name: string;
  id_attribute: number;
  attribute_name: string;
  description: string;
  is_trained: boolean;
  /** Especialização/Aptidão/Bênção do Conhecimento: bônus de proficiência dobrado nessa perícia. */
  is_expert: boolean;
  level_value: number;
  total_skill_value: number;
}

export interface WeaponRow {
  id_weapon: number;
  attack_bonus: number;
  /** Modificador de habilidade (FOR/DES) aplicado à rolagem de dano — sem a proficiência, que só entra no ataque. */
  damage_modifier: number;
  name: string;
  damage_die: string | null;
  damage_type: string | null;
  properties: string | null;
  weight: number;
  price_value: number;
  isRanged: boolean;
}

export interface WeaponOption {
  name: string;
  damage: string;
  properties: string[];
  isRanged: boolean;
}

export interface TraitInfo {
  name: string;
  description: string;
}

export interface Subrace {
  key: string;
  name: string;
  bonuses_text: string;
  traits: TraitInfo[];
}

export interface Race {
  id_race: number;
  name: string;
  movement: string;
  subraces: Subrace[];
  bonuses_text: string;
  languages: string[];
  traits: TraitInfo[];
  /** Opções de ferramenta pra escolher 1 (ex: Anão) — ausente se a raça não tiver essa escolha. */
  tool_proficiency_options?: string[];
}

export interface CharacterClass {
  id_class: number;
  name: string;
  starting_gold_po: number;
  hit_die: number;
  saving_throws_text: string;
  armor_proficiencies: string[];
  weapon_proficiencies: string[];
  is_spellcaster: boolean;
  traits: TraitInfo[];
  /** Opções de Estilo de Combate (Guerreiro nível 1, Paladino/Ranger nível 2) — ausente se a classe não tiver essa escolha. */
  fighting_style_options?: string[];
  /** Nível em que a classe ganha a escolha de Estilo de Combate — ver `fighting_style_options`. */
  fighting_style_level?: number;
  /** Riqueza inicial alternativa (tabela "Riqueza Inicial por Classe" do PHB) — pra rolar na criação em vez de pegar o equipamento fixo. */
  starting_gold_dice: { count: number; sides: number; multiplier: number };
}

export interface Background {
  id_background: number;
  name: string;
  starting_gold_po: number;
  languages_number: number;
  /** Nomes das perícias do antecedente (ex.: "Intuição"). */
  skills: string[];
  /** `id_skill` das mesmas perícias — concedidas (sempre treinadas), como as fixas da raça. */
  skill_ids: number[];
  tools: string[];
  feature: TraitInfo;
}

export interface Alignment {
  id_alignment: number;
  name: string;
  description: string;
}

export interface Spell {
  id_spell: number;
  name: string;
  description: string | null;
  casting_time: string | null;
  range_distance: number | null;
  duration: string | null;
  is_verbal: boolean;
  is_somatic: boolean;
  is_material: boolean;
  spellLevel: number;
  school: string | null;
  /** Só presente na ficha de um personagem já criado. */
  is_prepared?: boolean;
  /** Rolagem ao lançar, já calculada pro personagem — só pras magias com mecânica cadastrada
   *  na API (`spell-mechanics.ts`). */
  roll?: SpellRoll;
}

/** Espelho de `SpellRoll` da API. */
export interface SpellRoll {
  kind: 'attack' | 'auto' | 'save' | 'heal' | 'rider';
  attack_type: 'melee' | 'ranged' | null;
  attack_bonus: number | null;
  /** `null` em magia de resistência sem dano. */
  damage_type: string | null;
  /** Só `kind: 'save'`: atributo da resistência dos alvos e CD de magia do personagem. */
  save_ability: 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA' | null;
  save_dc: number | null;
  /** Dano quando o alvo passa: metade, nenhum ou total (`null` sem dano). */
  save_on_success: 'half' | 'none' | 'full' | null;
  /** Só `kind: 'heal'`: cura PV ou dá PV temporários. */
  heal: 'hp' | 'temp_hp' | null;
  /** Cura Suprema (Clérigo da Vida nv17): valor máximo dos dados em vez de rolar. */
  maximize: boolean;
  /** Texto do efeito da resistência quando não é "metade/sem dano/total" (Palma Vibrante). */
  save_effect_note?: string | null;
  /** Cura fixa a distribuir entre alvos (Preservar a Vida). */
  heal_distribute?: boolean;
  /** Só `kind: 'rider'` (soma dano no ataque): só no próximo acerto (gasta o espaço nele) ou em
   *  todo acerto enquanto durar, e em que tipo de ataque vale. */
  rider_trigger: 'next_hit' | 'each_hit' | null;
  rider_attack: 'melee_weapon' | 'weapon' | 'any' | null;
  /** Nome de cada rolagem quando há mais de uma (raio, feixe, dardo). */
  instance_label: string | null;
  variant: string | null;
  /** Por círculo usado (chave "0" pra truque). */
  by_slot: Record<
    string,
    {
      instances: number;
      dice_count: number;
      dice_sides: number;
      modifier: number;
      /** Grupos de dados extras que não escalam (Tempestade de Gelo: 4d6). */
      extra_dice: { count: number; sides: number }[];
    }
  >;
}

export interface Armour {
  id_armour: number;
  name: string;
  armour_class_base: number | null;
  is_sum_dexterity: boolean | null;
  armour_type: string | null;
  max_dexterity_bonus: number | null;
  is_stealth_disadvantage: boolean | null;
  weight: number | null;
  price_value: number | null;
}

export interface CharacterOptions {
  attributes: AttributeType[];
  skills: Skill[];
  weapons: WeaponRow[];
  races: Race[];
  classes: CharacterClass[];
  backgrounds: Background[];
  alignments: Alignment[];
  spells: Spell[];
  armours: Armour[];
}
