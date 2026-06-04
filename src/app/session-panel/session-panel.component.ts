import { Component, HostListener, inject, input, signal, effect, untracked, computed } from '@angular/core';
import { Router } from '@angular/router';
import { GameSessionService } from '../services/game-session.service';
import { AuthService } from '../services/auth.service';
import { GameSessionDetail, PlayerSession } from '../models/game-session.interface';
import { AvatarDisplayComponent } from '../avatar-display/avatar-display.component';

@Component({
  selector: 'app-session-panel',
  standalone: true,
  imports: [AvatarDisplayComponent],
  templateUrl: './session-panel.component.html',
  styleUrls: ['./session-panel.component.scss'],
})
export class SessionPanelComponent {
  private router = inject(Router);
  private gameSessionService = inject(GameSessionService);
  private authService = inject(AuthService);

  id = input<string>();

  isMobile = signal(typeof window !== 'undefined' && window.innerWidth < 768);
  sessionDetail = signal<GameSessionDetail | null>(null);
  error = signal(false);

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
        this.gameSessionService.getSessionById(sessionId).subscribe({
          next: detail => this.sessionDetail.set(detail),
          error: () => this.error.set(true),
        });
      });
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

  hpPercent(current: number, max: number): number {
    if (max <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((current / max) * 100)));
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
