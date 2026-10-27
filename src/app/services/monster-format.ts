/** Formatação dos campos da ficha de monstro (bestiário do livro e fichas antigas da dnd5eapi). */

/** "terrestre: 6 m, voo: 15 m, pairar" — `pairar: true` vira só a palavra. */
export function monsterSpeedText(speed: Record<string, string | boolean> | undefined): string {
  return Object.entries(speed ?? {})
    .filter(([, value]) => value !== false)
    .map(([key, value]) => (value === true ? key : `${key}: ${value}`))
    .join(', ');
}

const CR_FRACTIONS: Record<number, string> = { 0.125: '1/8', 0.25: '1/4', 0.5: '1/2' };

/** Nível de desafio como no livro: 0.25 → "1/4". */
export function challengeRatingText(cr: number | string | undefined | null): string {
  if (cr === undefined || cr === null || cr === '') return '—';
  const n = Number(cr);
  return CR_FRACTIONS[n] ?? String(n);
}

/** Minúsculas e sem acento, pra busca por nome ("dragao" acha "Dragão"). */
export function normalizeSearch(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** ND 5+ é ameaça de verdade pra um grupo iniciante — ganha destaque dourado no card/ficha. */
export const THREAT_CHALLENGE_RATING = 5;

export function isHighThreat(cr: number): boolean {
  return cr >= THREAT_CHALLENGE_RATING;
}

/** Nome do monstro catalogado: o apelido do mestre ou o da ficha (lista e detalhe do bestiário). */
export function catalogMonsterName(monster: {
  custom_name?: string | null;
  data_snapshot: { name: string };
}): string {
  return monster.custom_name ?? monster.data_snapshot.name;
}
