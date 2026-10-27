/** Item da lista do bestiário (fichas do Manual dos Monstros): carta e filtros da tela de
 *  catalogar (1.13.4). */
export interface BestiaryMonsterSummary {
  index: string;
  name: string;
  challenge_rating: number;
  size: string;
  type: string;
  alignment: string | null;
  hp_max: number;
  ac: number;
  /** Tem ações lendárias. */
  legendary: boolean;
  /** Tem deslocamento de voo. */
  flies: boolean;
}

/**
 * Ficha do monstro do nosso bestiário (Manual dos Monstros em português, chaves no formato da
 * dnd5eapi). Fichas antigas da dnd5eapi, em inglês, não são mais usadas (1.13.4). Só os campos
 * usados nas telas.
 */
export interface MonsterStatBlock {
  index: string;
  name: string;
  size: string;
  type: string;
  subtype?: string;
  alignment: string;
  armor_class: { type: string; value: number }[];
  hit_points: number;
  hit_dice: string;
  speed: Record<string, string | boolean>;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  languages?: string;
  challenge_rating: number;
  xp: number;
  special_abilities?: MonsterAbility[];
  actions?: MonsterAbility[];
  /** Campos estruturados do bestiário (1.10.0). */
  reactions?: MonsterAbility[];
  legendary_actions?: MonsterAbility[];
  legendary_count?: number | null;
  saving_throws?: { ability: MonsterAbilityAbbr; bonus: number }[];
  skills?: { name: string; bonus: number }[];
  damage_vulnerabilities?: string[];
  damage_resistances?: string[];
  damage_immunities?: string[];
  condition_immunities?: string[];
  senses?: string;
  /** Texto do livro sobre as ações lendárias e as de covil (só o que a ficha mostra). */
  legendary_desc?: string | null;
  lair_actions?: string | null;
}

/** Atributo como o livro abrevia (bestiário). */
export type MonsterAbilityAbbr = 'FOR' | 'DES' | 'CON' | 'INT' | 'SAB' | 'CAR';

/**
 * Habilidade/ação da ficha. `name`/`desc` existem nos dois formatos; o resto só no bestiário
 * (ver docs/dungeon-companion/conceitos/monstros.md).
 */
export interface MonsterAbility {
  name: string;
  desc: string;
  usage?:
    | { type: 'recharge'; min: number }
    | { type: 'per_day'; times: number }
    | { type: 'rest'; rest: string }
    | { type: 'cost'; actions: number }
    | { type: 'form'; desc: string }
    | null;
  attack?: {
    kind: string;
    bonus: number;
    reach_m: number | null;
    range_m: string | null;
    target: string | null;
  } | null;
  /** `note`: dano condicional ou alternativo (duas mãos, se agarrado); `type` null segue a arma. */
  damage?: { dice: string; average: number; type: string | null; note?: string }[];
  dc?: { ability: MonsterAbilityAbbr; value: number; success: 'metade' | 'nenhum' | null } | null;
  multiattack?: { action: string; count: number }[] | null;
}

export interface MonsterCatalogEntry {
  id_monster_catalog: string;
  monster_api_slug: string;
  custom_name: string | null;
  hp_max: number;
  ac: number;
  data_snapshot: MonsterStatBlock;
  created_at: string;
  /** Arte customizada subida pelo mestre — null enquanto não subir nenhuma. */
  image_url: string | null;
}

export interface MonsterCatalogPagedList {
  MonsterCatalogPagedList: MonsterCatalogEntry[];
  page: number;
  pageSize: number;
  total_count: number;
}
