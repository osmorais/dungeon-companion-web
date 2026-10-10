import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { GameSessionService } from '../services/game-session.service';
import { AvatarDisplayComponent } from '../avatar-display/avatar-display.component';
import {
  CombatParticipant,
  MonsterSession,
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

  /** Miniatura padrão pra monstros sem image_url. */
  readonly DEFAULT_MONSTER_IMAGE = 'assets/monster.png';

  /** 'add' reaproveita esse mesmo modal pra incluir participantes num combate já em andamento
   *  (iniciando ou não a rolagem de iniciativa) — só muda o texto e qual endpoint é chamado. */
  @Input() mode: 'start' | 'add' = 'start';
  /** Obrigatório apenas no modo 'add'. */
  @Input() idCombatEncounter: string | null = null;
  /** No modo 'add', quem já está no combate some da lista pra não ser adicionado de novo. */
  @Input() existingParticipants: CombatParticipant[] = [];

  @Input({ required: true }) sessionId!: string;
  @Input() players: PlayerSession[] = [];
  @Input() npcs: NpcSession[] = [];
  @Input() monsters: MonsterSession[] = [];
  @Output() closed = new EventEmitter<void>();

  selectedPlayers = signal<Set<string>>(new Set());
  selectedNpcs = signal<Set<string>>(new Set());
  selectedMonsters = signal<Set<string>>(new Set());
  starting = signal(false);
  error = signal<string | null>(null);

  get eligiblePlayers(): PlayerSession[] {
    const already = new Set(
      this.existingParticipants
        .filter((p) => p.participant_type === 'player')
        .map((p) => p.id_player_session),
    );
    return this.players.filter((p) => !!p.character && !already.has(p.id_player_session));
  }

  get eligibleNpcs(): NpcSession[] {
    const already = new Set(
      this.existingParticipants
        .filter((p) => p.participant_type === 'npc')
        .map((p) => p.id_npc_session),
    );
    return this.npcs.filter((n) => !!n.character && !already.has(n.id_npc_session));
  }

  get eligibleMonsters(): MonsterSession[] {
    const already = new Set(
      this.existingParticipants
        .filter((p) => p.participant_type === 'monster')
        .map((p) => p.id_monster_session),
    );
    return this.monsters.filter((m) => !already.has(m.id_monster_session));
  }

  get hasSelection(): boolean {
    return (
      this.selectedPlayers().size > 0 ||
      this.selectedNpcs().size > 0 ||
      this.selectedMonsters().size > 0
    );
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

  toggleMonster(id: string): void {
    this.selectedMonsters.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  monsterName(monster: MonsterSession): string {
    return monster.custom_name ?? monster.data_snapshot.name;
  }

  close(): void {
    if (this.starting()) return;
    this.closed.emit();
  }

  confirmAction(): void {
    if (!this.hasSelection || this.starting()) return;

    const participants: StartEncounterParticipantInput[] = [
      ...Array.from(this.selectedPlayers()).map((id) => ({
        participant_type: 'player' as const,
        id,
      })),
      ...Array.from(this.selectedNpcs()).map((id) => ({ participant_type: 'npc' as const, id })),
      ...Array.from(this.selectedMonsters()).map((id) => ({
        participant_type: 'monster' as const,
        id,
      })),
    ];

    this.starting.set(true);
    this.error.set(null);
    const request$ =
      this.mode === 'add' && this.idCombatEncounter
        ? this.gameSessionService.addCombatParticipants(this.idCombatEncounter, participants)
        : this.gameSessionService.startEncounter(this.sessionId, participants);
    request$.subscribe({
      next: () => {
        this.starting.set(false);
        this.closed.emit();
      },
      error: () => {
        this.starting.set(false);
        this.error.set(
          this.mode === 'add'
            ? 'Não foi possível adicionar ao combate.'
            : 'Não foi possível iniciar a luta.',
        );
      },
    });
  }
}
