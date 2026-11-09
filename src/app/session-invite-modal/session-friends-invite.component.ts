import {
  Component,
  computed,
  HostListener,
  inject,
  input,
  OnDestroy,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FriendService } from '../services/friend.service';
import { SessionInviteService } from '../services/session-invite.service';
import { Friend } from '../models/friend.interface';
import { apiErrorMessage } from '../auth/auth-errors';
import { IconActionComponent } from '../friends/icon-action.component';
import { PagedState } from '../friends/paged-state';
import { FRIENDS_PAGE_SIZE, presenceLine } from '../friends/friends-page';
import { INVITE_MESSAGE_MAX } from './session-invite-modal.component';

const SEARCH_DEBOUNCE_MS = 300;
/** O máximo que a API devolve por página: basta pros convites pendentes de uma mesa. */
const PENDING_INVITES_PAGE = 50;

/**
 * Mestre convidando amigos de dentro da sessão. Quem já está na mesa ou já tem convite pendente
 * aparece marcado; a API confere tudo de novo (mestre, amizade, bloqueio, vaga, repetido).
 */
@Component({
  selector: 'app-session-friends-invite',
  standalone: true,
  imports: [FormsModule, IconActionComponent],
  templateUrl: './session-friends-invite.component.html',
  styleUrls: ['./session-invite-modal.component.scss', './session-friends-invite.component.scss'],
})
export class SessionFriendsInviteComponent implements OnInit, OnDestroy {
  private friendService = inject(FriendService);
  private invites = inject(SessionInviteService);

  sessionId = input.required<string>();
  /** Ids de quem já joga nesta mesa. */
  memberIds = input.required<string[]>();
  closed = output<void>();

  readonly messageMax = INVITE_MESSAGE_MAX;
  readonly presenceLine = presenceLine;

  query = signal('');
  message = signal('');
  error = signal('');
  /** Convidados: marcados já no clique, e desmarcados se a API recusar. */
  invited = signal<ReadonlySet<string>>(new Set());
  /** Convites ainda sem resposta: o botão fica travado até ela. */
  sending = signal<ReadonlySet<string>>(new Set());

  friends = new PagedState<Friend>((page) =>
    this.friendService.getFriends(page, FRIENDS_PAGE_SIZE, this.query()),
  );

  private members = computed(() => new Set(this.memberIds()));
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.friends.load(1);
    this.invites.list('sent', 1, PENDING_INVITES_PAGE).subscribe({
      next: (res) =>
        this.invited.update((set) => {
          const next = new Set(set);
          for (const invite of res.items)
            if (invite.id_game_session === this.sessionId()) next.add(invite.user.id);
          return next;
        }),
      error: () => undefined,
    });
  }

  ngOnDestroy(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.friends.load(1), SEARCH_DEBOUNCE_MS);
  }

  isMember(friend: Friend): boolean {
    return this.members().has(friend.id);
  }

  isInvited(friend: Friend): boolean {
    return this.invited().has(friend.id);
  }

  invite(friend: Friend): void {
    if (this.isMember(friend) || this.isInvited(friend)) return;
    this.error.set('');
    this.mark(this.invited, friend.id, true);
    this.mark(this.sending, friend.id, true);
    this.invites.send(this.sessionId(), friend.id, this.message()).subscribe({
      next: () => this.mark(this.sending, friend.id, false),
      error: (err) => {
        this.mark(this.sending, friend.id, false);
        this.mark(this.invited, friend.id, false);
        this.error.set(apiErrorMessage(err, `Não foi possível convidar ${friend.username}.`));
      },
    });
  }

  private mark(
    target: ReturnType<typeof signal<ReadonlySet<string>>>,
    id: string,
    on: boolean,
  ): void {
    target.update((set) => {
      const next = new Set(set);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  @HostListener('document:keydown.escape')
  close(): void {
    this.closed.emit();
  }
}
