// Truques concedidos por raça/sub-raça, independente da classe do personagem (mesmo um
// personagem de classe não conjuradora ganha o truque). Mantido em sincronia manualmente com
// as descrições em rules.ts (backend) — id_race/subrace são só chaves de consulta aqui, o
// truque em si sempre vem do catálogo de magias já carregado pelo wizard.

export interface RacialCantripGrant {
  /** Classe de referência pra lista de truques elegíveis (9 = Mago, em todas as ocorrências atuais). */
  spellListClassId: number;
  /** Se definido, o truque é fixo (sem escolha do jogador) — ex: 'Ilusão Menor', 'Taumaturgia'. */
  fixedSpellName?: string;
}

// id_race 8 = Tiefling (Legado Infernal: conhece o truque Taumaturgia automaticamente)
export const RACE_FREE_CANTRIP: Record<number, RacialCantripGrant> = {
  8: {spellListClassId: 9, fixedSpellName: 'Taumaturgia'},
};

// 'alto-elfo' (Truque: escolhe qualquer truque de mago)
// 'gnomo-das-florestas' (Ilusão Natural: conhece o truque Ilusão Menor automaticamente)
export const SUBRACE_FREE_CANTRIP: Record<string, RacialCantripGrant> = {
  'alto-elfo': {spellListClassId: 9},
  'gnomo-das-florestas': {spellListClassId: 9, fixedSpellName: 'Ilusão Menor'},
};
