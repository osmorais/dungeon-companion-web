import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { GameSessionService } from '../services/game-session.service';
import { PlayerSession, SecretRollCheck } from '../models/game-session.interface';
import { SECRET_ROLL_SAVES, SECRET_ROLL_SKILLS, secretCheckLabel } from './secret-roll-checks';

/**
 * Mestre pede um teste secreto (perícia ou resistência) a um ou mais jogadores. Cada um recebe o
 * pedido só na própria tela, rola com o bônus da ficha, e o resultado chega oculto pro mestre.
 */
@Component({
  selector: 'app-secret-roll-request-modal',
  standalone: true,
  templateUrl: './secret-roll-request-modal.component.html',
  styleUrls: ['./secret-roll.scss'],
})
export class SecretRollRequestModalComponent {
  private gameSessionService = inject(GameSessionService);

  @Input({ required: true }) sessionId!: string;
  /** Jogadores da sessão — só os com personagem podem receber o pedido. */
  @Input({ required: true }) players: PlayerSession[] = [];
  @Output() closed = new EventEmitter<void>();

  readonly skills = SECRET_ROLL_SKILLS;
  readonly saves = SECRET_ROLL_SAVES;

  selected = signal<ReadonlySet<string>>(new Set());
  kind = signal<'skill' | 'save'>('skill');
  idSkill = signal(13); // Percepção
  ability = signal<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA'>('WIS');
  sending = signal(false);
  error = signal<string | null>(null);

  get eligiblePlayers(): PlayerSession[] {
    return this.players.filter((p) => p.character && p.user_id);
  }

  get check(): SecretRollCheck {
    return this.kind() === 'skill'
      ? { kind: 'skill', id_skill: this.idSkill() }
      : { kind: 'save', ability: this.ability() };
  }

  isSelected(id: string): boolean {
    return this.selected().has(id);
  }

  togglePlayer(id: string): void {
    this.selected.update((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  selectAll(): void {
    this.selected.set(new Set(this.eligiblePlayers.map((p) => p.id_player_session)));
  }

  setKind(kind: 'skill' | 'save'): void {
    this.kind.set(kind);
  }

  setSkill(event: Event): void {
    this.idSkill.set(Number((event.target as HTMLSelectElement).value));
  }

  setAbility(event: Event): void {
    this.ability.set(
      (event.target as HTMLSelectElement).value as (typeof this.saves)[number]['ability'],
    );
  }

  send(): void {
    if (this.sending() || this.selected().size === 0) return;
    this.sending.set(true);
    this.error.set(null);
    this.gameSessionService
      .requestSecretRoll(this.sessionId, {
        id_player_sessions: [...this.selected()],
        check: this.check,
        label: secretCheckLabel(this.check),
      })
      .subscribe({
        next: () => {
          this.sending.set(false);
          this.closed.emit();
        },
        error: () => {
          this.sending.set(false);
          this.error.set('Não foi possível enviar o pedido. Tente novamente.');
        },
      });
  }
}
