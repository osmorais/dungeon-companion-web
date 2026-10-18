import {
  TURN_ARRIVE_CLASS,
  TURN_ID_ATTR,
  playTurnSlide,
  shouldAnimateTurn,
  snapshotTurnOffsets,
  toViewportRect,
} from './turn-transition';

function rect(top: number, left: number, width = 200, height = 30): DOMRect {
  return {
    top,
    left,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
  } as DOMRect;
}

/** Lista com cards em posições fixas (jsdom não calcula layout). */
function list(positions: Record<string, number>, base = rect(100, 10, 220, 300)) {
  const el = document.createElement('div');
  el.getBoundingClientRect = () => base;
  for (const [id, top] of Object.entries(positions)) {
    const card = document.createElement('div');
    card.setAttribute(TURN_ID_ATTR, id);
    card.getBoundingClientRect = () => rect(base.top + top, base.left + 10);
    el.appendChild(card);
  }
  document.body.appendChild(el);
  return el;
}

describe('turn-transition', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('anima só quando a vez passa pra outro participante no mesmo combate', () => {
    const s = (encounterId: string | null, currentId: string | null) => ({
      encounterId,
      currentId,
    });
    expect(shouldAnimateTurn(s('e1', 'a'), s('e1', 'b'))).toBe(true);
    expect(shouldAnimateTurn(s('e1', 'a'), s('e1', 'a'))).toBe(false); // mesma vez
    expect(shouldAnimateTurn(s(null, null), s('e1', 'a'))).toBe(false); // combate começando
    expect(shouldAnimateTurn(s('e1', 'a'), s('e1', null))).toBe(false); // combate acabou
    expect(shouldAnimateTurn(s('e1', 'a'), s('e2', 'b'))).toBe(false); // outro combate
  });

  it('guarda a posição dos cards relativa à lista e converte pra tela', () => {
    const el = list({ a: 0, b: 40 });
    const offsets = snapshotTurnOffsets(el);
    expect(offsets.get('b')).toEqual({ top: 40, left: 10, width: 200, height: 30 });
    expect(snapshotTurnOffsets(null).size).toBe(0);
    // a página rolou: a lista subiu 50px, o card continua no mesmo lugar dentro dela
    expect(toViewportRect(rect(50, 10, 220, 300), offsets.get('b')!)).toEqual({
      top: 90,
      left: 20,
      width: 200,
      height: 30,
    });
  });

  it('sem animação no navegador: só pulsa o card que recebe a vez', () => {
    vi.useFakeTimers();
    const el = list({ a: 0, b: 40 });
    // jsdom não tem Element.animate — mesmo caminho de um navegador sem Web Animations
    playTurnSlide(el, { top: 0, left: 10, width: 200, height: 30 }, 'b');
    const target = el.querySelector(`[${TURN_ID_ATTR}="b"]`)!;
    expect(target.classList.contains(TURN_ARRIVE_CLASS)).toBe(true);
    expect(document.querySelector('.turn-slide-ghost')).toBeNull();
    vi.advanceTimersByTime(2000);
    expect(target.classList.contains(TURN_ARRIVE_CLASS)).toBe(false);
  });

  it('desliza o marcador do card antigo até o novo e some ao terminar', () => {
    const el = list({ a: 0, b: 80 });
    const fake = { onfinish: null as null | (() => void), oncancel: null };
    const animateSpy = vi.fn((_frames: Keyframe[], _options?: unknown) => fake);
    // jsdom não tem Web Animations: define só pra este teste.
    const proto = Element.prototype as unknown as { animate?: unknown };
    const original = proto.animate;
    proto.animate = animateSpy;
    onTestFinished(() => {
      proto.animate = original;
    });
    playTurnSlide(el, { top: 0, left: 10, width: 200, height: 30 }, 'b');
    const ghost = document.querySelector<HTMLElement>('.turn-slide-ghost')!;
    expect(ghost).not.toBeNull();
    expect(ghost.style.top).toBe('100px');
    const frames = animateSpy.mock.calls[0][0];
    expect(frames[1]['transform']).toBe('translate(0px, 80px)');
    fake.onfinish!();
    expect(document.querySelector('.turn-slide-ghost')).toBeNull();
    expect(el.querySelector(`[${TURN_ID_ATTR}="b"]`)!.classList.contains(TURN_ARRIVE_CLASS)).toBe(
      true,
    );
  });

  it('card de destino que não existe: não faz nada', () => {
    const el = list({ a: 0 });
    playTurnSlide(el, { top: 0, left: 0, width: 1, height: 1 }, 'x');
    expect(document.querySelector('.turn-slide-ghost')).toBeNull();
  });
});
