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
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { SkeletonRowsComponent } from '../skeleton/skeleton-rows.component';
import { FriendService } from '../services/friend.service';
import { SocialSocketService } from '../services/social-socket.service';
import { SessionInviteService } from '../services/session-invite.service';
import {
  InviteSubmission,
  SessionInviteModalComponent,
} from '../session-invite-modal/session-invite-modal.component';
import { InviteAcceptModalComponent } from '../session-invite-modal/invite-accept-modal.component';
import { IconActionComponent } from './icon-action.component';
import { PagedState } from './paged-state';
import { apiErrorMessage } from '../auth/auth-errors';
import {
  BlockedUser,
  ChosenPresenceStatus,
  Friend,
  FriendRequestView,
  MyPresence,
  PlayerSearchResult,
  SessionInviteView,
  SocialEvent,
  SocialUser,
} from '../models/friend.interface';
import {
  availabilityToggle,
  discoverAction,
  MY_STATUS_OPTIONS,
  presenceLine,
  FRIENDS_PAGE_SIZE,
  PLAYER_SEARCH_MIN_LENGTH,
  shortDate,
} from './friends-page';

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Amigos (1.18.0), tudo numa tela só: amigos (conectados primeiro), busca de jogadores, pedidos,
 * convites e bloqueados. As regras (duplicidade, bloqueio, permissões, privacidade da presença)
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
    IconActionComponent,
  ],
  templateUrl: './friends.component.html',
  styleUrls: ['./friends.component.scss'],
})
export class FriendsComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private friendService = inject(FriendService);
  private socket = inject(SocialSocketService);
  private inviteService = inject(SessionInviteService);
  private subs = new Subscription();

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
  blockedOpen = signal(false);

  /** O mesmo campo filtra os amigos e busca outros jogadores. */
  query = signal('');
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  /** Termo da última busca de jogadores; vazio enquanto não há letras suficientes. */
  searched = signal('');

  /** Feedback da última ação (aceitar, remover, bloquear…). */
  message = signal('');
  messageIsError = signal(false);
  /** Ids com ação em andamento: o botão fica desligado até a resposta. */
  busy = signal<ReadonlySet<string>>(new Set());

  friends = new PagedState<Friend>((page) =>
    this.friendService.getFriends(page, FRIENDS_PAGE_SIZE, this.query()),
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
  /** Resultado da busca sem quem já é amigo (esses aparecem nos cards de cima). */
  otherPlayers = computed(() => this.results.items().filter((p) => p.relationship !== 'friend'));

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.blockedOpen.set(false);
  }

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 768);
  }

  ngOnInit(): void {
    this.refreshAll();
    this.friendService.getMyPresence().subscribe({
      next: (me) => this.me.set(me),
      error: () => undefined,
    });
    this.socket.acquire();
    this.subs.add(this.socket.events.subscribe((event) => this.onSocialEvent(event)));
    this.subs.add(this.socket.reconnected.subscribe(() => this.refreshAll()));
  }

  ngOnDestroy(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.subs.unsubscribe();
    this.socket.release();
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.search(), SEARCH_DEBOUNCE_MS);
  }

  search(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.friends.load(1);
    const term = this.query().trim();
    this.searched.set(term.length >= PLAYER_SEARCH_MIN_LENGTH ? term : '');
    if (this.searched()) this.results.load(1);
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
    if (event.type === 'presence_updated') {
      // O card acende ou apaga no lugar; a ordem só muda na próxima carga, sem cards pulando.
      const { id, ...presence } = event.friend;
      this.friends.patch(
        (f) => f.id === id,
        (f) => ({ ...f, ...presence }),
      );
      return;
    }
    if (event.type !== 'social_changed') return;
    switch (event.scope) {
      case 'friends':
        this.friends.load();
        break;
      case 'requests':
        this.received.load();
        this.sent.load();
        break;
      case 'invites':
        this.receivedInvites.load();
        this.sentInvites.load();
        return;
      case 'blocked':
        this.blocked.load();
        break;
    }
    this.reloadResults();
  }

  // ----- amigos -----

  removeFriend(friend: Friend): void {
    if (!confirm(`Desfazer a amizade com ${friend.username}?`)) return;
    this.removeCard(
      this.friends,
      (f) => f.id === friend.id,
      friend.id,
      this.friendService.removeFriend(friend.id),
      () => this.notify(`Você e ${friend.username} não são mais amigos.`),
    );
  }

  blockUser(user: { id: string; username: string }): void {
    if (this.isBusy(user.id)) return;
    if (
      !confirm(
        `Bloquear ${user.username}? A amizade e as solicitações entre vocês serão desfeitas, e ` +
          'vocês não poderão mais se adicionar.',
      )
    )
      return;
    const undo = this.showBlockedNow(user.id);
    this.run(
      user.id,
      this.friendService.block(user.id),
      () => {
        this.notify(`${user.username} foi bloqueado.`);
        this.refreshAll();
      },
      undo,
    );
  }

  /** O que muda na tela assim que se bloqueia alguém. Devolve como desfazer. */
  private showBlockedNow(userId: string): () => void {
    const undoFriend = this.friends.removeNow((f) => f.id === userId);
    const undoRequest = this.received.removeNow((r) => r.user.id === userId);
    const player = this.results.items().find((p) => p.id === userId);
    if (player) this.setPlayer(userId, 'blocked');
    return () => {
      undoFriend();
      undoRequest();
      if (player) this.setPlayer(userId, player.relationship, player.id_friend_request);
    };
  }

  // ----- solicitações -----

  accept(request: FriendRequestView): void {
    this.removeCard(
      this.received,
      (r) => r.id_friend_request === request.id_friend_request,
      request.id_friend_request,
      this.friendService.acceptRequest(request.id_friend_request),
      () => {
        this.notify(`Agora você e ${request.user.username} são amigos.`);
        this.friends.load();
      },
    );
  }

  reject(request: FriendRequestView): void {
    this.removeCard(
      this.received,
      (r) => r.id_friend_request === request.id_friend_request,
      request.id_friend_request,
      this.friendService.rejectRequest(request.id_friend_request),
      () => this.notify('Solicitação recusada.'),
    );
  }

  cancel(request: FriendRequestView): void {
    this.removeCard(
      this.sent,
      (r) => r.id_friend_request === request.id_friend_request,
      request.id_friend_request,
      this.friendService.cancelRequest(request.id_friend_request),
      () => this.notify('Solicitação cancelada.'),
    );
  }

  // ----- descobrir -----

  /** Botão principal do jogador encontrado: adicionar, aceitar, cancelar ou desbloquear. */
  discoverPrimary(player: PlayerSearchResult): void {
    const requestId = player.id_friend_request;
    switch (player.relationship) {
      case 'none':
        this.runOnPlayer(
          player,
          'request_sent',
          this.friendService.sendRequest(player.id),
          (res) => {
            // Só com a resposta dá pra cancelar: é ela que traz o id do pedido.
            if (res.status === 'accepted') this.setPlayer(player.id, 'friend');
            else this.setPlayer(player.id, 'request_sent', res.request.id_friend_request);
            this.notify(
              res.status === 'accepted'
                ? `Agora você e ${player.username} são amigos.`
                : `Solicitação enviada para ${player.username}.`,
            );
            this.results.load();
            this.sent.load();
            if (res.status === 'accepted') {
              this.received.load();
              this.friends.load();
            }
          },
        );
        return;
      case 'request_sent':
        if (!requestId) return;
        this.runOnPlayer(player, 'none', this.friendService.cancelRequest(requestId), () => {
          this.notify('Solicitação cancelada.');
          this.results.load();
          this.sent.load();
        });
        return;
      case 'request_received':
        if (!requestId) return;
        this.runOnPlayer(player, 'friend', this.friendService.acceptRequest(requestId), () => {
          this.notify(`Agora você e ${player.username} são amigos.`);
          this.results.load();
          this.received.load();
          this.friends.load();
        });
        return;
      case 'blocked':
        this.runOnPlayer(player, 'none', this.friendService.unblock(player.id), () => {
          this.notify(`${player.username} foi desbloqueado.`);
          this.results.load();
          this.blocked.load();
        });
        return;
      default:
        return;
    }
  }

  private setPlayer(
    id: string,
    relationship: PlayerSearchResult['relationship'],
    id_friend_request: string | null = null,
  ): void {
    this.results.patch(
      (p) => p.id === id,
      (p) => ({ ...p, relationship, id_friend_request }),
    );
  }

  /** O botão muda já no clique, travado até a resposta; se a ação falhar, volta como estava. */
  private runOnPlayer<R>(
    player: PlayerSearchResult,
    relationship: PlayerSearchResult['relationship'],
    action: Observable<R>,
    onSuccess: (result: R) => void,
  ): void {
    if (this.isBusy(player.id)) return;
    this.setPlayer(player.id, relationship);
    this.run(player.id, action, onSuccess, () =>
      this.setPlayer(player.id, player.relationship, player.id_friend_request),
    );
  }

  // ----- bloqueados -----

  unblock(user: { id: string; username: string }): void {
    this.removeCard(
      this.blocked,
      (b) => b.id === user.id,
      user.id,
      this.friendService.unblock(user.id),
      () => this.notify(`${user.username} foi desbloqueado.`),
    );
  }

  // ----- convites para mesa -----

  openInvite(user: SocialUser): void {
    this.message.set('');
    this.inviteTarget.set({ id: user.id, username: user.username });
  }

  /** A janela fecha já no clique; se a API recusar, o motivo aparece na mensagem da página. */
  sendInvite(invite: InviteSubmission): void {
    const target = this.inviteTarget();
    if (!target || this.isBusy(target.id)) return;
    this.inviteTarget.set(null);
    this.run(
      target.id,
      this.inviteService.send(invite.id_game_session, target.id, invite.message),
      () => {
        this.notify(`Convite enviado para ${target.username} (${invite.session_name}).`);
        this.sentInvites.load();
      },
    );
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
    this.removeCard(
      this.receivedInvites,
      (i) => i.id_session_invite === invite.id_session_invite,
      invite.id_session_invite,
      this.inviteService.reject(invite.id_session_invite),
      () => this.notify('Convite recusado.'),
    );
  }

  cancelInvite(invite: SessionInviteView): void {
    this.removeCard(
      this.sentInvites,
      (i) => i.id_session_invite === invite.id_session_invite,
      invite.id_session_invite,
      this.inviteService.cancel(invite.id_session_invite),
      () => this.notify('Convite cancelado.'),
    );
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  private refreshAll(): void {
    this.friends.load();
    this.received.load();
    this.sent.load();
    this.receivedInvites.load();
    this.sentInvites.load();
    this.blocked.load();
    this.reloadResults();
  }

  private reloadResults(): void {
    if (this.searched()) this.results.load();
  }

  /** O card some já no clique e volta se a ação falhar. */
  private removeCard<I, R>(
    state: PagedState<I>,
    match: (item: I) => boolean,
    busyId: string,
    action: Observable<R>,
    onSuccess: () => void,
  ): void {
    if (this.isBusy(busyId)) return;
    const undo = state.removeNow(match);
    this.run(
      busyId,
      action,
      () => {
        onSuccess();
        state.load();
      },
      undo,
    );
  }

  private notify(text: string, isError = false): void {
    this.message.set(text);
    this.messageIsError.set(isError);
  }

  private run<T>(
    id: string,
    action: Observable<T>,
    onSuccess: (result: T) => void,
    onError?: () => void,
  ): void {
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
        onError?.();
        this.notify(
          apiErrorMessage(err, 'Não foi possível concluir a ação. Tente novamente.'),
          true,
        );
      },
    });
  }
}
