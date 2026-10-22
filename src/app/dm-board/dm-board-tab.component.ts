import { Component, EventEmitter, Output } from '@angular/core';

/** Quadro do Mestre recolhido: a barra presa na base da tela (bottom-drawer.scss). Expande a gaveta. */
@Component({
  selector: 'app-dm-board-tab',
  standalone: true,
  template: `
    <button
      class="bottom-drawer-bar"
      title="Expandir o quadro do mestre"
      aria-expanded="false"
      (click)="expand.emit()"
    >
      <span class="bottom-drawer-bar-label">
        <span class="bottom-drawer-arrow">▲</span>
        <img class="ui-icon" src="assets/icons/scroll.png" alt="" /> QUADRO DO MESTRE
      </span>
      <span class="bottom-drawer-hint">TOQUE PARA ABRIR</span>
    </button>
  `,
  styleUrls: ['../bottom-drawer/bottom-drawer.scss'],
})
export class DmBoardTabComponent {
  @Output() expand = new EventEmitter<void>();
}
