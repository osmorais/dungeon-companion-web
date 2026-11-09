import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { FriendsComponent } from './friends.component';
import { PagedState } from './paged-state';
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

describe('PagedState', () => {
  it('resposta antiga que chega depois não sobrescreve a mais nova', () => {
    const responses: Subject<PagedList<string>>[] = [];
    const state = new PagedState<string>(() => {
      const response = new Subject<PagedList<string>>();
      responses.push(response);
      return response;
    });
    state.load(1);
    state.load(2);
    responses[1].next(paged(['nova'], 13));
    responses[0].next(paged(['antiga'], 99));
    expect(state.items()).toEqual(['nova']);
    expect(state.total()).toBe(13);
    expect(state.page()).toBe(2);
  });

  it('erro de chamada antiga não marca a lista como erro nem encerra o loading', () => {
    const responses: Subject<PagedList<string>>[] = [];
    const state = new PagedState<string>(() => {
      const response = new Subject<PagedList<string>>();
      responses.push(response);
      return response;
    });
    state.load(1);
    state.load(2);
    responses[0].error(new Error('x'));
    expect(state.error()).toBe(false);
    expect(state.loading()).toBe(true);
  });

  it('página além do fim volta para a última que tem itens', () => {
    const pages: Record<number, PagedList<string>> = {
      1: paged(['a', 'b'], 12),
      2: paged([], 0),
    };
    const fetch = vi.fn((page: number) => of(pages[page]));
    const state = new PagedState<string>(fetch);
    state.load(2);
    expect(fetch.mock.calls.map(([page]) => page)).toEqual([2, 1]);
    expect(state.page()).toBe(1);
    expect(state.items()).toEqual(['a', 'b']);
    expect(state.total()).toBe(12);
    expect(state.loading()).toBe(false);
  });

  it('página 1 vazia é lista vazia, sem nova chamada', () => {
    const fetch = vi.fn(() => of(paged<string>([], 0)));
    const state = new PagedState<string>(fetch);
    state.load(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(state.items()).toEqual([]);
    expect(state.loading()).toBe(false);
  });
});

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
  let invites: Record<string, ReturnType<typeof vi.fn>>;

  function create() {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: FriendService, useValue: friendService },
        { provide: SocialSocketService, useValue: socket },
        { provide: SessionInviteService, useValue: invites },
      ],
    });
    component = TestBed.runInInjectionContext(() => new FriendsComponent());
    component.ngOnInit();
  }

  beforeEach(() => {
    invites = {
      list: vi.fn().mockReturnValue(of(paged([INVITE]))),
      send: vi.fn().mockReturnValue(of({})),
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
    it('abre já com convites recebidos e enviados', () => {
      expect(invites['list']).toHaveBeenCalledWith('received', 1, 12);
      expect(invites['list']).toHaveBeenCalledWith('sent', 1, 12);
    });

    const SUBMISSION = { id_game_session: 's1', session_name: 'A Mina Perdida', message: 'Bora?' };

    it('convidar abre o modal com o amigo; enviado avisa', () => {
      component.openInvite(FRIEND);
      expect(component.inviteTarget()).toEqual({ id: 'f1', username: 'gorak' });
      component.sendInvite(SUBMISSION);
      expect(invites['send']).toHaveBeenCalledWith('s1', 'f1', 'Bora?');
      expect(component.inviteTarget()).toBeNull();
      expect(component.message()).toContain('gorak');
    });

    it('o modal fecha antes da resposta e o amigo fica travado até ela', () => {
      const response = new Subject<object>();
      invites['send'].mockReturnValue(response);
      component.openInvite(FRIEND);
      component.sendInvite(SUBMISSION);
      expect(component.inviteTarget()).toBeNull();
      expect(component.isBusy('f1')).toBe(true);
      response.next({});
      expect(component.isBusy('f1')).toBe(false);
    });

    it('convite recusado pela API: o motivo aparece na página', () => {
      invites['send'].mockReturnValue(
        throwError(() => ({ error: { error: { message: 'A mesa já está cheia' } } })),
      );
      component.openInvite(FRIEND);
      component.sendInvite(SUBMISSION);
      expect(component.message()).toBe('A mesa já está cheia');
      expect(component.messageIsError()).toBe(true);
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

    it('cada evento recarrega só o que mudou', () => {
      const load = (scope: 'friends' | 'requests' | 'blocked') =>
        socket.events.next({ type: 'social_changed', user_id: 'me', scope });
      friendService['getFriends'].mockClear();
      friendService['getRequests'].mockClear();
      friendService['getBlocked'].mockClear();
      load('friends');
      expect(friendService['getFriends']).toHaveBeenCalledTimes(1);
      expect(friendService['getRequests']).not.toHaveBeenCalled();
      load('requests');
      expect(friendService['getRequests']).toHaveBeenCalledWith('received', 1, 12);
      expect(friendService['getRequests']).toHaveBeenCalledWith('sent', 1, 12);
      expect(friendService['getBlocked']).not.toHaveBeenCalled();
      load('blocked');
      expect(friendService['getBlocked']).toHaveBeenCalledTimes(1);
    });

    it('com uma busca aberta, evento atualiza também os resultados', () => {
      component.query.set('thor');
      component.search();
      friendService['searchPlayers'].mockClear();
      socket.events.next({ type: 'social_changed', user_id: 'me', scope: 'requests' });
      expect(friendService['searchPlayers']).toHaveBeenCalledTimes(1);
    });

    it('reconectar recarrega tudo (cobre eventos perdidos)', () => {
      friendService['getFriends'].mockClear();
      socket.reconnected.next();
      expect(friendService['getFriends']).toHaveBeenCalled();
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('abre tudo numa tela só: amigos, pedidos e bloqueados', () => {
    expect(friendService['getFriends']).toHaveBeenCalledWith(1, 12, '');
    expect(component.friends.items()).toEqual([FRIEND]);
    expect(friendService['getRequests']).toHaveBeenCalledWith('received', 1, 12);
    expect(friendService['getRequests']).toHaveBeenCalledWith('sent', 1, 12);
    expect(friendService['getBlocked']).toHaveBeenCalledWith(1, 12);
  });

  it('erro ao carregar marca o estado de erro', () => {
    friendService['getFriends'].mockReturnValue(throwError(() => new Error('x')));
    component.friends.load(1);
    expect(component.friends.error()).toBe(true);
    expect(component.friends.loading()).toBe(false);
  });

  it('digitar espera a pessoa parar e filtra os amigos', () => {
    vi.useFakeTimers();
    friendService['getFriends'].mockClear();
    component.onQueryChange('go');
    component.onQueryChange('gor');
    expect(friendService['getFriends']).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(friendService['getFriends']).toHaveBeenCalledTimes(1);
    expect(friendService['getFriends']).toHaveBeenCalledWith(1, 12, 'gor');
    expect(friendService['searchPlayers']).toHaveBeenCalledWith('gor', 1, 12);
    vi.useRealTimers();
  });

  it('apagar a busca esconde os outros jogadores e mostra todos os amigos', () => {
    component.query.set('thor');
    component.search();
    expect(component.searched()).toBe('thor');
    friendService['getFriends'].mockClear();
    component.query.set('');
    component.search();
    expect(component.searched()).toBe('');
    expect(friendService['getFriends']).toHaveBeenCalledWith(1, 12, '');
  });

  it('quem já é amigo não aparece em outros jogadores', () => {
    friendService['searchPlayers'].mockReturnValue(
      of(paged([player(), player({ id: 'p2', relationship: 'friend' })])),
    );
    component.query.set('thor');
    component.search();
    expect(component.otherPlayers().map((p) => p.id)).toEqual(['p1']);
  });

  it('janela de bloqueados abre e fecha com Esc', () => {
    component.blockedOpen.set(true);
    component.onEscape();
    expect(component.blockedOpen()).toBe(false);
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

  describe('botão de adicionar muda no clique', () => {
    let response: Subject<{ status: string; request: { id_friend_request?: string } }>;
    const found = () => component.results.items()[0];

    beforeEach(() => {
      component.query.set('thor');
      component.search();
      response = new Subject();
      friendService['sendRequest'].mockReturnValue(response);
      // O recarregamento depois da resposta não interfere no que se está conferindo.
      friendService['searchPlayers'].mockReturnValue(new Subject());
      component.discoverPrimary(found());
    });

    it('antes da resposta já mostra o pedido enviado, com o botão travado', () => {
      expect(found().relationship).toBe('request_sent');
      expect(found().id_friend_request).toBeNull();
      expect(component.isBusy('p1')).toBe(true);
    });

    it('clicar de novo enquanto envia não faz nada', () => {
      component.discoverPrimary(found());
      expect(friendService['sendRequest']).toHaveBeenCalledTimes(1);
      expect(friendService['cancelRequest']).not.toHaveBeenCalled();
      expect(found().relationship).toBe('request_sent');
    });

    it('com a resposta, guarda o id do pedido e libera o cancelar', () => {
      response.next({ status: 'pending', request: { id_friend_request: 'r7' } });
      expect(found().id_friend_request).toBe('r7');
      expect(component.isBusy('p1')).toBe(false);
      component.discoverPrimary(found());
      expect(friendService['cancelRequest']).toHaveBeenCalledWith('r7');
    });

    it('pedido inverso: a resposta transforma em amizade', () => {
      response.next({ status: 'accepted', request: { id_friend_request: 'r7' } });
      expect(found().relationship).toBe('friend');
      expect(found().id_friend_request).toBeNull();
    });

    it('erro volta o botão para adicionar e mostra a mensagem', () => {
      response.error({ status: 500 });
      expect(found().relationship).toBe('none');
      expect(component.isBusy('p1')).toBe(false);
      expect(component.messageIsError()).toBe(true);
    });
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

  it('bloquear pede confirmação e atualiza as listas', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    friendService['getBlocked'].mockClear();
    component.blockUser(FRIEND);
    expect(friendService['block']).toHaveBeenCalledWith('f1');
    expect(friendService['getBlocked']).toHaveBeenCalled();
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
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    friendService['getFriends'].mockReturnValue(of({ ...paged([FRIEND], 13), page: 2 }));
    component.friends.load(2);
    friendService['getFriends'].mockClear();
    friendService['getFriends'].mockImplementation((page: number) =>
      of(page === 2 ? paged([], 0) : paged([{ ...FRIEND, id: 'f2' }], 12)),
    );
    component.removeFriend(FRIEND);
    expect(friendService['getFriends']).toHaveBeenCalledWith(1, 12, '');
    expect(component.friends.page()).toBe(1);
  });

  describe('o card some no clique e volta se a ação falhar', () => {
    let response: Subject<object>;

    beforeEach(() => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      response = new Subject();
      // O recarregamento depois da resposta não interfere no que se está conferindo.
      friendService['getFriends'].mockReturnValue(new Subject());
    });

    it('remover amigo', () => {
      friendService['removeFriend'].mockReturnValue(response);
      component.removeFriend(FRIEND);
      expect(component.friends.items()).toEqual([]);
      expect(component.friends.total()).toBe(0);
      expect(component.isBusy('f1')).toBe(true);
      response.error({ status: 500 });
      expect(component.friends.items()).toEqual([FRIEND]);
      expect(component.friends.total()).toBe(1);
      expect(component.messageIsError()).toBe(true);
    });

    it('volta no mesmo lugar da lista, sem desfazer a remoção de outro card', () => {
      const other = { ...FRIEND, id: 'f2' };
      const third = { ...FRIEND, id: 'f3' };
      const state = component.friends;
      state.items.set([FRIEND, other, third]);
      state.total.set(3);
      const undo = state.removeNow((f) => f.id === 'f2');
      state.removeNow((f) => f.id === 'f3');
      undo();
      expect(state.items().map((f) => f.id)).toEqual(['f1', 'f2']);
      expect(state.total()).toBe(2);
    });

    it('bloquear na lista de amigos', () => {
      friendService['block'].mockReturnValue(response);
      component.blockUser(FRIEND);
      expect(component.friends.items()).toEqual([]);
      response.error({ status: 500 });
      expect(component.friends.items()).toEqual([FRIEND]);
    });

    it('bloquear na busca muda o botão e desfaz no erro', () => {
      friendService['searchPlayers'].mockReturnValue(of(paged([player()])));
      component.query.set('thor');
      component.search();
      friendService['block'].mockReturnValue(response);
      component.blockUser(player());
      expect(component.results.items()[0].relationship).toBe('blocked');
      response.error({ status: 500 });
      expect(component.results.items()[0].relationship).toBe('none');
    });

    it('aceitar solicitação recebida', () => {
      friendService['acceptRequest'].mockReturnValue(response);
      component.accept(REQUEST);
      expect(component.received.items()).toEqual([]);
      response.error({ status: 500 });
      expect(component.received.items()).toEqual([REQUEST]);
    });

    it('recusar convite para mesa baixa o contador na hora', () => {
      const before = component.receivedInvites.total();
      invites['reject'].mockReturnValue(response);
      component.rejectInvite(INVITE);
      expect(component.receivedInvites.items()).toEqual([]);
      expect(component.receivedInvites.total()).toBe(before - 1);
    });

    it('bloquear tira também o pedido dessa pessoa e desfaz no erro', () => {
      friendService['block'].mockReturnValue(response);
      component.blockUser(REQUEST.user);
      expect(component.received.items()).toEqual([]);
      response.error({ status: 500 });
      expect(component.received.items()).toEqual([REQUEST]);
    });

    it('cancelar pedido na busca volta para adicionar na hora e desfaz no erro', () => {
      const sent = player({ relationship: 'request_sent', id_friend_request: 'r8' });
      friendService['searchPlayers'].mockReturnValue(of(paged([sent])));
      component.query.set('thor');
      component.search();
      friendService['cancelRequest'].mockReturnValue(response);
      component.discoverPrimary(sent);
      expect(component.results.items()[0].relationship).toBe('none');
      response.error({ status: 500 });
      expect(component.results.items()[0]).toEqual(sent);
    });
  });
});
