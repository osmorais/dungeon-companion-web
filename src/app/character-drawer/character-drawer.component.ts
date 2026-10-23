import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AvatarDisplayComponent } from '../avatar-display/avatar-display.component';
import { AvatarPreset } from '../models/avatar-preset.interface';

/**
 * Jogador: barra AÇÕES DE PERSONAGEM presa na base da tela (como a do Quadro do Mestre). Tocar
 * abre direto a gaveta de ações do próprio personagem (PlayerActionsModalComponent), que tem no
 * destaque finalizar/atrasar turno, ficha e itens — sem tela intermediária.
 */
@Component({
  selector: 'app-character-drawer',
  standalone: true,
  imports: [AvatarDisplayComponent],
  template: `
    <button
      class="bottom-drawer-bar bottom-drawer-bar--avatar"
      aria-expanded="false"
      (click)="open.emit()"
    >
      <!-- Avatar do personagem com o anel, à esquerda da barra -->
      <span class="bottom-drawer-avatar avatar-ring-wrap" aria-hidden="true">
        <span class="bottom-drawer-avatar-circle"><app-avatar-display [preset]="avatarPreset" /></span>
        <span class="avatar-ring"></span>
      </span>
      <span class="bottom-drawer-bar-label">
        <span class="bottom-drawer-arrow">▲</span>
        <img class="ui-icon" src="assets/icons/actions.png" alt="" /> AÇÕES DE PERSONAGEM
      </span>
      <span class="bottom-drawer-hint">TOQUE PARA ABRIR</span>
    </button>
  `,
  styleUrls: ['../bottom-drawer/bottom-drawer.scss'],
})
export class CharacterDrawerComponent {
  @Input() avatarPreset: AvatarPreset | null = null;
  @Output() open = new EventEmitter<void>();
}
