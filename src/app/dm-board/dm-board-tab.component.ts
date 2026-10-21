import { Component, EventEmitter, Output } from '@angular/core';

/** Aba do Quadro do Mestre recolhido (desktop): fica na lateral esquerda e expande a gaveta. */
@Component({
  selector: 'app-dm-board-tab',
  standalone: true,
  template: `
    <button
      class="dm-board-tab dm-board-tab--docked"
      title="Expandir o quadro do mestre"
      aria-expanded="false"
      (click)="expand.emit()"
    >
      <span>▶</span>
      <span class="dm-board-tab-label">QUADRO DO MESTRE</span>
    </button>
  `,
  styleUrls: ['./dm-board-tab.scss'],
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
  @Output() expand = new EventEmitter<void>();
}
