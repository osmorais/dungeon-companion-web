import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GameSessionService } from '../services/game-session.service';
import { GrantXpResult, PlayerSession } from '../models/game-session.interface';

/**
 * Usado em dois pontos do session-panel: um botão avulso "DISTRIBUIR XP" (sem sugestão de
 * valor/destinatários) e o fluxo de derrotar monstro (sugere o XP do monstro e pré-marca os
 * jogadores do combate ativo). Cada jogador selecionado recebe o valor cheio de XP informado —
 * não é dividido entre eles.
 */
@Component({
  selector: 'app-distribute-xp-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './distribute-xp-modal.component.html',
  styleUrls: ['./distribute-xp-modal.component.scss'],
})
export class DistributeXpModalComponent implements OnInit {
  private gameSessionService = inject(GameSessionService);

  @Input({ required: true }) sessionId!: string;
  @Input() players: PlayerSession[] = [];
  @Input() preselectedPlayerSessionIds: string[] = [];
  @Input() suggestedXp: number | null = null;
  @Input() title = 'DISTRIBUIR XP';
  @Output() closed = new EventEmitter<void>();
  @Output() granted = new EventEmitter<GrantXpResult[]>();

  xpAmount = signal(0);
  selected = signal<Set<string>>(new Set());
  granting = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.xpAmount.set(this.suggestedXp ?? 0);
    this.selected.set(new Set(this.preselectedPlayerSessionIds));
  }

  get eligiblePlayers(): PlayerSession[] {
    return this.players.filter(p => !!p.character);
  }

  get hasSelection(): boolean {
    return this.selected().size > 0;
  }

  togglePlayer(id: string): void {
    this.selected.update(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  isSelected(id: string): boolean {
    return this.selected().has(id);
  }

  setXpAmount(value: string): void {
    const parsed = parseInt(value, 10);
    this.xpAmount.set(Number.isNaN(parsed) ? 0 : Math.max(0, parsed));
  }

  close(): void {
    if (this.granting()) return;
    this.closed.emit();
  }

  confirm(): void {
    if (!this.hasSelection || this.xpAmount() <= 0 || this.granting()) return;
    this.granting.set(true);
    this.error.set(null);
    this.gameSessionService
      .grantXp(this.sessionId, {
        xp_amount: this.xpAmount(),
        id_player_sessions: [...this.selected()],
      })
      .subscribe({
        next: result => {
          this.granting.set(false);
          this.granted.emit(result);
        },
        error: () => {
          this.granting.set(false);
          this.error.set('Não foi possível conceder XP.');
        },
      });
  }
}
