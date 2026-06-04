import { Component, HostListener, OnDestroy, inject, input, signal, effect, untracked, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, finalize, interval } from 'rxjs';
import { GameSessionService } from '../services/game-session.service';
import { CharacterService } from '../services/character.service';
import { AuthService } from '../services/auth.service';
import { GameSessionDetail, MonsterSession, NpcSession, PlayerSession } from '../models/game-session.interface';
import { CharacterSummary } from '../models/character-summary.interface';
import { AvatarDisplayComponent } from '../avatar-display/avatar-display.component';

@Component({
  selector: 'app-session-panel',
  standalone: true,
  imports: [AvatarDisplayComponent],
  templateUrl: './session-panel.component.html',
  styleUrls: ['./session-panel.component.scss'],
})
export class SessionPanelComponent implements OnDestroy {
  private router = inject(Router);
  private gameSessionService = inject(GameSessionService);
  private charService = inject(CharacterService);
  private authService = inject(AuthService);

  id = input<string>();

  isMobile = signal(typeof window !== 'undefined' && window.innerWidth < 768);
  sessionDetail = signal<GameSessionDetail | null>(null);
  error = signal(false);
  refreshing = signal(false);
  hpEdits = signal<Record<string, number>>({});
  savingHp = signal<Set<string>>(new Set());
  npcHpEdits = signal<Record<string, number>>({});
  savingNpcHp = signal<Set<string>>(new Set());

  addNpcOpen = signal(false);
  addNpcChars = signal<CharacterSummary[]>([]);
  addNpcLoading = signal(false);
  addingNpcId = signal<number | null>(null);

  private pollSub: Subscription | null = null;
  private readonly POLL_INTERVAL_MS = 60_000;

  isOwner = computed(() => {
    const detail = this.sessionDetail();
    const user = this.authService.currentUser();
    if (!detail || !user) return false;
    return detail.game_session.user_id === user.id;
  });

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 768);
  }

  constructor() {
    effect(() => {
      const sessionId = this.id();
      untracked(() => {
        if (!sessionId) return;
        this.fetchSession(sessionId);
        this.startPolling(sessionId);
      });
    });
  }

  ngOnDestroy() {
    this.stopPolling();
  }

  private startPolling(sessionId: string) {
    this.stopPolling();
    this.pollSub = interval(this.POLL_INTERVAL_MS).subscribe(() => {
      if (!this.refreshing()) {
        this.fetchSession(sessionId);
      }
    });
  }

  private stopPolling() {
    this.pollSub?.unsubscribe();
    this.pollSub = null;
  }

  private fetchSession(sessionId: string) {
    this.refreshing.set(true);
    this.gameSessionService.getSessionById(sessionId).subscribe({
      next: detail => {
        this.sessionDetail.set(detail);
        this.hpEdits.set({});
        this.npcHpEdits.set({});
        this.error.set(false);
        this.refreshing.set(false);
      },
      error: () => {
        this.error.set(true);
        this.refreshing.set(false);
      },
    });
  }

  refreshSession() {
    const sessionId = this.id();
    if (!sessionId) return;
    this.fetchSession(sessionId);
  }

  get availableToAdd(): CharacterSummary[] {
    const addedIds = new Set(this.sessionDetail()?.npcs.map(n => n.id_character) ?? []);
    return this.addNpcChars().filter(c => !addedIds.has(c.id_character));
  }

  openAddNpcModal() {
    this.addNpcOpen.set(true);
    if (this.addNpcChars().length > 0) return;
    this.addNpcLoading.set(true);
    this.charService.getCharacters(1, 100).subscribe({
      next: res => {
        this.addNpcChars.set(res.CharacterPagedList ?? []);
        this.addNpcLoading.set(false);
      },
      error: () => this.addNpcLoading.set(false),
    });
  }

  closeAddNpcModal() {
    this.addNpcOpen.set(false);
  }

  addNpc(char: CharacterSummary) {
    const sessionId = this.id();
    if (!sessionId || this.addingNpcId() !== null) return;
    this.addingNpcId.set(char.id_character);
    this.gameSessionService.addNpcToSession(sessionId, char.id_character).pipe(
      finalize(() => this.addingNpcId.set(null)),
    ).subscribe({
      next: () => this.refreshSession(),
    });
  }

  deleteNpc(idNpcSession: string) {
    this.gameSessionService.deleteNpc(idNpcSession).subscribe({
      next: () => {
        this.sessionDetail.update(detail => {
          if (!detail) return detail;
          return { ...detail, npcs: detail.npcs.filter(n => n.id_npc_session !== idNpcSession) };
        });
        this.npcHpEdits.update(edits => {
          const n = { ...edits };
          delete n[idNpcSession];
          return n;
        });
      },
    });
  }

  canViewSheet(player: PlayerSession): boolean {
    if (this.isOwner()) return true;
    return player.user_id === this.authService.currentUser()?.id;
  }

  deletePlayer(idPlayerSession: string) {
    this.gameSessionService.deletePlayer(idPlayerSession).subscribe({
      next: () => {
        this.sessionDetail.update(detail => {
          if (!detail) return detail;
          return { ...detail, players: detail.players.filter(p => p.id_player_session !== idPlayerSession) };
        });
      },
    });
  }

  viewCharacterSheet(idCharacter: number) {
    this.router.navigate(['/character-sheet', idCharacter]);
  }

  canEditHp(player: PlayerSession): boolean {
    if (!player.character) return false;
    if (this.isOwner()) return true;
    return player.user_id === this.authService.currentUser()?.id;
  }

  editedHp(player: PlayerSession): number {
    return this.hpEdits()[player.id_player_session] ?? player.character!.current_hit_points;
  }

  hasHpChange(player: PlayerSession): boolean {
    const id = player.id_player_session;
    const edits = this.hpEdits();
    if (!(id in edits)) return false;
    return edits[id] !== player.character!.current_hit_points;
  }

  decrementHp(player: PlayerSession) {
    const current = this.editedHp(player);
    if (current <= 0) return;
    this.hpEdits.update(edits => ({ ...edits, [player.id_player_session]: current - 1 }));
  }

  incrementHp(player: PlayerSession) {
    const current = this.editedHp(player);
    const max = player.character!.max_hit_points;
    if (current >= max) return;
    this.hpEdits.update(edits => ({ ...edits, [player.id_player_session]: current + 1 }));
  }

  saveHp(player: PlayerSession) {
    const newHp = this.editedHp(player);
    const id = player.id_player_session;
    this.savingHp.update(s => { const n = new Set(s); n.add(id); return n; });
    this.gameSessionService.updatePlayerHp(id, newHp).pipe(
      finalize(() => this.savingHp.update(s => { const n = new Set(s); n.delete(id); return n; })),
    ).subscribe({
      next: () => {
        this.sessionDetail.update(detail => {
          if (!detail) return detail;
          return {
            ...detail,
            players: detail.players.map(p =>
              p.id_player_session === id
                ? { ...p, character: p.character ? { ...p.character, current_hit_points: newHp } : p.character }
                : p,
            ),
          };
        });
        this.hpEdits.update(edits => {
          const n = { ...edits };
          delete n[id];
          return n;
        });
      },
    });
  }

  editedNpcHp(npc: NpcSession): number {
    return this.npcHpEdits()[npc.id_npc_session] ?? npc.character!.current_hit_points;
  }

  hasNpcHpChange(npc: NpcSession): boolean {
    const id = npc.id_npc_session;
    const edits = this.npcHpEdits();
    if (!(id in edits)) return false;
    return edits[id] !== npc.character!.current_hit_points;
  }

  decrementNpcHp(npc: NpcSession) {
    const current = this.editedNpcHp(npc);
    if (current <= 0) return;
    this.npcHpEdits.update(edits => ({ ...edits, [npc.id_npc_session]: current - 1 }));
  }

  incrementNpcHp(npc: NpcSession) {
    const current = this.editedNpcHp(npc);
    const max = npc.character!.max_hit_points;
    if (current >= max) return;
    this.npcHpEdits.update(edits => ({ ...edits, [npc.id_npc_session]: current + 1 }));
  }

  saveNpcHp(npc: NpcSession) {
    const newHp = this.editedNpcHp(npc);
    const id = npc.id_npc_session;
    this.savingNpcHp.update(s => { const n = new Set(s); n.add(id); return n; });
    this.gameSessionService.updateNpcHp(id, newHp).pipe(
      finalize(() => this.savingNpcHp.update(s => { const n = new Set(s); n.delete(id); return n; })),
    ).subscribe({
      next: () => {
        this.sessionDetail.update(detail => {
          if (!detail) return detail;
          return {
            ...detail,
            npcs: detail.npcs.map(n =>
              n.id_npc_session === id
                ? { ...n, character: n.character ? { ...n.character, current_hit_points: newHp } : n.character }
                : n,
            ),
          };
        });
        this.npcHpEdits.update(edits => {
          const n = { ...edits };
          delete n[id];
          return n;
        });
      },
    });
  }

  monsterDisplayName(monster: MonsterSession): string {
    if (monster.custom_name) return monster.custom_name;
    return monster.monster_api_slug
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  hpPercent(current: number, max: number): number {
    if (max <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((current / max) * 100)));
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
