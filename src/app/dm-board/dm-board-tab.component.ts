import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Aba do Quadro do Mestre recolhido: no desktop fica na lateral esquerda; no celular é a barra
 * larga presa na base da tela (bottom-drawer.scss). Expande a gaveta.
 */
@Component({
  selector: 'app-dm-board-tab',
  standalone: true,
  template: `
    @if (mobile) {
      <button
        class="bottom-drawer-bar"
        title="Expandir o quadro do mestre"
        aria-expanded="false"
        (click)="expand.emit()"
      >
        <span class="bottom-drawer-arrow">▲</span>
        <img class="ui-icon" src="assets/icons/scroll.png" alt="" /> QUADRO DO MESTRE
      </button>
    } @else {
      <button
        class="dm-board-tab dm-board-tab--docked"
        title="Expandir o quadro do mestre"
        aria-expanded="false"
        (click)="expand.emit()"
      >
        <span>▶</span>
        <span class="dm-board-tab-label">QUADRO DO MESTRE</span>
      </button>
    }
  `,
  styleUrls: ['./dm-board-tab.scss', './bottom-drawer.scss'],
  styles: `
    .dm-board-tab--docked {
      position: fixed;
      top: 50%;
      left: 0;
      z-index: 940;
      transform: translateY(-50%);
    }
  `,
})
export class DmBoardTabComponent {
  @Input() mobile = false;
  @Output() expand = new EventEmitter<void>();
}
