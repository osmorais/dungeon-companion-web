import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { SkeletonRowsComponent } from '../skeleton/skeleton-rows.component';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { CharacterService } from '../services/character.service';
import { GameSessionService } from '../services/game-session.service';
import { CharacterSummary } from '../models/character-summary.interface';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-session-join',
  standalone: true,
  imports: [FormsModule, SkeletonRowsComponent],
  templateUrl: './session-join.component.html',
  styleUrls: ['./session-join.component.scss'],
})
export class SessionJoinComponent implements OnInit {
  private router = inject(Router);
  private charService = inject(CharacterService);
  private gameSessionService = inject(GameSessionService);
  private auth = inject(AuthService);
  /** Na mesa você aparece com o nome de usuário (1.9.0) — não há mais nome de jogador a digitar. */
  readonly username = computed(() => this.auth.currentUser()?.username ?? '');

  isMobile = signal(typeof window !== 'undefined' && window.innerWidth < 768);
  characters = signal<CharacterSummary[]>([]);
  /** Buscando os personagens — skeleton em vez de "nenhum encontrado". */
  loadingCharacters = signal(true);
  /** Entrando na sessão — trava o botão (sem o overlay que bloqueava a tela). */
  joining = signal(false);
  selectedCharacter = signal<CharacterSummary | null>(null);
  sessionCode = signal('');
  loadError = signal(false);
  joinError = signal('');

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 768);
  }

  ngOnInit() {
    this.charService.getCharacters(1, 100).subscribe({
      next: res => {
        this.characters.set(res.CharacterPagedList);
        this.loadingCharacters.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loadingCharacters.set(false);
      },
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
      this.selectedCharacter() !== null
    );
  }

  join() {
    if (!this.canJoin() || this.joining()) return;
    this.joinError.set('');
    this.joining.set(true);

    this.gameSessionService
      .joinSession({
        session_code: this.sessionCode(),
        id_character: this.selectedCharacter()!.id_character,
      })
      .subscribe({
        next: res => this.router.navigate(['/session', res.id_game_session]),
        error: (err: HttpErrorResponse) => {
          this.joining.set(false);
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
