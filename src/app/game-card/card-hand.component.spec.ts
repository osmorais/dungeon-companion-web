import { TestBed } from '@angular/core/testing';
import { CardHandComponent, HandCard } from './card-hand.component';

const card = (key: string): HandCard => ({
  key,
  card: {
    title: key,
    badge: '',
    art: null,
    fallbackIcon: '',
    artBackground: null,
    ribbon: '',
    stats: [],
    text: null,
    tags: [],
  },
});

describe('CardHandComponent (a "mão")', () => {
  let hand: CardHandComponent;

  beforeEach(() => {
    hand = TestBed.runInInjectionContext(() => new CardHandComponent());
    hand.items = [card('a'), card('b'), card('c')];
    hand.ngOnChanges();
  });

  it('começa na primeira; ◀ ▶ andam sem passar das pontas', () => {
    expect(hand.current()?.key).toBe('a');
    hand.prev();
    expect(hand.index()).toBe(0);
    hand.next();
    hand.next();
    hand.next();
    expect(hand.current()?.key).toBe('c');
  });

  it('carrossel: posição de cada carta em relação à da vez', () => {
    hand.select(1);
    expect([0, 1, 2].map((i) => hand.offset(i))).toEqual([-1, 0, 1]);
    expect(hand.zIndex(1)).toBeGreaterThan(hand.zIndex(0));
  });

  it('teclado: setas trocam, Esc fecha', () => {
    const closed = vi.fn();
    hand.closed.subscribe(closed);
    hand.onKey(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(hand.index()).toBe(1);
    hand.onKey(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(hand.index()).toBe(0);
    hand.onKey(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closed).toHaveBeenCalled();
  });

  it('arrastar pro lado troca de carta (mais de 50px)', () => {
    hand.onPointerDown({ clientX: 300 } as PointerEvent);
    hand.onPointerUp({ clientX: 200 } as PointerEvent);
    expect(hand.index()).toBe(1);
    hand.onPointerDown({ clientX: 200 } as PointerEvent);
    hand.onPointerUp({ clientX: 230 } as PointerEvent);
    expect(hand.index()).toBe(1);
  });

  it('se a mão encolher, a carta da vez continua válida', () => {
    hand.select(2);
    hand.items = [card('a')];
    hand.ngOnChanges();
    expect(hand.current()?.key).toBe('a');
  });

  describe('clique fora fecha', () => {
    function clickOn(el: Element): Event {
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: el });
      return event;
    }

    it('fundo ou espaço vazio fecha; botão e carta não', () => {
      const closed = vi.fn();
      hand.closed.subscribe(closed);
      const slot = document.createElement('div');
      slot.className = 'hand-slot';
      const inside = document.createElement('span');
      slot.appendChild(inside);
      hand.onBackdropClick(clickOn(document.createElement('button')));
      hand.onBackdropClick(clickOn(inside));
      expect(closed).not.toHaveBeenCalled();
      hand.onBackdropClick(clickOn(document.createElement('div')));
      expect(closed).toHaveBeenCalledTimes(1);
    });

    it('o clique que vem depois de arrastar pro lado não fecha', () => {
      vi.useFakeTimers();
      const closed = vi.fn();
      hand.closed.subscribe(closed);
      hand.onPointerDown({ clientX: 300 } as PointerEvent);
      hand.onPointerUp({ clientX: 100 } as PointerEvent);
      hand.onBackdropClick(clickOn(document.createElement('div')));
      expect(closed).not.toHaveBeenCalled();
      vi.runAllTimers();
      hand.onBackdropClick(clickOn(document.createElement('div')));
      expect(closed).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });
  });
});
