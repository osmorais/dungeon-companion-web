import { CharacterCardData } from '../character-card/character-card.component';
import { GameCardData } from '../game-card/game-card.model';
import { CastStageApplied, CastStageRoll, RollLogEntry } from '../models/game-session.interface';

/** Rolagem do lançamento já com os dados pra desenhar (dados em pixel art + total). */
export interface CastStageRollView {
  id: string;
  kind: CastStageRoll['kind'];
  outcome: CastStageRoll['outcome'];
  critical: boolean;
  rolls: number[];
  /** Lados de cada dado, na ordem de `rolls`. */
  sides: number[];
  modifier: number;
  total: number;
}

/**
 * O que aparece no aviso do lançamento — igual pra mesa (app-spell-cast-notice) e pra quem lança
 * (em cima das decisões, no modal de rolagem).
 */
export interface CastStageView {
  /** Id do lançamento (a animação de jogar a carta toca uma vez por lançamento). */
  key: string;
  actorName: string;
  /** "LANÇOU" (magia) ou "ATACOU COM" (arma). */
  verb: string;
  spellName: string;
  actor: CharacterCardData;
  card: GameCardData;
  rolls: CastStageRollView[];
  /** Magia de resistência: "CD 14 de Destreza". */
  saveNote: string | null;
  /** Dano/cura já aplicado nos alvos (no lugar do aviso avulso "APLICOU"). */
  applied: CastStageApplied[];
  /** Quem lança terminou: o aviso da mesa some sozinho depois de alguns segundos. */
  done: boolean;
}

/** "8 de dano em Goblin" — mesmo valor e tipo em vários alvos seguidos juntam os nomes. */
export function appliedLines(
  applied: CastStageApplied[],
): { text: string; kind: CastStageApplied['kind'] }[] {
  const groups: { amount: number; kind: CastStageApplied['kind']; labels: string[] }[] = [];
  for (const a of applied) {
    const last = groups[groups.length - 1];
    if (last && last.amount === a.amount && last.kind === a.kind) last.labels.push(a.label);
    else groups.push({ amount: a.amount, kind: a.kind, labels: [a.label] });
  }
  return groups.map(({ amount, kind, labels }) => {
    const what =
      amount === 0
        ? kind === 'damage'
          ? 'nenhum dano'
          : 'nenhuma cura'
        : kind === 'damage'
          ? `${amount} de dano`
          : kind === 'heal'
            ? `${amount} de cura`
            : `${amount} PV temporários`;
    return { text: `${what} em ${labels.join(', ')}`, kind };
  });
}

/** "2d6 + 1d8" com 3 dados → [6, 6, 8]; d20 com vantagem (2 dados, "1d20") repete o último. */
export function sidesFromNotation(notation: string, count: number): number[] {
  const sides: number[] = [];
  for (const [, n, s] of notation.matchAll(/(\d+)d(\d+)/g)) {
    for (let i = 0; i < Number(n); i++) sides.push(Number(s));
  }
  if (sides.length === 0) return Array.from({ length: count }, () => 20);
  while (sides.length < count) sides.push(sides[sides.length - 1]);
  return sides.slice(0, count);
}

/** Junta a referência do lançamento com a rolagem registrada (do histórico ou da resposta da API). */
export function castRollView(
  ref: CastStageRoll,
  entry: Pick<RollLogEntry, 'rolls' | 'dice_notation' | 'modifier' | 'total'>,
): CastStageRollView {
  return {
    id: ref.id_roll,
    kind: ref.kind,
    outcome: ref.outcome,
    critical: ref.critical,
    rolls: entry.rolls,
    sides: sidesFromNotation(entry.dice_notation, entry.rolls.length),
    modifier: entry.modifier,
    total: entry.total,
  };
}
