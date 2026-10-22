import { Component, EventEmitter, Output } from '@angular/core';

/**
 * Jogador: barra AÇÕES DE PERSONAGEM presa na base da tela (como a do Quadro do Mestre). Tocar
 * abre direto a gaveta de ações do próprio personagem (PlayerActionsModalComponent), que tem no
 * destaque finalizar/atrasar turno, ficha e itens — sem tela intermediária.
 */
@Component({
  selector: 'app-character-drawer',
  standalone: true,
  template: `
    <button class="bottom-drawer-bar" aria-expanded="false" (click)="open.emit()">
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
  @Output() open = new EventEmitter<void>();
}
