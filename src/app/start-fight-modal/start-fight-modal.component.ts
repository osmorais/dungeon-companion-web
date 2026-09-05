import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { GameSessionService } from '../services/game-session.service';
import { AvatarDisplayComponent } from '../avatar-display/avatar-display.component';
import {
  NpcSession,
  PlayerSession,
  StartEncounterParticipantInput,
} from '../models/game-session.interface';

@Component({
  selector: 'app-start-fight-modal',
  standalone: true,
  imports: [AvatarDisplayComponent],
  templateUrl: './start-fight-modal.component.html',
  styleUrls: ['./start-fight-modal.component.scss'],
})
export class StartFightModalComponent {
  private gameSessionService = inject(GameSessionService);

  @Input({ required: true }) sessionId!: string;
  @Input() players: PlayerSession[] = [];
  @Input() npcs: NpcSession[] = [];
  @Output() closed = new EventEmitter<void>();

  selectedPlayers = signal<Set<string>>(new Set());
  selectedNpcs = signal<Set<string>>(new Set());
  starting = signal(false);
  error = signal<string | null>(null);

  get eligiblePlayers(): PlayerSession[] {
    return this.players.filter((p) => !!p.character);
  }

  get eligibleNpcs(): NpcSession[] {
    return this.npcs.filter((n) => !!n.character);
  }

  get hasSelection(): boolean {
    return this.selectedPlayers().size > 0 || this.selectedNpcs().size > 0;
  }

  togglePlayer(id: string): void {
    this.selectedPlayers.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  toggleNpc(id: string): void {
    this.selectedNpcs.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  close(): void {
    if (this.starting()) return;
    this.closed.emit();
  }

  startBattle(): void {
    if (!this.hasSelection || this.starting()) return;

    const participants: StartEncounterParticipantInput[] = [
      ...Array.from(this.selectedPlayers()).map((id) => ({
        participant_type: 'player' as const,
        id,
      })),
      ...Array.from(this.selectedNpcs()).map((id) => ({ participant_type: 'npc' as const, id })),
    ];

    this.starting.set(true);
    this.error.set(null);
    this.gameSessionService.startEncounter(this.sessionId, participants).subscribe({
      next: () => {
        this.starting.set(false);
        this.closed.emit();
      },
      error: () => {
        this.starting.set(false);
        this.error.set('Não foi possível iniciar a luta.');
      },
    });
  }
}
