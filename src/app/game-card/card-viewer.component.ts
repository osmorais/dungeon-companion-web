import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { GameCardComponent } from './game-card.component';
import { GameCardData, GameCardState } from './game-card.model';

/**
 * Carta em tela cheia (substitui os modais de detalhe de magia; depois, de arma). A carta grande
 * no centro e, embaixo dela, os botões que cada tela passa por projeção (`<app-card-viewer>
 * botões </app-card-viewer>`). Fecha pelo "◀ VOLTAR", pelo fundo ou com Esc — a tela de trás
 * (grimório, ações, catálogo, ficha) continua aberta.
 *
 * Camada 190: acima das gavetas (146) e abaixo do modal de rolagem (200) — quem lança uma magia
 * daqui fecha a carta antes de abrir a rolagem.
 */
@Component({
  selector: 'app-card-viewer',
  standalone: true,
  imports: [GameCardComponent],
  template: `
    <div class="cv-backdrop" (click)="closed.emit()">
      <button class="cv-back" (click)="closed.emit()">◀ {{ backLabel }}</button>
      <div
        class="cv-card"
        role="dialog"
        [attr.aria-label]="card.title"
        (click)="$event.stopPropagation()"
      >
        <app-game-card [card]="card" size="full" [state]="state" />
      </div>
      <div class="cv-actions" (click)="$event.stopPropagation()">
        <ng-content />
      </div>
    </div>
  `,
  styleUrls: ['./card-viewer.component.scss'],
})
export class CardViewerComponent {
  @Input({ required: true }) card!: GameCardData;
  @Input() state: GameCardState = null;
  @Input() backLabel = 'VOLTAR';
  @Output() closed = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closed.emit();
  }
}
