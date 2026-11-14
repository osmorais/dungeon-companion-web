import { Spell } from '../models/character-options.interface';

/**
 * Magias de apoio: ao lançar, o jogador escolhe os alvos da mesa (pode incluir a si mesmo) e o
 * efeito fica guardado no personagem de cada um (`active_effects`). Bênção soma 1d4 sozinha em
 * todo ataque e resistência; Orientação/Resistência viram um botão num teste só; Armadura Arcana,
 * Escudo da Fé, Escudo Arcano (só em si), Pele de Árvore e Velocidade mexem na CA (calculada pela
 * API).
 *
 * Cópia de `SPELL_BOONS` / `spellBoonMaxTargets` da api
 * (`services/character-sheet/combat-features.ts`) — ao mudar um lado, mudar o outro e os testes.
 */
const SPELL_BOONS: Record<
  number,
  { name: string; level: number; targets: number; extraTargetsPerSlot?: number; selfOnly?: boolean }
> = {
  42: { name: 'Bênção', level: 1, targets: 3, extraTargetsPerSlot: 1 },
  247: { name: 'Orientação', level: 0, targets: 1 },
  305: { name: 'Resistência', level: 0, targets: 1 },
  25: { name: 'Armadura Arcana', level: 1, targets: 1 },
  146: { name: 'Escudo da Fé', level: 1, targets: 1 },
  145: { name: 'Escudo Arcano', level: 1, targets: 1, selfOnly: true },
  261: { name: 'Pele de Árvore', level: 2, targets: 1 },
  351: { name: 'Velocidade', level: 3, targets: 1 },
};

/** Escudo Arcano: só em quem lança (a escolha mostra só "você"). */
export function isSelfOnlyBoon(spell: Pick<Spell, 'id_spell'>): boolean {
  return !!SPELL_BOONS[spell.id_spell]?.selfOnly;
}

export function isSpellBoon(spell: Pick<Spell, 'id_spell'>): boolean {
  return spell.id_spell in SPELL_BOONS;
}

/** Quantos alvos no círculo escolhido (Bênção: +1 por círculo acima do 1º); 0 se não for dessas. */
export function spellBoonMaxTargets(spell: Pick<Spell, 'id_spell'>, slotLevel: number): number {
  const boon = SPELL_BOONS[spell.id_spell];
  if (!boon) return 0;
  if (boon.level === 0) return boon.targets;
  return boon.targets + (boon.extraTargetsPerSlot ?? 0) * Math.max(0, slotLevel - boon.level);
}
