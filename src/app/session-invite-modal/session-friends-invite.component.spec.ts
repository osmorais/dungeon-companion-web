import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { SessionFriendsInviteComponent } from './session-friends-invite.component';
import { FriendService } from '../services/friend.service';
import { SessionInviteService } from '../services/session-invite.service';
import { Friend, PagedList, SessionInviteView } from '../models/friend.interface';

const FRIEND: Friend = {
  id: 'f1',
  username: 'gorak',
  friends_since: '2026-11-01T00:00:00Z',
  presence: 'online',
  availability: null,
  last_seen_at: null,
};

function paged<T>(items: T[]): PagedList<T> {
  return { items, page: 1, pageSize: 12, total_count: items.length };
}

function pendingInvite(sessionId: string, friendId: string): SessionInviteView {
  return {
    id_session_invite: 'i1',
    id_game_session: sessionId,
    session_name: 'A Mina',
    message: null,
    created_at: '2026-11-03T00:00:00Z',
    expires_at: '2026-11-10T00:00:00Z',
    user: { id: friendId, username: 'x' },
  };
}

describe('SessionFriendsInviteComponent', () => {
  let friends: { getFriends: ReturnType<typeof vi.fn> };
  let invites: { list: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn> };
  let modal: SessionFriendsInviteComponent;

  function create(memberIds: string[] = []) {
    TestBed.configureTestingModule({
      providers: [
        { provide: FriendService, useValue: friends },
        { provide: SessionInviteService, useValue: invites },
      ],
    });
    const fixture = TestBed.createComponent(SessionFriendsInviteComponent);
    fixture.componentRef.setInput('sessionId', 's1');
    fixture.componentRef.setInput('memberIds', memberIds);
    modal = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    friends = { getFriends: vi.fn().mockReturnValue(of(paged([FRIEND]))) };
    invites = {
      list: vi.fn().mockReturnValue(of(paged([]))),
      send: vi.fn().mockReturnValue(of({})),
    };
  });

  afterEach(() => vi.useRealTimers());

  it('carrega os amigos ao abrir', () => {
    create();
    expect(friends.getFriends).toHaveBeenCalledWith(1, 12, '');
    expect(modal.friends.items()).toEqual([FRIEND]);
  });

  it('quem já tem convite pendente nesta mesa aparece marcado; de outra mesa, não', () => {
    invites.list.mockReturnValue(of(paged([pendingInvite('s1', 'f1'), pendingInvite('s2', 'f2')])));
    create();
    expect(modal.isInvited(FRIEND)).toBe(true);
    expect(modal.isInvited({ ...FRIEND, id: 'f2' })).toBe(false);
  });

  it('convidar envia com o recado e marca já no clique', () => {
    const response = new Subject<object>();
    invites.send.mockReturnValue(response);
    create();
    modal.message.set('Bora?');
    modal.invite(FRIEND);
    expect(invites.send).toHaveBeenCalledWith('s1', 'f1', 'Bora?');
    expect(modal.isInvited(FRIEND)).toBe(true);
    expect(modal.sending().has('f1')).toBe(true);
    response.next({});
    expect(modal.sending().has('f1')).toBe(false);
    expect(modal.isInvited(FRIEND)).toBe(true);
  });

  it('clicar de novo não convida duas vezes', () => {
    create();
    modal.invite(FRIEND);
    modal.invite(FRIEND);
    expect(invites.send).toHaveBeenCalledTimes(1);
  });

  it('quem já está na mesa não é convidado', () => {
    create(['f1']);
    expect(modal.isMember(FRIEND)).toBe(true);
    modal.invite(FRIEND);
    expect(invites.send).not.toHaveBeenCalled();
  });

  it('API recusa: desmarca e mostra o motivo', () => {
    invites.send.mockReturnValue(
      throwError(() => ({ error: { error: { message: 'A mesa já está cheia' } } })),
    );
    create();
    modal.invite(FRIEND);
    expect(modal.isInvited(FRIEND)).toBe(false);
    expect(modal.sending().has('f1')).toBe(false);
    expect(modal.error()).toBe('A mesa já está cheia');
  });

  it('busca espera a pessoa parar de digitar', () => {
    vi.useFakeTimers();
    create();
    friends.getFriends.mockClear();
    modal.onQueryChange('go');
    modal.onQueryChange('gor');
    expect(friends.getFriends).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(friends.getFriends).toHaveBeenCalledTimes(1);
    expect(friends.getFriends).toHaveBeenCalledWith(1, 12, 'gor');
  });

  it('fechar avisa a tela', () => {
    create();
    const closed = vi.fn();
    modal.closed.subscribe(closed);
    modal.close();
    expect(closed).toHaveBeenCalled();
  });
});
