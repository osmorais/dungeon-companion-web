import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { GameCardComponent } from '../game-card/game-card.component';
import { SHOWCASE_DECKS, ShowcaseDeck, circularOffset } from './landing-cards';

/** Intervalo da troca automática de carta. */
export const SHOWCASE_AUTOPLAY_MS = 5000;

/**
 * Vitrine das cartas de magia e arma na tela inicial: carrossel circular com a carta da vez grande
 * e as vizinhas inclinadas (como a "mão" da sessão, `app-card-hand`, só que dentro da página).
 * Passa sozinho; espera com o mouse em cima ou com o foco dentro, e para de vez quando a pessoa
 * troca de carta ou de baralho (ou com "reduzir movimento" ligado) — quem está lendo uma carta não
 * a vê sumir.
 */
@Component({
  selector: 'app-landing-cards',
  standalone: true,
  imports: [GameCardComponent],
  templateUrl: './landing-cards.component.html',
  styleUrls: ['./landing-cards.component.scss'],
})
export class LandingCardsComponent {
  readonly decks: { key: ShowcaseDeck; label: string }[] = [
    { key: 'spells', label: 'MAGIAS' },
    { key: 'weapons', label: 'ARMAS' },
  ];

  deck = signal<ShowcaseDeck>('spells');
  index = signal(0);
  cards = computed(() => SHOWCASE_DECKS[this.deck()]);
  /** Troca automática ligada (desliga de vez quando a pessoa mexe). */
  autoplay = signal(false);
  /** Texto do aviso pro leitor de tela ("Carta 2 de 5: Bola de Fogo"). */
  status = computed(
    () =>
      `Carta ${this.index() + 1} de ${this.cards().length}: ${this.cards()[this.index()]?.card.title ?? ''}`,
  );
  /** Mouse em cima / foco dentro: a troca automática espera. */
  private paused = signal(false);
  private swipeStartX: number | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (!prefersReducedMotion()) {
      this.autoplay.set(true);
      this.timer = setInterval(() => this.tick(), SHOWCASE_AUTOPLAY_MS);
    }
    inject(DestroyRef).onDestroy(() => this.stopAutoplay());
  }

  /** Troca automática: avança, a não ser que a pessoa esteja mexendo na vitrine. */
  tick(): void {
    if (this.autoplay() && !this.paused()) this.go(this.index() + 1);
  }

  pause(paused: boolean): void {
    this.paused.set(paused);
  }

  stopAutoplay(): void {
    this.autoplay.set(false);
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  selectDeck(deck: ShowcaseDeck): void {
    this.stopAutoplay();
    if (deck === this.deck()) return;
    this.deck.set(deck);
    this.index.set(0);
  }

  /** Escolha da pessoa (seta, bolinha, carta vizinha, teclado, arrasto). */
  select(i: number): void {
    this.stopAutoplay();
    this.go(i);
  }

  prev(): void {
    this.select(this.index() - 1);
  }

  next(): void {
    this.select(this.index() + 1);
  }

  private go(i: number): void {
    const count = this.cards().length;
    if (count === 0) return;
    this.index.set(((i % count) + count) % count);
  }

  offset(i: number): number {
    return circularOffset(i, this.index(), this.cards().length);
  }

  zIndex(i: number): number {
    return 50 - Math.abs(this.offset(i));
  }

  onKey(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') this.prev();
    else if (event.key === 'ArrowRight') this.next();
    else return;
    event.preventDefault();
  }

  onPointerDown(event: PointerEvent): void {
    this.swipeStartX = event.clientX;
  }

  /** Arrastar pro lado (celular): mais de 50px troca de carta. */
  onPointerUp(event: PointerEvent): void {
    if (this.swipeStartX === null) return;
    const delta = event.clientX - this.swipeStartX;
    this.swipeStartX = null;
    if (Math.abs(delta) <= 50) return;
    if (delta > 0) this.prev();
    else this.next();
  }
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}
