/** Linha do catálogo de itens (tabela `item` no backend) — dado de referência, sem dono. */
export interface ItemCatalogEntry {
  id_item: number;
  name: string;
  description: string | null;
  price_value: number | null;
  weight: number | null;
}

/** Item no inventário de um jogador numa sessão — único por sessão+jogador. Guarda uma cópia
 *  do catálogo no momento em que foi adicionado (mesma lógica do `data_snapshot` de monstro). */
export interface InventoryItem {
  id_inventory_item: string;
  id_player_session: string;
  id_item: number;
  name: string;
  description: string | null;
  price_value: number | null;
  weight: number | null;
  quantity: number;
}
