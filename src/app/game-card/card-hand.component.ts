import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  TemplateRef,
  computed,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { GameCardComponent } from './game-card.component';
import { GameCardData, GameCardState } from './game-card.model';

export interface HandCard {
  /** Identifica a carta pra os botões (ex.: id da arma/magia). */
  key: string;
  card: GameCardData;
  state?: GameCardState;
}

/**
 * A "mão" em tela cheia (como em card games): a carta da vez grande no centro, as vizinhas
 * menores e inclinadas dos lados (carrossel), os botões da carta da vez embaixo dela (template
 * passado por quem abre, com a `key` da carta) e todas as cartas em leque na base. Navega por
 * ◀ ▶, setas do teclado, arrastando pro lado ou tocando numa carta. Fecha pelo "◀ VOLTAR", pelo
 * fundo ou com Esc.
 *
 * Camada 190 (como a carta em tela cheia): acima da gaveta, abaixo do modal de rolagem.
 */
@Component({
  selector: 'app-card-hand',
  standalone: true,
  imports: [GameCardComponent, NgTemplateOutlet],
  templateUrl: './card-hand.component.html',
  styleUrls: ['./card-hand.component.scss'],
})
export class CardHandComponent implements OnChanges {
  @Input({ required: true }) items: HandCard[] = [];
  @Input() title = '';
  @Input() backLabel = 'VOLTAR';
  /** Botões da carta da vez; recebe a `key` como `$implicit`. */
  @Input() actions: TemplateRef<unknown> | null = null;
  @Output() closed = new EventEmitter<void>();

  index = signal(0);
  private count = signal(0);
  current = computed(() => this.items[Math.min(this.index(), this.count() - 1)] ?? null);
  private swipeStartX: number | null = null;
  /** Acabou de arrastar pro lado: o "clique" que vem junto não fecha a mão. */
  private justSwiped = false;

  ngOnChanges(): void {
    this.count.set(this.items.length);
    // A lista pode encolher (ex.: magia despreparada): a carta da vez continua válida.
    if (this.index() > this.items.length - 1) this.index.set(Math.max(0, this.items.length - 1));
  }

  select(i: number): void {
    if (i >= 0 && i < this.items.length) this.index.set(i);
  }

  prev(): void {
    this.select(this.index() - 1);
  }

  next(): void {
    this.select(this.index() + 1);
  }

  /** Posição relativa à carta da vez (−2, −1, 0, 1, 2…) — o carrossel desenha por isso. */
  offset(i: number): number {
    return i - this.index();
  }

  zIndex(i: number): number {
    return 50 - Math.abs(this.offset(i));
  }

  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') this.closed.emit();
    else if (event.key === 'ArrowLeft') this.prev();
    else if (event.key === 'ArrowRight') this.next();
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
    this.justSwiped = true;
    setTimeout(() => (this.justSwiped = false));
  }

  /**
   * Clique em qualquer lugar que não seja botão ou carta fecha a mão (fundo, espaço entre os
   * botões, laterais do carrossel, o leque fora das cartas). Arrastar pro lado não conta.
   */
  onBackdropClick(event: Event): void {
    if (this.justSwiped) return;
    const target = event.target as Element | null;
    if (target?.closest('button, a, input, select, textarea, .hand-slot')) return;
    this.closed.emit();
  }
}
