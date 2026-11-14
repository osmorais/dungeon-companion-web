import { MonsterSpellEffects } from '../models/game-session.interface';

/**
 * Penalidades de magia no monstro da sessão (1.26.0) — cópia de `SPELL_MONSTER_EFFECT` e
 * `MONSTER_SPELL_EFFECT_KEYS` da api (`services/monster-spell-effects.ts`); ao mudar um lado, mudar
 * o outro e os testes.
 */
export type MonsterSpellEffectKey = keyof MonsterSpellEffects;

export const MONSTER_SPELL_EFFECT_KEYS: readonly MonsterSpellEffectKey[] = [
  'bane',
  'faerie_fire',
  'guiding_bolt',
  'vicious_mockery',
  'enfeebled',
];

/** Magia → penalidade que fica no monstro que falhar na resistência (Raio Guiador: ao acertar). */
export const SPELL_MONSTER_EFFECT: Record<number, MonsterSpellEffectKey> = {
  264: 'bane', // Perdição
  164: 'faerie_fire', // Fogo das Fadas
  290: 'guiding_bolt', // Raio Guiador
  361: 'vicious_mockery', // Zombaria Viciosa
  289: 'enfeebled', // Raio do Enfraquecimento
};

export const MONSTER_EFFECT_LABELS: Record<MonsterSpellEffectKey, { name: string; what: string }> =
  {
    bane: { name: 'Perdição', what: '−1d4 nos ataques e resistências' },
    faerie_fire: { name: 'Fogo das Fadas', what: 'ataques contra ele com vantagem' },
    guiding_bolt: { name: 'Raio Guiador', what: 'próximo ataque contra ele com vantagem' },
    vicious_mockery: { name: 'Zombaria Viciosa', what: 'desvantagem no próximo ataque dele' },
    enfeebled: { name: 'Raio do Enfraquecimento', what: 'metade do dano com arma de Força' },
  };

/**
 * Magias de resistência sem dano que deixam a penalidade (Perdição, Fogo das Fadas, Raio do
 * Enfraquecimento): ao lançar, o jogador marca os monstros e o pedido de resistência vai pro
 * mestre. `null` = sem limite (área).
 */
export const MONSTER_CURSE_SPELLS: Record<
  number,
  { level: number; targets: number | null; extraTargetsPerSlot?: number }
> = {
  264: { level: 1, targets: 3, extraTargetsPerSlot: 1 },
  164: { level: 1, targets: null },
  289: { level: 2, targets: 1 },
};

export function monsterCurseMaxTargets(idSpell: number, slotLevel: number): number | null {
  const curse = MONSTER_CURSE_SPELLS[idSpell];
  if (!curse || curse.targets === null) return null;
  return curse.targets + (curse.extraTargetsPerSlot ?? 0) * Math.max(0, slotLevel - curse.level);
}

/** Vantagens de quem ataca este monstro (Fogo das Fadas, Raio Guiador). */
export function advantageAgainst(effects: MonsterSpellEffects | null | undefined): string[] {
  const list: string[] = [];
  if (effects?.faerie_fire) list.push('Vantagem (Fogo das Fadas)');
  if (effects?.guiding_bolt) list.push('Vantagem (Raio Guiador)');
  return list;
}

/** Lista pra mostrar ao mestre (gaveta do monstro). */
export function monsterEffectList(
  effects: MonsterSpellEffects | null | undefined,
): { key: MonsterSpellEffectKey; label: string }[] {
  return MONSTER_SPELL_EFFECT_KEYS.flatMap((key) => {
    const effect = effects?.[key];
    if (!effect) return [];
    const { name, what } = MONSTER_EFFECT_LABELS[key];
    return [{ key, label: `${name} de ${effect.from} (${what})` }];
  });
}
