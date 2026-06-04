import { Component, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GameSessionService } from '../services/game-session.service';

@Component({
  selector: 'app-session-create',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './session-create.component.html',
  styleUrls: ['./session-create.component.scss'],
})
export class SessionCreateComponent {
  private router = inject(Router);
  private gameSessionService = inject(GameSessionService);

  isMobile = signal(typeof window !== 'undefined' && window.innerWidth < 768);

  sessionName = signal('');
  maxPlayers = signal<number | null>(null);
  masterName = signal('');
  sessionCode = signal('');
  saveError = signal('');

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 768);
  }

  generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    this.sessionCode.set(code);
  }

  canGenerate(): boolean {
    return (
      this.sessionName().trim().length > 0 &&
      (this.maxPlayers() ?? 0) > 0 &&
      this.masterName().trim().length > 0
    );
  }

  canSave(): boolean {
    return this.canGenerate() && this.sessionCode().length > 0;
  }

  saveSession() {
    if (!this.canSave()) return;
    this.saveError.set('');

    this.gameSessionService
      .createSession({
        session_name: this.sessionName().trim(),
        session_code: this.sessionCode(),
        max_player_quantity: this.maxPlayers()!,
        dm_name: this.masterName().trim(),
        npcs: [],
        monsters: [],
      })
      .subscribe({
        next: res => this.router.navigate(['/session', res.game_session.id_game_session]),
        error: () => this.saveError.set('ERRO AO SALVAR AVENTURA. TENTE NOVAMENTE.'),
      });
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
