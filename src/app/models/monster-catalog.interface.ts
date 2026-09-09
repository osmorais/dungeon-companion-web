/** Resumo de um monstro do SRD (D&D 5e), usado na busca antes de catalogar. */
export interface SrdMonsterSummary {
  index: string;
  name: string;
}

/** Stat block completo do SRD — só os campos usados na pré-visualização; o restante é ignorado. */
export interface SrdMonsterDetail {
  index: string;
  name: string;
  size: string;
  type: string;
  subtype?: string;
  alignment: string;
  armor_class: { type: string; value: number }[];
  hit_points: number;
  hit_dice: string;
  speed: Record<string, string>;
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
  data_snapshot: SrdMonsterDetail;
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
