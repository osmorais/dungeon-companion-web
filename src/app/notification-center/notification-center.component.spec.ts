import { ElementRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { NotificationCenterComponent } from './notification-center.component';
import { notificationLink, notificationText, timeAgo } from './notification-text';
import { NotificationsService } from '../services/notifications.service';
import { SocialSocketService } from '../services/social-socket.service';
import { AppNotification, SocialEvent } from '../models/friend.interface';

function note(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id_notification: 'n1',
    type: 'friend_request_received',
    payload: { id_friend_request: 'r1' },
    actor: { id: 'u2', username: 'gorak' },
    read_at: null,
    created_at: '2026-11-03T12:00:00Z',
    ...overrides,
  };
}

describe('notification-text', () => {
  it('texto por tipo, com o nome de quem causou', () => {
    expect(notificationText(note())).toBe('gorak quer ser seu amigo.');
    expect(notificationText(note({ type: 'friend_request_accepted' }))).toBe(
      'gorak aceitou sua solicitação de amizade.',
    );
    expect(notificationText(note({ actor: null }))).toBe('Um jogador quer ser seu amigo.');
    expect(notificationText(note({ type: 'novo_tipo' as never }))).toContain('novidade');
  });

  it('texto dos convites para mesa', () => {
    expect(notificationText(note({ type: 'session_invite_received' }))).toBe(
      'gorak convidou você para uma mesa.',
    );
    expect(notificationText(note({ type: 'session_invite_accepted' }))).toContain('entrou');
    expect(notificationText(note({ type: 'session_invite_rejected' }))).toContain('recusou');
  });

  it('link: solicitação ou convite recebido abre a aba de solicitações', () => {
    const requests = { commands: ['/amigos'], queryParams: { aba: 'requests' } };
    expect(notificationLink(note())).toEqual(requests);
    expect(notificationLink(note({ type: 'session_invite_received' }))).toEqual(requests);
    expect(notificationLink(note({ type: 'session_invite_rejected' }))).toEqual(requests);
    expect(notificationLink(note({ type: 'friend_request_accepted' }))).toEqual({
      commands: ['/amigos'],
      queryParams: { aba: 'all' },
    });
  });

  it('link: convite aceito leva o mestre pra mesa', () => {
    expect(
      notificationLink(
        note({ type: 'session_invite_accepted', payload: { id_game_session: 's1' } }),
      ),
    ).toEqual({ commands: ['/session', 's1'] });
    expect(notificationLink(note({ type: 'session_invite_accepted', payload: {} }))).toEqual({
      commands: ['/amigos'],
    });
  });

  it('tempo relativo', () => {
    const now = new Date('2026-11-03T12:00:00Z').getTime();
    expect(timeAgo('2026-11-03T11:59:40Z', now)).toBe('agora');
    expect(timeAgo('2026-11-03T11:55:00Z', now)).toBe('há 5 min');
    expect(timeAgo('2026-11-03T09:00:00Z', now)).toBe('há 3 h');
    expect(timeAgo('2026-11-01T12:00:00Z', now)).toBe('há 2 dias');
    expect(timeAgo('2026-11-02T12:00:00Z', now)).toBe('há 1 dia');
  });
});

describe('NotificationCenterComponent', () => {
  let component: NotificationCenterComponent;
  let service: {
    unread: ReturnType<typeof signal<number>>;
    refreshUnread: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
    markRead: ReturnType<typeof vi.fn>;
    markAllRead: ReturnType<typeof vi.fn>;
  };
  let socket: {
    acquire: ReturnType<typeof vi.fn>;
    release: ReturnType<typeof vi.fn>;
    events: Subject<SocialEvent>;
    reconnected: Subject<void>;
  };

  beforeEach(() => {
    service = {
      unread: signal(2),
      refreshUnread: vi.fn(),
      list: vi.fn().mockReturnValue(of({ items: [note()], page: 1, pageSize: 10, total_count: 1 })),
      markRead: vi.fn().mockReturnValue(of(undefined)),
      markAllRead: vi.fn().mockReturnValue(of({ updated: 2 })),
    };
    socket = {
      acquire: vi.fn(),
      release: vi.fn(),
      events: new Subject<SocialEvent>(),
      reconnected: new Subject<void>(),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: NotificationsService, useValue: service },
        { provide: SocialSocketService, useValue: socket },
        { provide: ElementRef, useValue: new ElementRef(document.createElement('div')) },
      ],
    });
    component = TestBed.runInInjectionContext(() => new NotificationCenterComponent());
    component.ngOnInit();
  });

  it('abre a conexão social e busca o contador', () => {
    expect(socket.acquire).toHaveBeenCalled();
    expect(service.refreshUnread).toHaveBeenCalled();
    component.ngOnDestroy();
    expect(socket.release).toHaveBeenCalled();
  });

  it('notificação em tempo real soma no contador e entra na lista aberta', () => {
    component.toggle();
    socket.events.next({
      type: 'notification_created',
      user_id: 'me',
      notification: note({ id_notification: 'n2' }),
    });
    expect(service.unread()).toBe(3);
    expect(component.items()[0].id_notification).toBe('n2');
  });

  it('outros eventos não mexem no contador', () => {
    socket.events.next({ type: 'social_changed', user_id: 'me', scope: 'friends' });
    expect(service.unread()).toBe(2);
  });

  it('reconectar busca o contador de novo', () => {
    service.refreshUnread.mockClear();
    socket.reconnected.next();
    expect(service.refreshUnread).toHaveBeenCalled();
  });

  it('abrir carrega as últimas; fechar não carrega', () => {
    component.toggle();
    expect(component.open()).toBe(true);
    expect(service.list).toHaveBeenCalledWith(1, 10);
    component.toggle();
    expect(component.open()).toBe(false);
    expect(service.list).toHaveBeenCalledTimes(1);
  });

  it('erro ao carregar mostra o estado de erro', () => {
    service.list.mockReturnValue(throwError(() => new Error('x')));
    component.toggle();
    expect(component.error()).toBe(true);
  });

  it('clicar marca como lida e leva pra aba certa', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.toggle();
    component.select(component.items()[0]);
    expect(service.markRead).toHaveBeenCalledWith('n1');
    expect(navigate).toHaveBeenCalledWith(['/amigos'], { queryParams: { aba: 'requests' } });
    expect(component.open()).toBe(false);
  });

  it('notificação já lida não marca de novo', () => {
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.select(note({ read_at: '2026-11-03T12:00:00Z' }));
    expect(service.markRead).not.toHaveBeenCalled();
  });

  it('marcar todas como lidas', () => {
    component.toggle();
    component.markAll();
    expect(service.markAllRead).toHaveBeenCalled();
    expect(component.items().every((i) => i.read_at)).toBe(true);
  });

  it('Esc fecha o painel', () => {
    component.toggle();
    component.onEscape();
    expect(component.open()).toBe(false);
  });
});
