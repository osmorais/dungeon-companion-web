import { Component, EventEmitter, HostListener, Input, Output, signal } from '@angular/core';

/**
 * Celular, jogador: as ações do próprio personagem numa gaveta de baixo (como o Quadro do Mestre),
 * em vez de botões dentro do card. Não guarda estado da sessão — cada botão fecha a gaveta e
 * emite; o session-panel faz o que já fazia pelos botões do card.
 */
@Component({
  selector: 'app-character-drawer',
  standalone: true,
  templateUrl: './character-drawer.component.html',
  styleUrls: ['../dm-board/bottom-drawer.scss', './character-drawer.component.scss'],
})
export class CharacterDrawerComponent {
  @Input({ required: true }) characterName!: string;
  /** Vez do personagem e ele pode encerrar — mostra FINALIZAR (e ATRASAR, se `canDelay`). */
  @Input() canEndTurn = false;
  @Input() canDelay = false;
  @Input() endingTurn = false;
  @Input() delayingTurn = false;

  @Output() actions = new EventEmitter<void>();
  @Output() endTurn = new EventEmitter<void>();
  @Output() delayTurn = new EventEmitter<void>();
  @Output() sheet = new EventEmitter<void>();
  @Output() inventory = new EventEmitter<void>();

  open = signal(false);

  @HostListener('document:keydown.escape')
  close(): void {
    this.open.set(false);
  }

  /** Botão que abre modal ou troca de tela fecha a gaveta antes. */
  run(output: EventEmitter<void>): void {
    this.open.set(false);
    output.emit();
  }
}
