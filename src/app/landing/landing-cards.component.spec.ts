import { TestBed } from '@angular/core/testing';
import { SHOWCASE_DECKS, circularOffset } from './landing-cards';
import { LandingCardsComponent, SHOWCASE_AUTOPLAY_MS } from './landing-cards.component';

describe('vitrine de cartas — dados', () => {
  it('magias usam a arte da escola e as preparadas vêm prontas (brilho)', () => {
    const spells = SHOWCASE_DECKS.spells;
    expect(spells.length).toBeGreaterThanOrEqual(3);
    for (const s of spells)
      expect(s.card.art, s.card.title).toMatch(/^assets\/cards\/spell-school-[a-z]+\.webp$/);
    const fireball = spells.find((s) => s.card.title === 'Bola de Fogo')!;
    expect(fireball.state).toBe('ready');
    expect(fireball.card.tags).toEqual(['PREPARADA']);
    expect(fireball.card.badge).toBe('3');
    const cantrip = spells.find((s) => s.card.title === 'Toque Arrepiante')!;
    expect(cantrip.card.badge).toBe('T');
    expect(cantrip.state).toBeNull();
  });

  it('armas têm arte do catálogo e bônus/dano calculados', () => {
    const weapons = SHOWCASE_DECKS.weapons;
    expect(weapons.length).toBeGreaterThanOrEqual(3);
    for (const w of weapons)
      expect(w.card.art, w.card.title).toMatch(/^assets\/cards\/weapon-\d+\.webp$/);
    const axe = weapons.find((w) => w.card.title === 'Machado Grande')!;
    expect(axe.card.badge).toBe('+5');
    expect(axe.card.stats[0]).toEqual({ label: 'DANO', value: '1d12+3' });
    expect(axe.card.ribbon).toBe('MARCIAL · CORPO A CORPO');
  });

  it('chaves únicas em cada baralho (são a chave do @for)', () => {
    for (const deck of Object.values(SHOWCASE_DECKS)) {
      expect(new Set(deck.map((c) => c.key)).size).toBe(deck.length);
    }
  });

  it('posição circular: caminho mais curto até a carta da vez', () => {
    expect(circularOffset(0, 0, 5)).toBe(0);
    expect(circularOffset(1, 0, 5)).toBe(1);
    expect(circularOffset(4, 0, 5)).toBe(-1);
    expect(circularOffset(0, 4, 5)).toBe(1);
    expect(circularOffset(2, 0, 4)).toBe(2);
    expect(circularOffset(3, 0, 4)).toBe(-1);
    expect(circularOffset(0, 0, 0)).toBe(0);
  });
});

describe('LandingCardsComponent (carrossel)', () => {
  let lc: LandingCardsComponent;

  beforeEach(() => {
    vi.useFakeTimers();
    lc = TestBed.runInInjectionContext(() => new LandingCardsComponent());
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('começa nas magias, na primeira carta', () => {
    expect(lc.deck()).toBe('spells');
    expect(lc.index()).toBe(0);
    expect(lc.cards()).toBe(SHOWCASE_DECKS.spells);
  });

  it('▶ na última volta pra primeira e ◀ na primeira vai pra última', () => {
    const last = lc.cards().length - 1;
    lc.prev();
    expect(lc.index()).toBe(last);
    lc.next();
    expect(lc.index()).toBe(0);
  });

  it('trocar de baralho volta pra primeira carta; o mesmo baralho não mexe', () => {
    lc.select(2);
    lc.selectDeck('spells');
    expect(lc.index()).toBe(2);
    lc.selectDeck('weapons');
    expect(lc.cards()).toBe(SHOWCASE_DECKS.weapons);
    expect(lc.index()).toBe(0);
  });

  it('passa sozinho e espera enquanto a pessoa mexe na vitrine', () => {
    vi.advanceTimersByTime(SHOWCASE_AUTOPLAY_MS);
    expect(lc.index()).toBe(1);
    lc.pause(true);
    vi.advanceTimersByTime(SHOWCASE_AUTOPLAY_MS * 2);
    expect(lc.index()).toBe(1);
    lc.pause(false);
    vi.advanceTimersByTime(SHOWCASE_AUTOPLAY_MS);
    expect(lc.index()).toBe(2);
  });

  it('quando a pessoa troca de carta ou de baralho, a troca automática para de vez', () => {
    expect(lc.autoplay()).toBe(true);
    lc.next();
    expect(lc.autoplay()).toBe(false);
    vi.advanceTimersByTime(SHOWCASE_AUTOPLAY_MS * 3);
    expect(lc.index()).toBe(1);

    const other = TestBed.runInInjectionContext(() => new LandingCardsComponent());
    other.selectDeck('spells');
    expect(other.autoplay()).toBe(false);
  });

  it('aviso do leitor de tela diz a carta da vez; calado enquanto passa sozinho', () => {
    const first = SHOWCASE_DECKS.spells[0].card.title;
    expect(lc.status()).toBe(`Carta 1 de ${SHOWCASE_DECKS.spells.length}: ${first}`);
    lc.selectDeck('weapons');
    lc.select(1);
    expect(lc.status()).toBe(
      `Carta 2 de ${SHOWCASE_DECKS.weapons.length}: ${SHOWCASE_DECKS.weapons[1].card.title}`,
    );
  });

  it('para a troca automática ao sair da página', () => {
    TestBed.resetTestingModule();
    vi.advanceTimersByTime(SHOWCASE_AUTOPLAY_MS * 3);
    expect(lc.index()).toBe(0);
  });

  it('setas do teclado navegam; outras teclas não', () => {
    const key = (k: string) => {
      const e = new KeyboardEvent('keydown', { key: k, cancelable: true });
      lc.onKey(e);
      return e;
    };
    expect(key('ArrowRight').defaultPrevented).toBe(true);
    expect(lc.index()).toBe(1);
    key('ArrowLeft');
    expect(lc.index()).toBe(0);
    expect(key('Enter').defaultPrevented).toBe(false);
    expect(lc.index()).toBe(0);
  });

  it('arrastar mais de 50px troca de carta; toque curto não', () => {
    const swipe = (from: number, to: number) => {
      lc.onPointerDown({ clientX: from } as PointerEvent);
      lc.onPointerUp({ clientX: to } as PointerEvent);
    };
    swipe(200, 100);
    expect(lc.index()).toBe(1);
    swipe(100, 200);
    expect(lc.index()).toBe(0);
    swipe(100, 130);
    expect(lc.index()).toBe(0);
  });

  it('carta da vez no centro, a anterior à esquerda (circular)', () => {
    const last = lc.cards().length - 1;
    expect(lc.offset(0)).toBe(0);
    expect(lc.offset(last)).toBe(-1);
    expect(lc.zIndex(0)).toBeGreaterThan(lc.zIndex(1));
  });
});
