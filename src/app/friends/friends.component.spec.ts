import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  ParamMap,
  provideRouter,
  Router,
} from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { FriendsComponent } from './friends.component';
import { FriendService } from '../services/friend.service';
import { SocialSocketService } from '../services/social-socket.service';
import { SessionInviteService } from '../services/session-invite.service';
import {
  SessionInviteView,
  SocialEvent,
  Friend,
  FriendRequestView,
  PagedList,
  PlayerSearchResult,
} from '../models/friend.interface';

function paged<T>(items: T[], total = items.length): PagedList<T> {
  return { items, page: 1, pageSize: 12, total_count: total };
}

const FRIEND: Friend = {
  id: 'f1',
  username: 'gorak',
  friends_since: '2026-11-01T00:00:00Z',
  presence: 'offline',
  availability: null,
  last_seen_at: null,
};
const INVITE: SessionInviteView = {
  id_session_invite: 'i1',
  id_game_session: 's1',
  session_name: 'A Mina Perdida',
  message: 'Sábado às 20h',
  created_at: '2026-11-03T00:00:00Z',
  expires_at: '2026-11-10T00:00:00Z',
  user: { id: 'dm1', username: 'mestre' },
};
const REQUEST: FriendRequestView = {
  id_friend_request: 'r1',
  created_at: '2026-11-02T00:00:00Z',
  user: { id: 'u2', username: 'elora' },
};

function player(overrides: Partial<PlayerSearchResult> = {}): PlayerSearchResult {
  return {
    id: 'p1',
    username: 'thorin',
    relationship: 'none',
    id_friend_request: null,
    ...overrides,
  };
}

/** Lógica da página de Amigos sem renderizar o template. */
describe('FriendsComponent', () => {
  let component: FriendsComponent;
  let friendService: Record<string, ReturnType<typeof vi.fn>>;
  let socket: {
    acquire: ReturnType<typeof vi.fn>;
    release: ReturnType<typeof vi.fn>;
    events: Subject<SocialEvent>;
    reconnected: Subject<void>;
  };
  let queryAba: string | null;
  let queryParams$: BehaviorSubject<ParamMap>;
  let invites: Record<string, ReturnType<typeof vi.fn>>;

  function create() {
    queryParams$ = new BehaviorSubject(convertToParamMap(queryAba ? { aba: queryAba } : {}));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: FriendService, useValue: friendService },
        { provide: SocialSocketService, useValue: socket },
        { provide: SessionInviteService, useValue: invites },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap(queryAba ? { aba: queryAba } : {}) },
            queryParamMap: queryParams$,
          },
        },
      ],
    });
    component = TestBed.runInInjectionContext(() => new FriendsComponent());
    component.ngOnInit();
  }

  beforeEach(() => {
    queryAba = null;
    invites = {
      list: vi.fn().mockReturnValue(of(paged([INVITE]))),
      reject: vi.fn().mockReturnValue(of({})),
      cancel: vi.fn().mockReturnValue(of({})),
    };
    socket = {
      acquire: vi.fn(),
      release: vi.fn(),
      events: new Subject<SocialEvent>(),
      reconnected: new Subject<void>(),
    };
    friendService = {
      getFriends: vi.fn().mockReturnValue(of(paged([FRIEND]))),
      getRequests: vi.fn().mockReturnValue(of(paged([REQUEST]))),
      getRequestCounts: vi.fn().mockReturnValue(of({ received: 3, sent: 1 })),
      searchPlayers: vi.fn().mockReturnValue(of(paged([player()]))),
      getBlocked: vi.fn().mockReturnValue(of(paged([]))),
      sendRequest: vi.fn().mockReturnValue(of({ status: 'pending', request: {} })),
      acceptRequest: vi.fn().mockReturnValue(of({})),
      rejectRequest: vi.fn().mockReturnValue(of({})),
      cancelRequest: vi.fn().mockReturnValue(of({})),
      removeFriend: vi.fn().mockReturnValue(of(undefined)),
      block: vi.fn().mockReturnValue(of({ friendshipRemoved: true })),
      unblock: vi.fn().mockReturnValue(of(undefined)),
      getMyPresence: vi
        .fn()
        .mockReturnValue(of({ status: 'online', availability: 'not_available', connected: true })),
      setMyPresence: vi
        .fn()
        .mockImplementation((u) =>
          of({ status: 'online', availability: 'not_available', connected: true, ...u }),
        ),
    };
    create();
  });

  describe('convites para mesa', () => {
    it('contador da aba soma solicitações e convites recebidos', () => {
      expect(invites['list']).toHaveBeenCalledWith('received', 1, 12);
      expect(component.pendingCount()).toBe(4);
    });

    it('aba de solicitações carrega convites recebidos e enviados', () => {
      invites['list'].mockClear();
      component.selectTab('requests');
      expect(invites['list']).toHaveBeenCalledWith('received', 1, 12);
      expect(invites['list']).toHaveBeenCalledWith('sent', 1, 12);
    });

    it('convidar abre o modal com o amigo; enviado fecha e avisa', () => {
      component.openInvite(FRIEND);
      expect(component.inviteTarget()).toEqual({ id: 'f1', username: 'gorak' });
      component.onInviteSent('A Mina Perdida');
      expect(component.inviteTarget()).toBeNull();
      expect(component.message()).toContain('gorak');
    });

    it('entrar abre a escolha de personagem; depois vai pra mesa', () => {
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      component.openAccept(INVITE);
      expect(component.acceptTarget()).toBe(INVITE);
      component.onJoined('s1');
      expect(component.acceptTarget()).toBeNull();
      expect(navigate).toHaveBeenCalledWith(['/session', 's1']);
    });

    it('recusar e cancelar convite', () => {
      component.rejectInvite(INVITE);
      expect(invites['reject']).toHaveBeenCalledWith('i1');
      component.cancelInvite(INVITE);
      expect(invites['cancel']).toHaveBeenCalledWith('i1');
    });

    it('evento de convites recarrega os recebidos', () => {
      invites['list'].mockClear();
      socket.events.next({ type: 'social_changed', user_id: 'me', scope: 'invites' });
      expect(invites['list']).toHaveBeenCalledWith('received', 1, 12);
    });
  });

  describe('presença e tempo real', () => {
    it('segura a conexão social enquanto a página está aberta', () => {
      expect(socket.acquire).toHaveBeenCalledTimes(1);
      component.ngOnDestroy();
      expect(socket.release).toHaveBeenCalledTimes(1);
    });

    it('carrega meu status', () => {
      expect(component.me()?.status).toBe('online');
    });

    it('trocar status e disponibilidade', () => {
      component.setStatus('busy');
      expect(friendService['setMyPresence']).toHaveBeenCalledWith({ status: 'busy' });
      expect(component.me()?.status).toBe('busy');
      component.setStatus('busy');
      expect(friendService['setMyPresence']).toHaveBeenCalledTimes(1);
      component.toggleAvailability();
      expect(friendService['setMyPresence']).toHaveBeenLastCalledWith({
        availability: 'available',
      });
    });

    it('aba Online pede só os conectados', () => {
      component.selectTab('online');
      expect(friendService['getFriends']).toHaveBeenLastCalledWith(1, 12, '', true);
    });

    it('presença de um amigo muda no lugar, sem recarregar a lista', () => {
      friendService['getFriends'].mockClear();
      socket.events.next({
        type: 'presence_updated',
        user_id: 'me',
        friend: { id: 'f1', presence: 'away', availability: 'available', last_seen_at: null },
      });
      expect(component.friends.items()[0]).toMatchObject({
        presence: 'away',
        availability: 'available',
      });
      expect(friendService['getFriends']).not.toHaveBeenCalled();
    });

    it('na aba Online, mudança de presença recarrega a lista', () => {
      component.selectTab('online');
      friendService['getFriends'].mockClear();
      socket.events.next({
        type: 'presence_updated',
        user_id: 'me',
        friend: { id: 'f9', presence: 'online', availability: null, last_seen_at: null },
      });
      expect(friendService['getFriends']).toHaveBeenCalledWith(1, 12, '', true);
    });

    it('social_changed de amigos recarrega a aba de amigos; de solicitações, o contador', () => {
      friendService['getFriends'].mockClear();
      friendService['getRequestCounts'].mockClear();
      socket.events.next({ type: 'social_changed', user_id: 'me', scope: 'friends' });
      expect(friendService['getFriends']).toHaveBeenCalled();
      socket.events.next({ type: 'social_changed', user_id: 'me', scope: 'requests' });
      expect(friendService['getRequestCounts']).toHaveBeenCalled();
    });

    it('evento de outra aba não recarrega a atual', () => {
      friendService['getBlocked'].mockClear();
      socket.events.next({ type: 'social_changed', user_id: 'me', scope: 'blocked' });
      expect(friendService['getBlocked']).not.toHaveBeenCalled();
    });

    it('reconectar recarrega a aba atual (cobre eventos perdidos)', () => {
      friendService['getFriends'].mockClear();
      socket.reconnected.next();
      expect(friendService['getFriends']).toHaveBeenCalled();
    });
  });

  it('link da notificação abre direto na aba pedida', () => {
    TestBed.resetTestingModule();
    queryAba = 'requests';
    friendService['getRequests'].mockClear();
    create();
    expect(component.tab()).toBe('requests');
    expect(friendService['getRequests']).toHaveBeenCalledWith('received', 1, 12);
  });

  it('notificação clicada com a página aberta troca a aba pelo ?aba=', () => {
    expect(component.tab()).toBe('all');
    queryParams$.next(convertToParamMap({ aba: 'requests' }));
    expect(component.tab()).toBe('requests');
    queryParams$.next(convertToParamMap({ aba: 'hackear' }));
    expect(component.tab()).toBe('requests');
  });

  it('trocar de aba atualiza o ?aba= da URL', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.selectTab('blocked');
    expect(navigate).toHaveBeenCalledWith(['/amigos'], {
      queryParams: { aba: 'blocked' },
      replaceUrl: true,
    });
    component.selectTab('all');
    expect(navigate).toHaveBeenLastCalledWith(['/amigos'], {
      queryParams: { aba: null },
      replaceUrl: true,
    });
  });

  it('aba desconhecida na URL fica em Todos', () => {
    TestBed.resetTestingModule();
    queryAba = 'hackear';
    create();
    expect(component.tab()).toBe('all');
  });

  afterEach(() => vi.restoreAllMocks());

  it('abre com a lista de amigos e o contador de solicitações recebidas', () => {
    expect(friendService['getFriends']).toHaveBeenCalledWith(1, 12, '');
    expect(component.friends.items()).toEqual([FRIEND]);
    expect(component.receivedCount()).toBe(3);
  });

  it('erro ao carregar marca o estado de erro', () => {
    friendService['getFriends'].mockReturnValue(throwError(() => new Error('x')));
    component.friends.load(1);
    expect(component.friends.error()).toBe(true);
    expect(component.friends.loading()).toBe(false);
  });

  it('aba de solicitações carrega recebidas e enviadas', () => {
    component.selectTab('requests');
    expect(friendService['getRequests']).toHaveBeenCalledWith('received', 1, 12);
    expect(friendService['getRequests']).toHaveBeenCalledWith('sent', 1, 12);
  });

  it('filtro espera a pessoa parar de digitar', () => {
    vi.useFakeTimers();
    friendService['getFriends'].mockClear();
    component.onFilterChange('go');
    component.onFilterChange('gor');
    expect(friendService['getFriends']).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(friendService['getFriends']).toHaveBeenCalledTimes(1);
    expect(friendService['getFriends']).toHaveBeenCalledWith(1, 12, 'gor');
    vi.useRealTimers();
  });

  it('busca só com 2 letras ou mais, e mostra o termo buscado', () => {
    component.query.set('t');
    component.search();
    expect(friendService['searchPlayers']).not.toHaveBeenCalled();
    component.query.set(' thor ');
    component.search();
    expect(friendService['searchPlayers']).toHaveBeenCalledWith('thor', 1, 12);
    expect(component.searched()).toBe('thor');
  });

  it('adicionar jogador encontrado envia a solicitação e recarrega a busca', () => {
    component.query.set('thor');
    component.search();
    friendService['searchPlayers'].mockClear();
    component.discoverPrimary(player());
    expect(friendService['sendRequest']).toHaveBeenCalledWith('p1');
    expect(component.message()).toContain('Solicitação enviada');
    expect(friendService['searchPlayers']).toHaveBeenCalled();
  });

  it('pedido inverso: enviar vira amizade na hora', () => {
    friendService['sendRequest'].mockReturnValue(of({ status: 'accepted', request: {} }));
    component.discoverPrimary(player());
    expect(component.message()).toContain('são amigos');
  });

  it('jogador com pedido recebido: o botão aceita a solicitação dele', () => {
    component.discoverPrimary(
      player({ relationship: 'request_received', id_friend_request: 'r9' }),
    );
    expect(friendService['acceptRequest']).toHaveBeenCalledWith('r9');
  });

  it('jogador com pedido enviado: o botão cancela', () => {
    component.discoverPrimary(player({ relationship: 'request_sent', id_friend_request: 'r8' }));
    expect(friendService['cancelRequest']).toHaveBeenCalledWith('r8');
  });

  it('já amigo: nada acontece', () => {
    component.discoverPrimary(player({ relationship: 'friend' }));
    expect(friendService['sendRequest']).not.toHaveBeenCalled();
  });

  it('aceitar e recusar solicitação recebida', () => {
    component.accept(REQUEST);
    expect(friendService['acceptRequest']).toHaveBeenCalledWith('r1');
    component.reject(REQUEST);
    expect(friendService['rejectRequest']).toHaveBeenCalledWith('r1');
  });

  it('remover amigo pede confirmação', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.removeFriend(FRIEND);
    expect(friendService['removeFriend']).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    component.removeFriend(FRIEND);
    expect(friendService['removeFriend']).toHaveBeenCalledWith('f1');
  });

  it('bloquear pede confirmação e atualiza o contador', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    friendService['getRequestCounts'].mockClear();
    component.blockUser(FRIEND);
    expect(friendService['block']).toHaveBeenCalledWith('f1');
    expect(friendService['getRequestCounts']).toHaveBeenCalled();
  });

  it('erro da API vira mensagem de erro e libera o botão', () => {
    friendService['sendRequest'].mockReturnValue(
      throwError(() => ({ error: { error: { message: 'Solicitação já enviada' } } })),
    );
    component.discoverPrimary(player());
    expect(component.message()).toBe('Solicitação já enviada');
    expect(component.messageIsError()).toBe(true);
    expect(component.isBusy('p1')).toBe(false);
  });

  it('ignora clique repetido enquanto a ação está em andamento', () => {
    const pending = { subscribe: vi.fn() };
    friendService['sendRequest'].mockReturnValue(pending);
    component.discoverPrimary(player());
    component.discoverPrimary(player());
    expect(pending.subscribe).toHaveBeenCalledTimes(1);
    expect(component.isBusy('p1')).toBe(true);
  });

  it('remover o último item da página volta uma página', () => {
    friendService['getFriends'].mockReturnValue(of({ ...paged([FRIEND], 13), page: 2 }));
    component.friends.load(2);
    friendService['getFriends'].mockClear();
    component.friends.reloadAfterRemoval();
    expect(friendService['getFriends']).toHaveBeenCalledWith(1, 12, '');
  });
});
