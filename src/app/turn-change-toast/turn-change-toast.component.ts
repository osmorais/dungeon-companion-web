import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CharacterCardComponent, CharacterCardData } from '../character-card/character-card.component';
import { ModalBurstComponent } from '../modal-burst/modal-burst.component';

/** Quem aparece no aviso de troca de vez (o card é o `app-character-card`). */
export type TurnCard = CharacterCardData;

export const TURN_CHANGE_TOAST_MS = 2600;

/**
 * Aviso em tela cheia pra mesa quando a vez passa no combate: o card inteiro de quem jogou (como
 * na sessão, com moldura) sai deslizando pra esquerda e o de quem vai jogar entra no centro, com
 * "VEZ DE …" e a rodada. Some sozinho
 * (TURN_CHANGE_TOAST_MS) ou com um clique.
 */
@Component({
  selector: 'app-turn-change-toast',
  standalone: true,
  imports: [CharacterCardComponent, ModalBurstComponent],
  templateUrl: './turn-change-toast.component.html',
  styleUrls: ['./turn-change-toast.component.scss'],
})
export class TurnChangeToastComponent {
  @Input() from: TurnCard | null = null;
  @Input({ required: true }) to!: TurnCard;
  @Input() round = 1;
  /** A vez é de quem está olhando — "É A SUA VEZ!". */
  @Input() isMine = false;
  @Output() closed = new EventEmitter<void>();

  readonly durationMs = TURN_CHANGE_TOAST_MS;
}
