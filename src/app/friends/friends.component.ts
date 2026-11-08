import {
  Component,
  computed,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable, skip, Subscription } from 'rxjs';
import { SkeletonRowsComponent } from '../skeleton/skeleton-rows.component';
import { FriendService } from '../services/friend.service';
import { SocialSocketService } from '../services/social-socket.service';
import { SessionInviteService } from '../services/session-invite.service';
import { SessionInviteModalComponent } from '../session-invite-modal/session-invite-modal.component';
import { InviteAcceptModalComponent } from '../session-invite-modal/invite-accept-modal.component';
import { apiErrorMessage } from '../auth/auth-errors';
import {
  BlockedUser,
  ChosenPresenceStatus,
  Friend,
  FriendRequestView,
  MyPresence,
  PagedList,
  PlayerSearchResult,
  SessionInviteView,
  SocialEvent,
  SocialUser,
} from '../models/friend.interface';
import {
  availabilityToggle,
  avatarInitial,
  discoverAction,
  isFriendsTab,
  MY_STATUS_OPTIONS,
  presenceLine,
  FRIENDS_PAGE_SIZE,
  FRIENDS_TABS,
  FriendsTab,
  PLAYER_SEARCH_MIN_LENGTH,
  shortDate,
  totalPages,
} from './friends-page';

const FILTER_DEBOUNCE_MS = 300;

/** Uma lista paginada da tela (amigos, recebidas, enviadas, busca, bloqueados). */
export class PagedState<T> {
  items = signal<T[]>([]);
  page = signal(1);
  total = signal(0);
  loading = signal(false);
  error = signal(false);
  pages = computed(() => totalPages(this.total(), FRIENDS_PAGE_SIZE));
  hasPrev = computed(() => this.page() > 1);
  hasNext = computed(() => this.page() < this.pages());

  constructor(private fetch: (page: number) => Observable<PagedList<T>>) {}

  load(page = this.page()): void {
    this.page.set(page);
    this.loading.set(true);
    this.error.set(false);
    this.fetch(page).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.total.set(res.total_count);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  prev(): void {
    if (this.hasPrev()) this.load(this.page() - 1);
  }

  next(): void {
    if (this.hasNext()) this.load(this.page() + 1);
  }

  /** Troca um item no lugar (ex.: presença de um amigo mudou), sem recarregar. */
  patch(match: (item: T) => boolean, change: (item: T) => T): void {
    this.items.update((list) => list.map((item) => (match(item) ? change(item) : item)));
  }

  /** Recarrega depois de remover um item; se a página ficou vazia, volta uma. */
  reloadAfterRemoval(): void {
    const lastOnPage = this.items().length <= 1 && this.page() > 1;
    this.load(lastOnPage ? this.page() - 1 : this.page());
  }
}

/**
 * Amigos (1.18.0): lista de amigos (todos e online), solicitações recebidas e enviadas, busca de
 * jogadores e bloqueados. As regras (duplicidade, bloqueio, permissões, privacidade da presença)
 * ficam todas na API — aqui só se mostra o que ela devolve. Os eventos do socket social só dizem
 * o que recarregar (ou trocam a presença de um amigo no lugar).
 */
@Component({
  selector: 'app-friends',
  standalone: true,
  imports: [
    FormsModule,
    NgTemplateOutlet,
    SkeletonRowsComponent,
    SessionInviteModalComponent,
    InviteAcceptModalComponent,
  ],
  templateUrl: './friends.component.html',
  styleUrls: ['./friends.component.scss'],
})
export class FriendsComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private friendService = inject(FriendService);
  private socket = inject(SocialSocketService);
  private inviteService = inject(SessionInviteService);
  private subs = new Subscription();

  readonly tabs = FRIENDS_TABS;
  readonly searchMin = PLAYER_SEARCH_MIN_LENGTH;
  readonly initial = avatarInitial;
  readonly date = shortDate;
  readonly discoverAction = discoverAction;
  readonly presenceLine = presenceLine;
  readonly statusOptions = MY_STATUS_OPTIONS;

  /** Amigo sendo convidado pra uma mesa (abre o modal). */
  inviteTarget = signal<SocialUser | null>(null);
  /** Convite recebido sendo aceito (abre a escolha de personagem). */
  acceptTarget = signal<SessionInviteView | null>(null);

  /** Meu status e disponibilidade pra jogar (só em memória na API, some ao reiniciar). */
  me = signal<MyPresence | null>(null);

  isMobile = signal(typeof window !== 'undefined' && window.innerWidth < 768);
  tab = signal<FriendsTab>('all');

  filter = signal('');
  private filterTimer: ReturnType<typeof setTimeout> | null = null;

  query = signal('');
  /** Termo da última busca feita (a lista mostra o resultado dele, não do que está digitado). */
  searched = signal('');
  canSearch = computed(() => this.query().trim().length >= PLAYER_SEARCH_MIN_LENGTH);

  /** Feedback da última ação (aceitar, remover, bloquear…). */
  message = signal('');
  messageIsError = signal(false);
  /** Ids com ação em andamento: o botão fica desligado até a resposta. */
  busy = signal<ReadonlySet<string>>(new Set());

  receivedCount = signal(0);

  friends = new PagedState<Friend>((page) =>
    this.friendService.getFriends(page, FRIENDS_PAGE_SIZE, this.filter()),
  );
  online = new PagedState<Friend>((page) =>
    this.friendService.getFriends(page, FRIENDS_PAGE_SIZE, '', true),
  );
  received = new PagedState<FriendRequestView>((page) =>
    this.friendService.getRequests('received', page, FRIENDS_PAGE_SIZE),
  );
  sent = new PagedState<FriendRequestView>((page) =>
    this.friendService.getRequests('sent', page, FRIENDS_PAGE_SIZE),
  );
  results = new PagedState<PlayerSearchResult>((page) =>
    this.friendService.searchPlayers(this.searched(), page, FRIENDS_PAGE_SIZE),
  );
  blocked = new PagedState<BlockedUser>((page) =>
    this.friendService.getBlocked(page, FRIENDS_PAGE_SIZE),
  );
  receivedInvites = new PagedState<SessionInviteView>((page) =>
    this.inviteService.list('received', page, FRIENDS_PAGE_SIZE),
  );
  sentInvites = new PagedState<SessionInviteView>((page) =>
    this.inviteService.list('sent', page, FRIENDS_PAGE_SIZE),
  );
  /** Pendências na aba Solicitações: solicitações de amizade + convites para mesa recebidos. */
  pendingCount = computed(() => this.receivedCount() + this.receivedInvites.total());

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 768);
  }

  ngOnInit(): void {
    // Link da notificação abre direto na aba certa (?aba=requests).
    const requested = this.route.snapshot?.queryParamMap.get('aba');
    if (isFriendsTab(requested) && requested !== 'all') this.selectTab(requested);
    else this.friends.load(1);
    this.loadCounts();
    // Total de convites recebidos pro contador da aba (a aba Solicitações recarrega ao abrir).
    if (this.tab() !== 'requests') this.receivedInvites.load(1);
    this.friendService.getMyPresence().subscribe({
      next: (me) => this.me.set(me),
      error: () => undefined,
    });
    this.socket.acquire();
    this.subs.add(this.socket.events.subscribe((event) => this.onSocialEvent(event)));
    this.subs.add(this.socket.reconnected.subscribe(() => this.refreshCurrentTab()));
    // Notificação clicada com a página já aberta só troca o ?aba= (o componente não é recriado).
    if (this.route.queryParamMap) {
      this.subs.add(
        this.route.queryParamMap.pipe(skip(1)).subscribe((params) => {
          const aba = params.get('aba');
          if (isFriendsTab(aba)) this.selectTab(aba);
        }),
      );
    }
  }

  ngOnDestroy(): void {
    if (this.filterTimer) clearTimeout(this.filterTimer);
    this.subs.unsubscribe();
    this.socket.release();
  }

  selectTab(tab: FriendsTab): void {
    if (this.tab() === tab) return;
    this.tab.set(tab);
    this.message.set('');
    // A URL acompanha a aba: o link de uma notificação sempre muda a URL e troca a aba.
    this.router
      .navigate(['/amigos'], { queryParams: { aba: tab === 'all' ? null : tab }, replaceUrl: true })
      .catch(() => undefined);
    if (tab === 'all') this.friends.load(1);
    if (tab === 'online') this.online.load(1);
    if (tab === 'requests') {
      this.received.load(1);
      this.sent.load(1);
      this.receivedInvites.load(1);
      this.sentInvites.load(1);
    }
    if (tab === 'blocked') this.blocked.load(1);
    if (tab === 'discover' && this.searched()) this.results.load();
  }

  onFilterChange(value: string): void {
    this.filter.set(value);
    if (this.filterTimer) clearTimeout(this.filterTimer);
    this.filterTimer = setTimeout(() => this.friends.load(1), FILTER_DEBOUNCE_MS);
  }

  search(): void {
    if (!this.canSearch()) return;
    this.searched.set(this.query().trim());
    this.results.load(1);
  }

  isBusy(id: string): boolean {
    return this.busy().has(id);
  }

  // ----- meu status -----

  setStatus(status: ChosenPresenceStatus): void {
    if (this.me()?.status === status) return;
    this.updateMe({ status });
  }

  toggleAvailability(): void {
    const me = this.me();
    if (me) this.updateMe({ availability: availabilityToggle(me.availability) });
  }

  private updateMe(update: Parameters<FriendService['setMyPresence']>[0]): void {
    this.friendService.setMyPresence(update).subscribe({
      next: (me) => this.me.set(me),
      error: (err) => this.notify(apiErrorMessage(err, 'Não foi possível trocar o status.'), true),
    });
  }

  // ----- tempo real -----

  onSocialEvent(event: SocialEvent): void {
    switch (event.type) {
      case 'presence_updated': {
        const { id, ...presence } = event.friend;
        const apply = (f: Friend) => ({ ...f, ...presence });
        this.friends.patch((f) => f.id === id, apply);
        // Na aba Online, entrar/sair muda a lista: recarrega.
        if (this.tab() === 'online') this.online.load();
        return;
      }
      case 'social_changed':
        if (event.scope === 'requests') this.loadCounts();
        if (event.scope === 'invites') {
          this.receivedInvites.load();
          if (this.tab() === 'requests') this.sentInvites.load();
          return;
        }
        if (
          (event.scope === 'friends' && (this.tab() === 'all' || this.tab() === 'online')) ||
          (event.scope === 'requests' && this.tab() === 'requests') ||
          (event.scope === 'blocked' && this.tab() === 'blocked')
        )
          this.refreshCurrentTab();
        return;
      case 'notification_created':
        this.loadCounts();
        return;
    }
  }

  // ----- amigos -----

  removeFriend(friend: Friend): void {
    if (!confirm(`Desfazer a amizade com ${friend.username}?`)) return;
    this.run(friend.id, this.friendService.removeFriend(friend.id), () => {
      this.notify(`Você e ${friend.username} não são mais amigos.`);
      this.friends.reloadAfterRemoval();
    });
  }

  blockUser(user: { id: string; username: string }): void {
    if (
      !confirm(
        `Bloquear ${user.username}? A amizade e as solicitações entre vocês serão desfeitas, e ` +
          'vocês não poderão mais se adicionar.',
      )
    )
      return;
    this.run(user.id, this.friendService.block(user.id), () => {
      this.notify(`${user.username} foi bloqueado.`);
      this.refreshCurrentTab();
      this.loadCounts();
    });
  }

  // ----- solicitações -----

  accept(request: FriendRequestView): void {
    this.run(
      request.id_friend_request,
      this.friendService.acceptRequest(request.id_friend_request),
      () => {
        this.notify(`Agora você e ${request.user.username} são amigos.`);
        this.received.reloadAfterRemoval();
        this.loadCounts();
      },
    );
  }

  reject(request: FriendRequestView): void {
    this.run(
      request.id_friend_request,
      this.friendService.rejectRequest(request.id_friend_request),
      () => {
        this.notify('Solicitação recusada.');
        this.received.reloadAfterRemoval();
        this.loadCounts();
      },
    );
  }

  cancel(request: FriendRequestView): void {
    this.run(
      request.id_friend_request,
      this.friendService.cancelRequest(request.id_friend_request),
      () => {
        this.notify('Solicitação cancelada.');
        this.sent.reloadAfterRemoval();
      },
    );
  }

  // ----- descobrir -----

  /** Botão principal do jogador encontrado: adicionar, aceitar, cancelar ou desbloquear. */
  discoverPrimary(player: PlayerSearchResult): void {
    const requestId = player.id_friend_request;
    switch (player.relationship) {
      case 'none':
        this.run(player.id, this.friendService.sendRequest(player.id), (res) => {
          this.notify(
            res.status === 'accepted'
              ? `Agora você e ${player.username} são amigos.`
              : `Solicitação enviada para ${player.username}.`,
          );
          this.results.load();
        });
        return;
      case 'request_sent':
        if (!requestId) return;
        this.run(player.id, this.friendService.cancelRequest(requestId), () => {
          this.notify('Solicitação cancelada.');
          this.results.load();
        });
        return;
      case 'request_received':
        if (!requestId) return;
        this.run(player.id, this.friendService.acceptRequest(requestId), () => {
          this.notify(`Agora você e ${player.username} são amigos.`);
          this.results.load();
          this.loadCounts();
        });
        return;
      case 'blocked':
        this.unblock(player);
        return;
      default:
        return;
    }
  }

  // ----- bloqueados -----

  unblock(user: { id: string; username: string }): void {
    this.run(user.id, this.friendService.unblock(user.id), () => {
      this.notify(`${user.username} foi desbloqueado.`);
      this.refreshCurrentTab();
    });
  }

  // ----- convites para mesa -----

  openInvite(user: SocialUser): void {
    this.message.set('');
    this.inviteTarget.set({ id: user.id, username: user.username });
  }

  onInviteSent(sessionName: string): void {
    const who = this.inviteTarget()?.username ?? '';
    this.inviteTarget.set(null);
    this.notify(`Convite enviado para ${who}${sessionName ? ` (${sessionName})` : ''}.`);
    if (this.tab() === 'requests') this.sentInvites.load();
  }

  openAccept(invite: SessionInviteView): void {
    this.message.set('');
    this.acceptTarget.set(invite);
  }

  onJoined(idGameSession: string): void {
    this.acceptTarget.set(null);
    this.router.navigate(['/session', idGameSession]);
  }

  rejectInvite(invite: SessionInviteView): void {
    this.run(invite.id_session_invite, this.inviteService.reject(invite.id_session_invite), () => {
      this.notify('Convite recusado.');
      this.receivedInvites.reloadAfterRemoval();
    });
  }

  cancelInvite(invite: SessionInviteView): void {
    this.run(invite.id_session_invite, this.inviteService.cancel(invite.id_session_invite), () => {
      this.notify('Convite cancelado.');
      this.sentInvites.reloadAfterRemoval();
    });
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  private refreshCurrentTab(): void {
    switch (this.tab()) {
      case 'all':
        this.friends.reloadAfterRemoval();
        return;
      case 'online':
        this.online.reloadAfterRemoval();
        return;
      case 'requests':
        this.received.load();
        this.sent.load();
        this.receivedInvites.load();
        this.sentInvites.load();
        return;
      case 'discover':
        this.results.load();
        return;
      case 'blocked':
        this.blocked.reloadAfterRemoval();
        return;
    }
  }

  private loadCounts(): void {
    this.friendService.getRequestCounts().subscribe({
      next: (counts) => this.receivedCount.set(counts.received),
      error: () => undefined,
    });
  }

  private notify(text: string, isError = false): void {
    this.message.set(text);
    this.messageIsError.set(isError);
  }

  private run<T>(id: string, action: Observable<T>, onSuccess: (result: T) => void): void {
    if (this.isBusy(id)) return;
    this.busy.update((set) => new Set(set).add(id));
    const done = () =>
      this.busy.update((set) => {
        const next = new Set(set);
        next.delete(id);
        return next;
      });
    action.subscribe({
      next: (result) => {
        done();
        onSuccess(result);
      },
      error: (err) => {
        done();
        this.notify(
          apiErrorMessage(err, 'Não foi possível concluir a ação. Tente novamente.'),
          true,
        );
      },
    });
  }
}
