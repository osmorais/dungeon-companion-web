import {
  Component,
  computed,
  HostListener,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GameSessionService } from '../services/game-session.service';
import { GameSessionSummary } from '../models/game-session.interface';
import { SocialUser } from '../models/friend.interface';

/** Igual ao backend (SESSION_INVITE_MESSAGE_MAX). */
export const INVITE_MESSAGE_MAX = 200;

export interface InviteSubmission {
  id_game_session: string;
  session_name: string;
  message: string;
}

/**
 * Convidar um amigo para uma mesa (1.18.0). Lista só as mesas em que o usuário é o mestre e devolve
 * a escolha pra tela de amigos, que envia (a janela fecha já no clique). A API confere de novo
 * (mestre, amizade, bloqueio, vaga, convite repetido).
 */
@Component({
  selector: 'app-session-invite-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './session-invite-modal.component.html',
  styleUrls: ['./session-invite-modal.component.scss'],
})
export class SessionInviteModalComponent implements OnInit {
  private gameSessions = inject(GameSessionService);

  friend = input.required<SocialUser>();
  closed = output<void>();
  submitted = output<InviteSubmission>();

  readonly messageMax = INVITE_MESSAGE_MAX;
  sessions = signal<GameSessionSummary[]>([]);
  loading = signal(true);
  loadError = signal(false);
  selected = signal<string | null>(null);
  message = signal('');

  canSend = computed(() => !!this.selected());

  ngOnInit(): void {
    this.gameSessions.getMySessions(1, 50, 'dm').subscribe({
      next: (res) => {
        this.sessions.set(res.GameSessionPagedList);
        if (res.GameSessionPagedList.length === 1)
          this.selected.set(res.GameSessionPagedList[0].id_game_session);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  send(): void {
    const id = this.selected();
    if (!id) return;
    this.submitted.emit({
      id_game_session: id,
      session_name: this.sessions().find((s) => s.id_game_session === id)?.session_name ?? '',
      message: this.message(),
    });
  }

  @HostListener('document:keydown.escape')
  close(): void {
    this.closed.emit();
  }
}
