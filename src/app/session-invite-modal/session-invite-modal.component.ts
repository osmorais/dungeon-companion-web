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
import { SessionInviteService } from '../services/session-invite.service';
import { GameSessionSummary } from '../models/game-session.interface';
import { SocialUser } from '../models/friend.interface';
import { apiErrorMessage } from '../auth/auth-errors';

/** Igual ao backend (SESSION_INVITE_MESSAGE_MAX). */
export const INVITE_MESSAGE_MAX = 200;

/**
 * Convidar um amigo para uma mesa (1.18.0). Lista só as mesas em que o usuário é o mestre — a
 * API confere de novo (mestre, amizade, bloqueio, vaga, convite repetido).
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
  private invites = inject(SessionInviteService);

  friend = input.required<SocialUser>();
  closed = output<void>();
  sent = output<string>();

  readonly messageMax = INVITE_MESSAGE_MAX;
  sessions = signal<GameSessionSummary[]>([]);
  loading = signal(true);
  loadError = signal(false);
  selected = signal<string | null>(null);
  message = signal('');
  sending = signal(false);
  error = signal('');

  canSend = computed(() => !!this.selected() && !this.sending());

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
    if (!id || this.sending()) return;
    this.error.set('');
    this.sending.set(true);
    this.invites.send(id, this.friend().id, this.message()).subscribe({
      next: () => {
        this.sending.set(false);
        const name = this.sessions().find((s) => s.id_game_session === id)?.session_name ?? '';
        this.sent.emit(name);
      },
      error: (err) => {
        this.sending.set(false);
        this.error.set(apiErrorMessage(err, 'Não foi possível enviar o convite.'));
      },
    });
  }

  @HostListener('document:keydown.escape')
  close(): void {
    this.closed.emit();
  }
}
