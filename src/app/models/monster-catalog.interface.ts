/** Item da lista do bestiário (fichas do Manual dos Monstros), usado na busca antes de catalogar. */
export interface BestiaryMonsterSummary {
  index: string;
  name: string;
  challenge_rating: number;
  size: string;
  type: string;
}

/**
 * Ficha do monstro (chaves no formato da dnd5eapi): do bestiário do livro, em português, ou das
 * fichas antigas catalogadas da dnd5eapi, em inglês. Só os campos usados nas telas.
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
  special_abilities?: { name: string; desc: string }[];
  actions?: { name: string; desc: string }[];
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
