import { Component, HostListener, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { CharacterService } from '../services/character.service';
import { GameSessionService } from '../services/game-session.service';
import { CharacterSummary } from '../models/character-summary.interface';

@Component({
  selector: 'app-session-join',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './session-join.component.html',
  styleUrls: ['./session-join.component.scss'],
})
export class SessionJoinComponent implements OnInit {
  private router = inject(Router);
  private charService = inject(CharacterService);
  private gameSessionService = inject(GameSessionService);

  isMobile = signal(typeof window !== 'undefined' && window.innerWidth < 768);
  characters = signal<CharacterSummary[]>([]);
  selectedCharacter = signal<CharacterSummary | null>(null);
  sessionCode = signal('');
  playerName = signal('');
  loadError = signal(false);
  joinError = signal('');

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 768);
  }

  ngOnInit() {
    this.charService.getCharacters(1, 100).subscribe({
      next: res => this.characters.set(res.CharacterPagedList),
      error: () => this.loadError.set(true),
    });
  }

  onCodeInput(value: string) {
    this.sessionCode.set(value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5));
  }

  selectCharacter(char: CharacterSummary) {
    this.selectedCharacter.set(char);
  }

  isSelected(char: CharacterSummary): boolean {
    return this.selectedCharacter()?.id_character === char.id_character;
  }

  canJoin(): boolean {
    return (
      this.sessionCode().length === 5 &&
      this.playerName().trim().length > 0 &&
      this.selectedCharacter() !== null
    );
  }

  join() {
    if (!this.canJoin()) return;
    this.joinError.set('');

    this.gameSessionService
      .joinSession({
        session_code: this.sessionCode(),
        player_name: this.playerName().trim(),
        id_character: this.selectedCharacter()!.id_character,
      })
      .subscribe({
        next: res => this.router.navigate(['/session', res.id_game_session]),
        error: (err: HttpErrorResponse) => {
          if (err.status === 404) {
            this.joinError.set('SESSÃO NÃO ENCONTRADA. VERIFIQUE O CÓDIGO.');
          } else if (err.status === 422) {
            const msg: string = err.error?.message ?? '';
            if (msg.toLowerCase().includes('máximo') || msg.toLowerCase().includes('maximo') || msg.toLowerCase().includes('max')) {
              this.joinError.set('SESSÃO LOTADA. NÚMERO MÁXIMO DE JOGADORES ATINGIDO.');
            } else {
              this.joinError.set('DADOS INVÁLIDOS. VERIFIQUE AS INFORMAÇÕES.');
            }
          } else {
            this.joinError.set('ERRO AO ENTRAR NA AVENTURA. TENTE NOVAMENTE.');
          }
        },
      });
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
