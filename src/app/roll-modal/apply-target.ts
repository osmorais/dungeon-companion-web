/** Alvo em que o resultado de uma rolagem de dano/cura pode ser aplicado direto (opcional). */
export interface ApplyTarget {
  /** Ex.: "player:<id_player_session>", "npc:<id_npc_session>", "monster:<id_monster_session>". */
  key: string;
  label: string;
  /** Só jogadores têm PV temporários na sessão. */
  allowsTempHp: boolean;
  /** Só aceita dano (monstro na mão do jogador: ele não cura monstro). */
  damageOnly?: boolean;
  /** Resistências e reações do alvo (jogador/NPC) — o modal ajusta o dano ao aplicar. Monstro
   *  na mão do mestre (1.24.4) traz também imunidades e vulnerabilidades da ficha. */
  defenses?: {
    resistances: string[];
    uncanny_dodge: boolean;
    evasion: boolean;
    immunities?: string[];
    vulnerabilities?: string[];
  };
}

/**
 * Defesas da ficha do monstro (mestre): só os tipos simples ("veneno", "fogo") — os compostos
 * ("concussão, cortante e perfurante de ataques não-mágicos") ficam com o mestre. Mesmo critério
 * de `monster-defenses.ts` da API.
 */
export function monsterApplyDefenses(block: {
  damage_immunities?: string[];
  damage_resistances?: string[];
  damage_vulnerabilities?: string[];
}): NonNullable<ApplyTarget['defenses']> {
  const simple = (list?: string[]) =>
    (list ?? []).filter((t) => !/[,]| de /.test(t)).map((t) => normalizeDamageType(t));
  return {
    resistances: simple(block.damage_resistances),
    immunities: simple(block.damage_immunities),
    vulnerabilities: simple(block.damage_vulnerabilities),
    uncanny_dodge: false,
    evasion: false,
  };
}

/** Tipo de dano no formato das resistências ("Concussão" → "contundente", "venenoso" →
 *  "veneno"); mantém tipos compostos ("fogo + radiante"). */
export function normalizeDamageType(type: string | null | undefined): string {
  return (type ?? '')
    .trim()
    .toLowerCase()
    .replace(/concuss[ãa]o/g, 'contundente')
    .replace(/venenos[oa]/g, 'veneno')
    .replace(/[íi]gneo/g, 'fogo');
}

/** O alvo resiste a este dano? (qualquer tipo citado com resistência). */
export function resistsDamage(
  resistances: string[],
  damageType: string | null | undefined,
): string | null {
  const type = normalizeDamageType(damageType);
  return resistances.find((r) => type.includes(r)) ?? null;
}

export type ApplyKind = 'damage' | 'heal' | 'temp_hp';

export interface ApplyRequest {
  targetKey: string;
  amount: number;
  kind: ApplyKind;
  /** Aplicação dentro de um lançamento: a mesa mostra no aviso dele, sem aviso avulso. */
  castId?: string;
  /** Tipo do dano: no monstro, a API aplica imunidade/resistência/vulnerabilidade (1.24.4). */
  damageType?: string | null;
}
