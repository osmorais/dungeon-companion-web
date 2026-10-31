import { Component, Input, signal } from '@angular/core';
import { GameCardData, GameCardState } from './game-card.model';

/**
 * Carta de card game (magia agora, arma depois). Só desenha: moldura do tema (`--card-face`) por
 * cima da arte, e o texto posicionado nas áreas da moldura (ver o SCSS). `mini` pra grades
 * (sem descrição, dois números ou `miniStats`); `full` pra tela cheia (app-card-viewer).
 */
@Component({
  selector: 'app-game-card',
  standalone: true,
  templateUrl: './game-card.component.html',
  styleUrls: ['./game-card.component.scss'],
})
export class GameCardComponent {
  @Input({ required: true }) card!: GameCardData;
  @Input() size: 'mini' | 'full' = 'mini';
  @Input() state: GameCardState = null;
  /** Quantos números a carta `mini` mostra no pergaminho (as listas do grimório mostram os 4). */
  @Input() miniStats = 2;

  /** Tela cheia: descrição expandida (o pergaminho cobre a arte pra caber o texto todo). */
  expanded = signal(false);

  toggleExpanded(event: Event): void {
    event.stopPropagation();
    this.expanded.update((v) => !v);
  }
}
