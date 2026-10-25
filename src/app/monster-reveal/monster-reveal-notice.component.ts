import { Component, EventEmitter, Input, Output } from '@angular/core';
import { GameCardComponent } from '../game-card/game-card.component';
import { GameCardData } from '../game-card/game-card.model';
import { MonsterRevealInfo, monsterToCard } from '../game-card/monster-card';
import { ModalBurstComponent } from '../modal-burst/modal-burst.component';

/**
 * Aviso de monstro revelado pra mesa (1.11.0), no estilo do aviso de lançamento: a carta do
 * monstro, grande, cai virada pra baixo com o verso das cartas, vira e mostra a imagem e a
 * descrição. Quem decide quando some (e a fila de vários monstros) é a sessão; aqui só a barra de
 * tempo. Fecha pelo ✕ ou tocando fora.
 */
@Component({
  selector: 'app-monster-reveal-notice',
  standalone: true,
  imports: [GameCardComponent, ModalBurstComponent],
  templateUrl: './monster-reveal-notice.component.html',
  styleUrls: ['./monster-reveal-notice.component.scss'],
})
export class MonsterRevealNoticeComponent {
  @Input({ required: true }) set info(value: MonsterRevealInfo) {
    this.name = value.name;
    this.card = monsterToCard(value);
  }
  /** Duração da barra de tempo (o mesmo tempo que a sessão espera pra fechar). */
  @Input() durationMs = 0;
  @Output() closed = new EventEmitter<void>();

  name = '';
  card!: GameCardData;
}
