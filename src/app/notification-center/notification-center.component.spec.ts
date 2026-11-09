import { ElementRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { NotificationCenterComponent } from './notification-center.component';
import {
  notificationIcon,
  notificationLink,
  notificationParts,
  notificationText,
  notificationTitle,
  timeAgo,
} from './notification-text';
import { FriendService } from '../services/friend.service';
import { NotificationsService } from '../services/notifications.service';
import { SocialSocketService } from '../services/social-socket.service';
import { AppNotification, SocialEvent } from '../models/friend.interface';

function note(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id_notification: 'n1',
    type: 'friend_request_received',
    payload: { id_friend_request: 'r1' },
    actor: { id: 'u2', username: 'gorak' },
    pending_friend_request_id: null,
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

  it('separa o nome do resto da frase, pra mostrar em outra cor', () => {
    expect(notificationParts(note())).toEqual({ who: 'gorak', rest: 'quer ser seu amigo.' });
    expect(notificationParts(note({ type: 'novo_tipo' as never })).who).toBe('');
  });

  it('só a solicitação de amizade tem título', () => {
    expect(notificationTitle(note())).toBe('Solicitação de amizade');
    expect(notificationTitle(note({ type: 'friend_request_accepted' }))).toBeNull();
  });

  it('cada tipo tem um ícone, e tipo desconhecido cai num genérico', () => {
    expect(notificationIcon(note())).toBe('campfire');
    expect(notificationIcon(note({ type: 'session_invite_received' }))).toBe('compass');
    expect(notificationIcon(note({ type: 'novo_tipo' as never }))).toBe('scroll');
  });

  it('link: tudo de amigos abre a tela de Amigos', () => {
    const friends = { commands: ['/amigos'] };
    expect(notificationLink(note())).toEqual(friends);
    expect(notificationLink(note({ type: 'session_invite_received' }))).toEqual(friends);
    expect(notificationLink(note({ type: 'session_invite_rejected' }))).toEqual(friends);
    expect(notificationLink(note({ type: 'friend_request_accepted' }))).toEqual(friends);
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
  let friends: {
    acceptRequest: ReturnType<typeof vi.fn>;
    rejectRequest: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    friends = {
      acceptRequest: vi.fn().mockReturnValue(of({})),
      rejectRequest: vi.fn().mockReturnValue(of({})),
    };
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
        { provide: FriendService, useValue: friends },
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

  it('clicar marca como lida e leva pra tela de Amigos', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.toggle();
    component.select(component.items()[0]);
    expect(service.markRead).toHaveBeenCalledWith('n1');
    expect(navigate).toHaveBeenCalledWith(['/amigos']);
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

  describe('responder a solicitação pelo painel', () => {
    const pending = (overrides: Partial<AppNotification> = {}) =>
      note({ pending_friend_request_id: 'r9', ...overrides });

    function openWith(...items: AppNotification[]) {
      service.list.mockReturnValue(of({ items, page: 1, pageSize: 10, total_count: items.length }));
      component.toggle();
    }

    it('aceitar usa a solicitação pendente de agora e marca como lida', () => {
      openWith(pending());
      component.respond(component.items()[0], 'accepted');
      expect(friends.acceptRequest).toHaveBeenCalledWith('r9');
      expect(component.responded()['n1']).toBe('accepted');
      expect(service.markRead).toHaveBeenCalledWith('n1');
    });

    it('recusar', () => {
      openWith(pending());
      component.respond(component.items()[0], 'rejected');
      expect(friends.rejectRequest).toHaveBeenCalledWith('r9');
      expect(component.responded()['n1']).toBe('rejected');
    });

    it('sem solicitação pendente, não faz nada', () => {
      openWith(note());
      component.respond(component.items()[0], 'accepted');
      expect(friends.acceptRequest).not.toHaveBeenCalled();
      expect(component.responded()).toEqual({});
    });

    it('a resposta aparece já no clique e o segundo clique não envia de novo', () => {
      friends.acceptRequest.mockReturnValue(new Subject());
      openWith(pending());
      component.respond(component.items()[0], 'accepted');
      expect(component.responded()['n1']).toBe('accepted');
      component.respond(component.items()[0], 'accepted');
      component.respond(component.items()[0], 'rejected');
      expect(friends.acceptRequest).toHaveBeenCalledTimes(1);
      expect(friends.rejectRequest).not.toHaveBeenCalled();
    });

    it('erro devolve os botões, mostra o motivo e não marca como lida', () => {
      friends.acceptRequest.mockReturnValue(
        throwError(() => ({ error: { error: { message: 'Essa solicitação já foi respondida' } } })),
      );
      openWith(pending());
      component.respond(component.items()[0], 'accepted');
      expect(component.responded()).toEqual({});
      expect(component.actionError()).toBe('Essa solicitação já foi respondida');
      expect(service.markRead).not.toHaveBeenCalled();
    });

    it('notificações da mesma solicitação respondem juntas', () => {
      openWith(pending(), pending({ id_notification: 'n2' }));
      component.respond(component.items()[0], 'accepted');
      expect(friends.acceptRequest).toHaveBeenCalledTimes(1);
      expect(component.responded()).toEqual({ n1: 'accepted', n2: 'accepted' });
      expect(service.markRead).toHaveBeenCalledWith('n2');
    });

    it('a resposta continua visível depois de recarregar a lista', () => {
      openWith(pending());
      component.respond(component.items()[0], 'accepted');
      service.list.mockReturnValue(of({ items: [note()], page: 1, pageSize: 10, total_count: 1 }));
      component.load();
      expect(component.responded()['n1']).toBe('accepted');
    });

    it('mudança nas solicitações recarrega o painel aberto; fechado, não', () => {
      service.list.mockClear();
      const changed: SocialEvent = { type: 'social_changed', user_id: 'me', scope: 'requests' };
      socket.events.next(changed);
      expect(service.list).not.toHaveBeenCalled();
      component.toggle();
      service.list.mockClear();
      socket.events.next(changed);
      expect(service.list).toHaveBeenCalledTimes(1);
    });

    it('o painel não fecha quando o botão clicado some da tela', () => {
      const host = TestBed.inject(ElementRef).nativeElement as HTMLElement;
      const button = host.appendChild(document.createElement('button'));
      component.toggle();
      host.addEventListener('click', (event) => {
        button.remove();
        component.onDocumentClick(event as MouseEvent);
      });
      button.click();
      expect(component.open()).toBe(true);
    });
  });

  it('Esc fecha o painel', () => {
    component.toggle();
    component.onEscape();
    expect(component.open()).toBe(false);
  });
});
