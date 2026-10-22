import { Component, EventEmitter, Input, Output } from '@angular/core';
import { GameCardComponent } from './game-card.component';
import { GameCardData } from './game-card.model';

/**
 * Baralho: as cartas empilhadas (a de cima à mostra, duas por baixo levemente tortas), com o nome
 * e a quantidade. Tocar abre a "mão" em tela cheia (app-card-hand). Usado na gaveta de ações pras
 * armas e pras magias prontas.
 */
@Component({
  selector: 'app-card-deck',
  standalone: true,
  imports: [GameCardComponent],
  template: `
    <button
      type="button"
      class="deck"
      [disabled]="cards.length === 0"
      [attr.aria-label]="'Abrir a mão: ' + label + ' (' + cards.length + ')'"
      (click)="open.emit()"
    >
      <span class="deck-pile">
        @for (card of pile(); track $index; let i = $index) {
          <app-game-card class="deck-card" [class]="'deck-card--' + i" [card]="card" size="mini" />
        }
        @if (cards.length === 0) {
          <span class="deck-empty">VAZIO</span>
        }
      </span>
      <span class="deck-label">{{ label }} · {{ cards.length }}</span>
      @if (cards.length > 0) {
        <span class="deck-hint">ABRIR MÃO ▶</span>
      }
    </button>
  `,
  styles: `
    .deck {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 12px 8px 10px;
      border: 2px solid var(--border-color);
      background: rgba(0, 0, 0, 0.25);
      color: var(--text-color);
      font-family: inherit;
      cursor: var(--cp);
      transition: border-color 0.15s;
    }

    .deck:hover:not(:disabled) {
      border-color: var(--accent-color);
    }

    .deck:hover:not(:disabled) .deck-card--0 {
      transform: translateY(-6px);
    }

    .deck:disabled {
      opacity: 0.6;
      cursor: var(--cx);
    }

    /* Pilha: até 3 cartas, a primeira por cima; as de baixo deslocadas e tortas. */
    .deck-pile {
      position: relative;
      display: block;
      width: 120px;
      aspect-ratio: 760 / 1064;
    }

    .deck-card {
      position: absolute;
      inset: 0;
      transition: transform 0.15s;
    }

    .deck-card--0 {
      z-index: 3;
    }

    .deck-card--1 {
      z-index: 2;
      transform: translate(10px, 4px) rotate(6deg);
      filter: brightness(0.7);
    }

    .deck-card--2 {
      z-index: 1;
      transform: translate(-10px, 6px) rotate(-7deg);
      filter: brightness(0.55);
    }

    .deck-empty {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px dashed var(--border-color);
      font-size: 7px;
      color: var(--label-title-color);
    }

    .deck-label {
      font-size: 8px;
      color: var(--accent-color);
    }

    .deck-hint {
      font-size: 6px;
      color: var(--label-title-color);
    }
  `,
})
export class CardDeckComponent {
  @Input({ required: true }) cards: GameCardData[] = [];
  @Input() label = '';
  @Output() open = new EventEmitter<void>();

  /** Até 3 cartas na pilha — a primeira fica por cima. */
  pile(): GameCardData[] {
    return this.cards.slice(0, 3);
  }
}
