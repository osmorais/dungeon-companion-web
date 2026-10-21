import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { AvatarDisplayComponent } from '../avatar-display/avatar-display.component';
import { ModalBurstComponent } from '../modal-burst/modal-burst.component';
import { AvatarPreset } from '../models/avatar-preset.interface';
import { hpColor, hpPercent } from '../session-panel/hp-display';

/** Quem aparece no aviso de troca de vez (jogador, NPC ou monstro, já com o nome que a mesa vê). */
export interface TurnCard {
  name: string;
  /** Foto do personagem (fundo do card) ou imagem do monstro. */
  imageUrl: string | null;
  avatarPreset: AvatarPreset | null;
  /** Jogador/NPC: dados do card inteiro, como na sessão. Ausente/`null` = monstro (só imagem e
   *  nome — o jogador não vê o PV do monstro). */
  character?: {
    /** `null` pra NPC. */
    playerName: string | null;
    className: string;
    race: string;
    level: number;
    hp: { current: number; max: number; temp: number };
  } | null;
}

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
  readonly hpPercent = hpPercent;
  readonly hpColor = hpColor;
}
