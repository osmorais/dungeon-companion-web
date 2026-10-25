/**
 * Animação de troca de vez no combate: um marcador do tamanho do card desliza do participante que
 * estava jogando até o próximo na lista de iniciativa, e o card de destino pulsa ao receber a vez.
 * As posições dos cards ficam guardadas relativas à lista (`snapshotTurnOffsets`) depois de cada
 * renderização — ao atrasar o turno a lista reordena antes da animação, e o marcador precisa sair
 * de onde o card estava.
 */

/** Atributo que marca cada card da lista de iniciativa com o id do participante. */
export const TURN_ID_ATTR = 'data-turn-id';
export const TURN_SLIDE_MS = 650;
export const TURN_ARRIVE_CLASS = 'turn-arrive';

export interface TurnOffset {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface TurnState {
  encounterId: string | null;
  currentId: string | null;
}

/** Anima só quando a vez passa de um participante pra outro no mesmo combate ativo. */
export function shouldAnimateTurn(previous: TurnState, next: TurnState): boolean {
  return (
    !!previous.currentId &&
    !!next.currentId &&
    previous.currentId !== next.currentId &&
    previous.encounterId !== null &&
    previous.encounterId === next.encounterId
  );
}

/** Posição de cada card relativa à lista (não muda com a rolagem da página). */
export function snapshotTurnOffsets(list: HTMLElement | null): Map<string, TurnOffset> {
  const offsets = new Map<string, TurnOffset>();
  if (!list) return offsets;
  const base = list.getBoundingClientRect();
  list.querySelectorAll<HTMLElement>(`[${TURN_ID_ATTR}]`).forEach((el) => {
    const r = el.getBoundingClientRect();
    offsets.set(el.getAttribute(TURN_ID_ATTR)!, {
      top: r.top - base.top,
      left: r.left - base.left,
      width: r.width,
      height: r.height,
    });
  });
  return offsets;
}

/** Retângulo na tela (pra um elemento `position: fixed`) a partir da posição relativa à lista. */
export function toViewportRect(list: DOMRect, offset: TurnOffset): TurnOffset {
  return {
    top: list.top + offset.top,
    left: list.left + offset.left,
    width: offset.width,
    height: offset.height,
  };
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Desliza o marcador de `from` (posição antiga, relativa à lista) até o card `toId`. Sem
 * suporte a `Element.animate` (ou com movimento reduzido), só pulsa o card de destino.
 */
export function playTurnSlide(list: HTMLElement, from: TurnOffset | undefined, toId: string): void {
  const target = list.querySelector<HTMLElement>(`[${TURN_ID_ATTR}="${toId}"]`);
  if (!target) return;
  const pulse = () => {
    target.classList.remove(TURN_ARRIVE_CLASS);
    void target.offsetWidth; // reinicia a animação se a classe já estava
    target.classList.add(TURN_ARRIVE_CLASS);
    setTimeout(() => target.classList.remove(TURN_ARRIVE_CLASS), TURN_SLIDE_MS + 400);
  };
  if (!from || prefersReducedMotion() || typeof document.body.animate !== 'function') {
    pulse();
    return;
  }

  const base = list.getBoundingClientRect();
  const start = toViewportRect(base, from);
  const r = target.getBoundingClientRect();
  const ghost = document.createElement('div');
  ghost.className = 'turn-slide-ghost';
  ghost.setAttribute('aria-hidden', 'true');
  Object.assign(ghost.style, {
    top: `${start.top}px`,
    left: `${start.left}px`,
    width: `${start.width}px`,
    height: `${start.height}px`,
  });
  document.body.appendChild(ghost);
  const animation = ghost.animate(
    [
      {
        transform: 'translate(0, 0)',
        width: `${start.width}px`,
        height: `${start.height}px`,
        opacity: 1,
      },
      {
        transform: `translate(${r.left - start.left}px, ${r.top - start.top}px)`,
        width: `${r.width}px`,
        height: `${r.height}px`,
        opacity: 1,
        offset: 0.85,
      },
      {
        transform: `translate(${r.left - start.left}px, ${r.top - start.top}px)`,
        width: `${r.width}px`,
        height: `${r.height}px`,
        opacity: 0,
      },
    ],
    { duration: TURN_SLIDE_MS, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' },
  );
  const done = () => {
    ghost.remove();
    pulse();
  };
  animation.onfinish = done;
  animation.oncancel = () => ghost.remove();
}

/** Contagem de iniciativa das ações de covil (perde os empates: vem depois de quem tirou 20). */
export const LAIR_INITIATIVE = 20;

/** Vez no combate pra conta do covil: iniciativa de quem joga e a rodada. */
export interface LairPoint {
  initiative: number;
  round: number;
}

/**
 * A vez que começa (`next`) passou pela contagem 20 desde a anterior (`prev`, `null` no início do
 * combate)? Na mesma rodada, quando sai de quem tem 20 ou mais pra quem tem menos; na virada de
 * rodada, quando ninguém tem 20 (a de covil abre a rodada) ou quando todos têm (fechou a anterior).
 */
export function crossedLairCount(prev: LairPoint | null, next: LairPoint): boolean {
  if (!prev || prev.round !== next.round) {
    return (
      next.initiative < LAIR_INITIATIVE || (prev !== null && prev.initiative >= LAIR_INITIATIVE)
    );
  }
  return prev.initiative >= LAIR_INITIATIVE && next.initiative < LAIR_INITIATIVE;
}
