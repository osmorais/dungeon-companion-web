import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { AvatarDisplayComponent } from '../avatar-display/avatar-display.component';
import { ModalBurstComponent } from '../modal-burst/modal-burst.component';
import { AvatarPreset } from '../models/avatar-preset.interface';

/** Quem aparece no aviso de troca de vez (jogador, NPC ou monstro, já com o nome que a mesa vê). */
export interface TurnCard {
  name: string;
  /** Foto do personagem ou imagem do monstro — tem preferência sobre o avatar. */
  imageUrl: string | null;
  avatarPreset: AvatarPreset | null;
}

export const TURN_CHANGE_TOAST_MS = 2600;

/**
 * Aviso em tela cheia pra mesa quando a vez passa no combate: o card de quem jogou sai deslizando
 * pra esquerda e o de quem vai jogar entra no centro, com "VEZ DE …" e a rodada. Some sozinho
 * (TURN_CHANGE_TOAST_MS) ou com um clique.
 */
@Component({
  selector: 'app-turn-change-toast',
  standalone: true,
  imports: [AvatarDisplayComponent, ModalBurstComponent, NgTemplateOutlet],
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
